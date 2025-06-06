"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, AlertTriangle, RefreshCw, UserIcon, ServerCrash } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { debounce } from "lodash"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ChipManagementModal } from "./chip-management-modal"
import { useAllUsers } from "@/hooks/use-all-users"
import type { User } from "@/types"

export function EnhancedUserSearch() {
  const { user: staffUser } = useAuth()
  // SWRフックを使用してユーザーデータを取得
  const { data: allUsers, error: swrError, mutate, isValidating } = useAllUsers()
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 全ユーザーを読み込む関数を更新
  const loadUsers = async () => {
    if (!staffUser) {
      setError("認証されていません。再度ログインしてください。")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // SWRのmutateを呼び出してデータを再検証
      await mutate()
    } catch (err: any) {
      console.error("ユーザー一覧の取得に失敗しました:", err)
      setError(err.message || "ユーザー一覧の取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  // SWRのエラーを処理
  useEffect(() => {
    if (swrError) {
      console.error("SWR Error:", swrError)
      setError(`ユーザー一覧の取得に失敗しました: ${swrError.message}`)
    }
  }, [swrError])

  // 部分一致フィルタ（ユーザー名と表示名の両方でマッチング）
  const filterUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !allUsers) return [] // クエリが空の場合は空の配列を返す
    return allUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(q) || (user.displayName && user.displayName.toLowerCase().includes(q)),
    )
  }, [query, allUsers])

  // デバウンスしてフィルタリングを適用
  const debouncedFilter = useMemo(() => debounce(() => setFilteredUsers(filterUsers), 300), [filterUsers])

  useEffect(() => {
    debouncedFilter()
    return () => debouncedFilter.cancel()
  }, [query, debouncedFilter])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  // EnhancedUserSearchコンポーネント内のhandleUserUpdate関数を修正
  const handleUserUpdate = async () => {
    if (selectedUser) {
      try {
        // 特定のユーザーのみを更新
        // await updateUser(selectedUser.id)
        mutate()
      } catch (error: any) {
        console.error("Failed to update user:", error)
        setError(error.message || "ユーザーの更新に失敗しました")
      }
    }
  }

  // ローディング状態の判定を更新
  const isLoading = loading || isValidating

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>ユーザー検索</CardTitle>
        <Button onClick={loadUsers} disabled={isLoading} variant="ghost" size="sm" className="h-8 w-8 p-0">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 検索ボックス */}
        <div className="relative w-full mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ユーザー名または表示名で検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-[#0f0f0f] border-[#333] pl-9"
          />
        </div>

        {/* ユーザー一覧 */}
        {isLoading ? (
          <div className="py-4 text-center text-text2">読み込み中...</div>
        ) : swrError ? (
          <div className="text-center py-8 text-red-400">
            <ServerCrash className="h-12 w-12 mx-auto mb-2 opacity-70" />
            <p>APIエラーが発生しました</p>
            <Button
              onClick={loadUsers}
              variant="outline"
              size="sm"
              className="mt-4 bg-red-900/20 border-red-900 text-red-300 hover:bg-red-900/30"
            >
              再試行
            </Button>
          </div>
        ) : query.trim() !== "" && filteredUsers.length > 0 ? (
          <ul className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
            {filteredUsers.map((user, index) => (
              <motion.li
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-md hover:bg-surface2 cursor-pointer"
                onClick={() => handleUserSelect(user)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-surface1 flex items-center justify-center mr-3">
                    <UserIcon className="h-4 w-4 text-text2" />
                  </div>
                  <div>
                    <span className="font-medium">{user.displayName || user.username}</span>
                    {user.displayName && user.displayName !== user.username && (
                      <p className="text-xs text-text2">@{user.username}</p>
                    )}
                  </div>
                </div>
                <span className="font-mono text-accent font-bold">{user.chips.toLocaleString()}</span>
              </motion.li>
            ))}
          </ul>
        ) : query.trim() !== "" ? (
          <div className="text-center py-8 text-text2">
            <UserIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>ユーザーが見つかりません</p>
          </div>
        ) : (
          <div className="text-center py-8 text-text2">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>検索するには文字を入力してください</p>
          </div>
        )}
      </CardContent>

      {/* チップ管理モーダル */}
      <ChipManagementModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUserUpdate}
      />
    </Card>
  )
}
