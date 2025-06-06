"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { SectionCard } from "@/components/section-card"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { User } from "@/types"
import {
  Search,
  UserIcon,
  AlertTriangle,
  ServerCrash,
  Users,
  Download,
  FileJson,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  ChevronDown,
  Database,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from "lucide-react"
import { ChipManagementModal } from "./chip-management-modal"
import { convertToCSV, formatJSON, downloadFile, generateFileName, downloadFileAlternative } from "@/lib/export-utils"
import { toast } from "react-hot-toast"
// import { getAllUsers } from "@/lib/firestore" // getAllUsers のインポートを削除
import { clearCache } from "@/lib/cache-utils"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import AddUserDialog from "@/components/add-user-dialog"

interface UserListMiniProps {
  users: User[] // 親から渡されるユーザーデータ
  loading: boolean // 親から渡されるローディング状態
  error: string | null // 親から渡されるエラー状態
  lastUpdated: Date | null // 親から渡される最終更新日時
  onUserAdded?: () => void
}

export default function UserListMini({ users, loading, error, lastUpdated, onUserAdded }: UserListMiniProps) {
  // ユーザーデータ、ローディング、エラー、最終更新日時はプロップスから受け取るため、内部状態を削除
  // const [users, setUsers] = useState<User[]>([])
  // const [loading, setLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  // const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dataSource, setDataSource] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showFiltersMenu, setShowFiltersMenu] = useState(false)
  const [currentSortCriterion, setCurrentSortCriterion] = useState<
    "chips_desc" | "chips_asc" | "updated_at_desc" | "updated_at_asc"
  >("chips_desc") // デフォルトはチップ数が多い順

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isChipModalOpen, setIsChipModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)

  const goldButtonClass =
    "bg-[#fde047] text-black hover:bg-[#fcd34d] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fde047]/50 focus-visible:ring-offset-bg rounded-md px-3 py-1.5 h-9 flex items-center gap-2"

  useEffect(() => {
    // ユーザーデータのロードは親コンポーネントで行われるため、ここでの loadUsers 呼び出しを削除
    // loadUsers(false)

    setIsOnline(navigator.onLine)
    const handleOnline = () => {
      setIsOnline(true)
      toast.success("オンラインに復帰しました")
      // loadUsers(false) // 親からのデータ更新に任せる
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error("オフラインになりました。ローカルデータを使用します")
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // loadUsers 関数は不要になるため削除
  // const loadUsers = async (forceRefresh = false) => {
  //   setLoading(true)
  //   setError(null)
  //   try {
  //     const allUsers = await getAllUsers(forceRefresh)
  //     setUsers(allUsers)
  //     setLastUpdated(new Date())
  //     const cacheInfo = getCacheStatus().find((item) => item.key === "all_users")
  //     setDataSource(cacheInfo?.source || "unknown")
  //     if (forceRefresh) {
  //       toast.success("最新のユーザーデータを取得しました")
  //     }
  //   } catch (err: any) {
  //     console.error("ユーザーデータの取得に失敗しました:", err)
  //     setError(err.message || "ユーザーデータの取得に失敗しました")
  //     toast.error("ユーザーデータの取得に失敗しました")
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleUserAddedAndCloseModal = () => {
    // 新規ユーザー追加後、親コンポーネントに通知し、親がリアルタイムリスナーを通じてデータを更新する
    if (onUserAdded) {
      onUserAdded()
    }
    setIsAddUserModalOpen(false)
  }

  const handleClearCacheAndRefresh = () => {
    clearCache("all_users")
    toast.success("ユーザーデータのキャッシュをクリアしました")
    // キャッシュクリア後、リアルタイムリスナーが自動的に最新データをフェッチする
    // ここで明示的に loadUsers を呼び出す必要はない
    setShowFiltersMenu(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showExportMenu && !target.closest("[data-export-menu]")) {
        setShowExportMenu(false)
      }
      if (showFiltersMenu && !target.closest("[data-filters-menu]")) {
        setShowFiltersMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showExportMenu, showFiltersMenu])

  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return []
    let result = [...users]
    if (searchTerm.trim() !== "") {
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    result.sort((a, b) => {
      if (currentSortCriterion === "chips_desc") {
        return b.chips - a.chips
      } else if (currentSortCriterion === "chips_asc") {
        return a.chips - b.chips
      } else if (currentSortCriterion === "updated_at_desc") {
        // updatedAtが未定義の場合は0として扱い、新しい順（降順）に並べる
        return (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0) // DateオブジェクトのgetTime()を使用
      } else if (currentSortCriterion === "updated_at_asc") {
        // updatedAtが未定義の場合は0として扱い、古い順（昇順）に並べる
        return (a.lastUpdated?.getTime() || 0) - (b.lastUpdated?.getTime() || 0) // DateオブジェクトのgetTime()を使用
      }
      return 0 // 発生しないはず
    })
    return result
  }, [searchTerm, users, currentSortCriterion])

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
    setIsChipModalOpen(true)
    toast.success(`${user.displayName || user.username}さんを選択しました`)
  }

  const handleCloseChipModal = () => {
    setIsChipModalOpen(false)
    setSelectedUser(null)
    // チップ更新後、親コンポーネントのリアルタイムリスナーが自動的にデータを更新するため、
    // ここで明示的に loadUsers を呼び出す必要はない
  }

  const exportAsCSV = () => {
    try {
      const loadingToast = toast.loading("CSVファイルを作成中...")
      const sourceUsers = users || []
      if (!sourceUsers || sourceUsers.length === 0) {
        toast.dismiss(loadingToast)
        toast.error("エクスポートするデータがありません")
        return
      }
      const csv = convertToCSV(sourceUsers)
      const fileName = generateFileName("poker_chip_users", "csv")
      let success = downloadFile(csv, fileName, "text/csv;charset=utf-8")
      if (!success) success = downloadFileAlternative(csv, fileName, "text/csv;charset=utf-8")
      toast.dismiss(loadingToast)
      if (success) toast.success(`${sourceUsers.length}人のユーザーデータをCSVとしてエクスポートしました`)
      else toast.error("ダウンロードに失敗しました。ブラウザの設定を確認してください。")
      setShowExportMenu(false)
    } catch (error) {
      console.error("CSVエクスポートエラー:", error)
      toast.error(`エクスポートエラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const exportAsJSON = () => {
    try {
      const loadingToast = toast.loading("JSONファイルを作成中...")
      const sourceUsers = users || []
      if (!sourceUsers || sourceUsers.length === 0) {
        toast.dismiss(loadingToast)
        toast.error("エクスポートするデータがありません")
        return
      }
      const json = formatJSON(sourceUsers)
      const fileName = generateFileName("poker_chip_users", "json")
      let success = downloadFile(json, fileName, "application/json")
      if (!success) success = downloadFileAlternative(json, fileName, "application/json")
      toast.dismiss(loadingToast)
      if (success) toast.success(`${sourceUsers.length}人のユーザーデータをJSONとしてエクスポートしました`)
      else toast.error("ダウンロードに失敗しました。ブラウザの設定を確認してください。")
      setShowExportMenu(false)
    } catch (error) {
      console.error("JSONエクスポートエラー:", error)
      toast.error(`エクスポートエラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleSortChange = (criterion: typeof currentSortCriterion) => {
    setCurrentSortCriterion(criterion)
    toast.success(
      `ユーザーを${
        criterion === "chips_desc"
          ? "チップ数が多い順"
          : criterion === "chips_asc"
            ? "チップ数が少ない順"
            : criterion === "updated_at_desc"
              ? "更新時間が新しい順"
              : "更新時間が古い順"
      }に並べ替えました`,
    )
    setShowFiltersMenu(false)
  }

  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "なし"

  const getSourceInfo = () => {
    // dataSource は UserListMini 内部で設定されないため、ここでは常に "不明" となるか、
    // 親から渡す必要がある。今回は一旦そのままにしておく。
    switch (dataSource) {
      case "memory":
        return { icon: <Database className="h-3 w-3 mr-1" />, label: "メモリ", color: "text-purple-400" }
      case "cache":
        return { icon: <Database className="h-3 w-3 mr-1" />, label: "キャッシュ", color: "text-green-400" }
      case "server":
        return { icon: <Database className="h-3 w-3 mr-1" />, label: "サーバー", color: "text-blue-400" }
      default:
        return { icon: <Database className="h-3 w-3 mr-1" />, label: "不明", color: "text-gray-400" }
    }
  }
  const sourceInfo = getSourceInfo()

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  }

  return (
    <SectionCard
      title={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            <span>ユーザー検索</span>
            <span className="text-sm text-text2 flex items-center">
              <Users className="h-3.5 w-3.5 mr-1" />
              {users.length}人
            </span>
            {isOnline ? (
              <span className="text-xs text-green-400 flex items-center">
                <Wifi className="h-3 w-3 mr-1" />
                オンライン
              </span>
            ) : (
              <span className="text-xs text-amber-400 flex items-center">
                <WifiOff className="h-3 w-3 mr-1" />
                オフライン
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 新規ユーザー追加ボタンをここに追加 */}
            <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
              <DialogTrigger asChild></DialogTrigger>
              <AddUserDialog onUserAdded={handleUserAddedAndCloseModal} />
            </Dialog>

            {/* dataSource は親から渡されるべきだが、ここでは一旦そのまま */}
            {dataSource && (
              <span className={`text-xs flex items-center ${sourceInfo.color}`}>
                {sourceInfo.icon}
                {sourceInfo.label}
              </span>
            )}
            <Button
              onClick={() => clearCache("all_users")} // キャッシュクリアのみ行う
              disabled={loading}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-surface2/50 transition-all"
              title="更新"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <div className="relative hidden sm:block" data-filters-menu>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 px-2 ${loading ? "opacity-60 cursor-wait" : ""}`}
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                disabled={loading}
                title="フィルター"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              {showFiltersMenu && (
                <div className="absolute mt-1 w-full max-w-xs rounded-md shadow-lg bg-popover border border-border z-50 left-1/2 -translate-x-1/2 sm:w-56 sm:left-auto sm:right-0">
                  <div className="py-1">
                    <button
                      onClick={() => handleSortChange("chips_desc")}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <span>チップ数: 多い順</span>
                      {currentSortCriterion === "chips_desc" && <Check className="ml-auto h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleSortChange("chips_asc")}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <span>チップ数: 少ない順</span>
                      {currentSortCriterion === "chips_asc" && <Check className="ml-auto h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleSortChange("updated_at_desc")}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <span>更新時間: 新しい順</span>
                      {currentSortCriterion === "updated_at_desc" && <Check className="ml-auto h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleSortChange("updated_at_asc")}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <span>更新時間: 古い順</span>
                      {currentSortCriterion === "updated_at_asc" && <Check className="ml-auto h-4 w-4" />}
                    </button>
                    <div className="my-1 h-px bg-border" /> {/* 区切り線 */}
                    <button
                      onClick={handleClearCacheAndRefresh}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      <span>キャッシュクリアして更新</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative hidden sm:block" data-export-menu>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 px-2 ${loading ? "opacity-60 cursor-wait" : ""}`}
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={loading}
                title="エクスポート"
              >
                <Download className="h-4 w-4" />
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              {showExportMenu && (
                <div className="absolute mt-1 w-full max-w-xs rounded-md shadow-lg bg-popover border border-border z-50 left-1/2 -translate-x-1/2 sm:w-56 sm:left-auto sm:right-0">
                  <div className="py-1">
                    <button
                      onClick={exportAsCSV}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      <span>CSVとしてエクスポート</span>
                    </button>
                    <button
                      onClick={exportAsJSON}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      <span>JSONとしてエクスポート</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      }
      hoverable
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text2" />
          <Input
            placeholder="ユーザー名または表示名を入力して検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-surface2 border-surface2 pl-9 h-10 focus:ring-2 focus:ring-accent/50"
          />
        </div>
        {lastUpdated && (
          <div className="text-xs text-text2 bg-surface2 px-3 py-2 rounded-md flex items-center">
            <span className="hidden md:inline mr-1">更新:</span> {formattedLastUpdated}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-pulse-custom">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-70 animate-spin" />
            <p className="text-sm text-text2">読み込み中...</p>
          </div>
        </div>
      ) : error && (!users || users.length === 0) ? (
        <div className="text-center py-8 text-red-400">
          <ServerCrash className="h-12 w-12 mx-auto mb-2 opacity-70" />
          <p className="text-sm">データ取得エラーが発生しました</p>
        </div>
      ) : filteredUsers.length > 0 ? (
        <motion.ul
          className="space-y-1 max-h-[400px] overflow-y-auto overflow-x-hidden rounded-md"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredUsers.map((user, index) => (
            <motion.li
              key={user.id || `user-${index}`}
              variants={item}
              className="flex items-center justify-between p-3 rounded-md hover:bg-surface2 cursor-pointer transition-all duration-200 overflow-hidden"
              onClick={() => handleUserClick(user)}
              whileHover={{ scale: 1.01, backgroundColor: "rgba(24, 24, 27, 0.9)" }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center min-w-0">
                <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center mr-3 shadow-sm flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-text2" />
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-sm sm:text-base block truncate">
                    {user.displayName || user.username}
                  </span>
                  <p className="text-xs text-text2 block truncate">
                    {user.username.startsWith("@") ? user.username : `@${user.username}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <span className="font-mono text-accent font-bold text-base sm:text-lg">
                  {user.chips.toLocaleString()}
                </span>
                <span className="text-xs text-text2">チップ</span>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <EmptyState text={searchTerm ? "該当するユーザーが見つかりません" : "検索するには文字を入力してください"} />
      )}

      <ChipManagementModal
        user={selectedUser}
        isOpen={isChipModalOpen}
        onClose={handleCloseChipModal}
        onUpdate={() => {
          // 親コンポーネントのリアルタイムリスナーが更新を検知するため、
          // ここで明示的にデータを再フェッチする必要はない。
          // 必要であれば、親の onUserAdded を呼び出すことで、親の state を更新し、
          // それが UserListMini の再レンダリングをトリガーする。
          if (onUserAdded) {
            onUserAdded()
          }
        }}
      />
    </SectionCard>
  )
}
