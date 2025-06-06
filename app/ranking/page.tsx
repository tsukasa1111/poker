"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ServerCrash,
  Database,
  Clock,
  Save,
  AlertTriangle,
} from "lucide-react"
import AppShell from "@/components/app-shell"
import { PageTitle } from "@/components/page-title"
import { SectionCard } from "@/components/section-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMonthlyRanking, getYearlyRanking, type RankingEntry } from "@/lib/ranking"
import {
  getStoredRanking,
  recalculateAndStoreMonthlyRanking,
  recalculateAndStoreYearlyRanking,
  type StoredRanking, // 追加
} from "@/lib/ranking-store"
import { toast } from "react-hot-toast"
import { Alert, AlertDescription } from "@/components/ui/alert" // 追加

const AUTO_RECALC_THRESHOLD = 12 * 60 * 60 * 1000 // 12時間 (ミリ秒)

export default function RankingPage() {
  const { user, loading: authLoading } = useAuth() // loading を authLoading に変更
  const router = useRouter()
  const [monthlyRanking, setMonthlyRanking] = useState<RankingEntry[]>([])
  const [yearlyRanking, setYearlyRanking] = useState<RankingEntry[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("monthly")
  const [showNumbers, setShowNumbers] = useState(false)
  const [dataSource, setDataSource] = useState<"cache" | "server" | "stored" | "default" | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRecalculating, setIsRecalculating] = useState(false) // 手動・自動両方の再計算中フラグ
  const [autoRecalcMessage, setAutoRecalcMessage] = useState<string | null>(null)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  const MIN_YEAR = 2025
  const MIN_MONTH = 4

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadRankings() // 初回読み込み
    }
  }, [user, selectedYear, selectedMonth]) // selectedYear, selectedMonth の変更でも再読み込み

  const loadRankings = async (forceRefresh = false, isAutoRecalcTrigger = false) => {
    if (!user) {
      setError("認証されていません。再度ログインしてください。")
      return
    }

    // 自動再計算でない場合のみ、通常のローディング表示
    if (!isAutoRecalcTrigger) {
      setDataLoading(true)
    }
    setError(null)
    setShowNumbers(false)
    setAutoRecalcMessage(null) // メッセージをリセット

    let loadingToastId: string | undefined
    if (!isAutoRecalcTrigger) {
      // 自動再計算時は専用メッセージがあるので通常トーストは出さない
      loadingToastId = toast.loading("ランキングデータを読み込み中...")
    }

    try {
      // 1. 保存済み月間ランキングを取得
      const storedMonthly: StoredRanking | null = await getStoredRanking("monthly", selectedYear, selectedMonth)

      // 2. 自動再計算のチェック (forceRefresh でなく、手動再計算中でもなく、初回読み込みまたは日付変更時)
      if (
        storedMonthly &&
        storedMonthly.updatedAt &&
        !forceRefresh &&
        !isRecalculating && // isRecalculating は手動・自動両方で true になる
        Date.now() - storedMonthly.updatedAt.toDate().getTime() > AUTO_RECALC_THRESHOLD
      ) {
        setAutoRecalcMessage(
          `月間ランキングデータが古いため (${storedMonthly.updatedAt.toDate().toLocaleDateString("ja-JP")} 更新)、自動的に再計算して保存します...`,
        )
        toast.custom(
          (t) => (
            <Alert variant="default" className="bg-blue-600/20 border-blue-500/30 text-blue-300 shadow-lg">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
              <AlertDescription>ランキングデータを自動更新中です。少々お待ちください...</AlertDescription>
            </Alert>
          ),
          { id: "auto-recalc-toast", duration: Number.POSITIVE_INFINITY },
        )
        await recalculateAndStoreRanking(true) // 自動再計算を実行し、完了後に内部で loadRankings(true) が呼ばれる
        toast.dismiss("auto-recalc-toast") // 自動計算完了後トーストを消す
        return // recalculateAndStoreRanking が後続処理を行うのでここで終了
      }

      // 3. 通常のデータ取得処理
      if (storedMonthly && !forceRefresh) {
        setMonthlyRanking(storedMonthly.entries)
        setDataSource("stored")
        setLastUpdated(storedMonthly.updatedAt.toDate())
      } else {
        const monthlyData = await getMonthlyRanking(selectedYear, selectedMonth, 20, forceRefresh)
        setMonthlyRanking(monthlyData.ranking)
        setDataSource(monthlyData.source || null)
        setLastUpdated(monthlyData.updatedAt)
      }

      const storedYearly = await getStoredRanking("yearly", selectedYear)
      if (storedYearly && !forceRefresh) {
        setYearlyRanking(storedYearly.entries)
      } else {
        const yearlyData = await getYearlyRanking(selectedYear, 20, forceRefresh)
        setYearlyRanking(yearlyData.ranking)
      }

      if (loadingToastId) toast.dismiss(loadingToastId)
      if (!isAutoRecalcTrigger) {
        // 自動再計算時は専用の完了メッセージがある
        toast.success(
          forceRefresh
            ? "最新のランキングデータを取得しました"
            : `ランキングデータを更新 (${dataSource === "stored" ? "保存データ" : dataSource === "cache" ? "キャッシュ" : "サーバー"})`,
          { duration: 2000 },
        )
      }
      setTimeout(() => setShowNumbers(true), 300)
    } catch (err: any) {
      if (loadingToastId) toast.dismiss(loadingToastId)
      toast.dismiss("auto-recalc-toast") // エラー時も自動計算トーストを消す
      setError(err.message || "ランキングの取得に失敗しました。")
      toast.error("ランキングデータの取得に失敗しました")
    } finally {
      if (!isAutoRecalcTrigger) {
        setDataLoading(false)
      }
      // isRecalculating は recalculateAndStoreRanking 関数内で解除される
    }
  }

  const recalculateAndStoreRanking = async (isAuto = false) => {
    if (!user || !user.email) {
      setError("認証されていません。再度ログインしてください。")
      return
    }
    setIsRecalculating(true) // 手動・自動共通の再計算中フラグ
    setError(null)

    const loadingMessage = isAuto ? "ランキングを自動再計算・保存中..." : "ランキングを手動で再計算・保存中..."
    const toastId = toast.loading(loadingMessage)

    try {
      const results = await Promise.allSettled([
        recalculateAndStoreMonthlyRanking(selectedYear, selectedMonth, user.email),
        recalculateAndStoreYearlyRanking(selectedYear, user.email),
      ])
      toast.dismiss(toastId)
      const allSucceeded = results.every((r) => r.status === "fulfilled" && r.value === true)

      if (allSucceeded) {
        toast.success(isAuto ? "ランキングを自動更新しました" : "月間・年間ランキングを再計算し保存しました")
      } else {
        toast.error(isAuto ? "ランキングの自動更新に一部失敗" : "一部ランキングの再計算・保存に失敗しました")
      }
      await loadRankings(true, isAuto) // 強制リフレッシュで最新データをロード
    } catch (err: any) {
      toast.dismiss(toastId)
      setError(err.message || "ランキングの再計算と保存に失敗しました。")
      toast.error("ランキングの再計算と保存に失敗しました")
    } finally {
      setIsRecalculating(false)
      setAutoRecalcMessage(null) // メッセージをクリア
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }
  const goToPreviousMonth = () => {
    if (selectedYear === MIN_YEAR && selectedMonth <= MIN_MONTH) {
      toast.error("2025年4月より前のデータはありません")
      return
    }
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }
  const goToNextYear = () => setSelectedYear(selectedYear + 1)
  const goToPreviousYear = () => {
    if (selectedYear <= MIN_YEAR) {
      toast.error("2025年より前のデータはありません")
      return
    }
    setSelectedYear(selectedYear - 1)
  }

  const isPreviousMonthDisabled = selectedYear === MIN_YEAR && selectedMonth <= MIN_MONTH
  const isPreviousYearDisabled = selectedYear <= MIN_YEAR

  const formatUsername = (username: string, displayName?: string) => {
    if (displayName && displayName.trim() !== "") return displayName
    return username.startsWith("@") ? username.substring(1) : username
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-xl text-text2">読み込み中...</p>
        </div>
      </AppShell>
    )
  }
  if (!user) return null

  const renderRankingList = (rankingData: RankingEntry[], periodType: "月" | "年") => {
    if (dataLoading && !isRecalculating) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      )
    }
    if (error && !dataLoading) {
      return (
        <div className="text-center py-12 text-red-400">
          <ServerCrash className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">ランキングデータの取得に失敗</p>
          <Button
            onClick={() => loadRankings(true)}
            variant="outline"
            size="sm"
            className="mt-2 border-red-400/50 text-red-300 hover:bg-red-400/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再読み込み
          </Button>
        </div>
      )
    }
    if (rankingData.length === 0 && !dataLoading) {
      return (
        <div className="text-center py-12 text-text2">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>この{periodType}のランキングデータがありません</p>
        </div>
      )
    }
    return (
      <div className="space-y-1">
        <div className="text-xs text-text2 mb-3 px-1 opacity-80">
          <p>
            ※ ランキングチップは{selectedYear}年{activeTab === "monthly" ? monthNames[selectedMonth - 1] : ""}
            の獲得チップ数を表しています
          </p>
        </div>
        {rankingData.map((entry, index) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${
              index < 3 ? "bg-zinc-800/60 border border-zinc-700/50" : "hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-center">
              <div className="w-10 text-center">
                {index === 0 ? (
                  <Trophy className="h-6 w-6 text-gold mx-auto" />
                ) : index === 1 ? (
                  <Trophy className="h-6 w-6 text-gray-400 mx-auto" />
                ) : index === 2 ? (
                  <Trophy className="h-6 w-6 text-amber-600 mx-auto" />
                ) : (
                  <span className="text-text2 text-sm">{index + 1}</span>
                )}
              </div>
              <div className="ml-3">
                <span className="font-medium text-base text-text1">
                  {formatUsername(entry.username, entry.displayName)}
                </span>
                {entry.displayName && (
                  <p className="text-xs text-text2 opacity-80">
                    {entry.username.startsWith("@") ? entry.username : `@${entry.username}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <motion.span
                className={`font-mono text-lg font-bold ${index < 3 ? "text-gold" : "text-accent"}`}
                initial={{ opacity: 1, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, filter: showNumbers ? "blur(0px)" : "blur(4px)" }}
                transition={{ duration: 0.5 }}
              >
                {showNumbers ? entry.total.toLocaleString() : "••••"}
              </motion.span>
              <span className="text-xs text-text2 opacity-80">チップ</span>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  const buttonBaseClass =
    "h-9 p-0 w-9 sm:w-auto sm:px-3 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-150 flex items-center justify-center gap-1.5 text-sm rounded-md"
  const periodControlButtonClass = `${buttonBaseClass} bg-zinc-800/60 border border-zinc-700 text-text1 hover:bg-zinc-700/80 hover:border-zinc-600`
  const whiteButtonClass = `${buttonBaseClass} bg-white text-black hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300 focus-visible:ring-offset-bg`
  // ghostButtonClass の text-text1 を明示的にアイコンにも適用するように変更
  const ghostButtonClass = `${buttonBaseClass} text-text1 hover:bg-zinc-700/80`

  return (
    <AppShell>
      <PageTitle />

      {autoRecalcMessage &&
        !isRecalculating && ( // 自動再計算メッセージ表示 (再計算が完了したら消える)
          <Alert variant="default" className="mb-4 bg-blue-600/10 border-blue-500/30 text-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-300" />
            <AlertDescription>{autoRecalcMessage}</AlertDescription>
          </Alert>
        )}

      <SectionCard title="ランキング" className="mb-6">
        <div className="flex flex-col gap-6">
          {/* Tabs, 日付選択UI は変更なしのため省略 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-zinc-800/70 p-1 rounded-lg">
              <TabsTrigger
                value="monthly"
                className="flex-1 py-1.5 px-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-white data-[state=inactive]:text-text2 data-[state=inactive]:hover:bg-zinc-700/50 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-1.5 sm:mr-2" />
                月間
              </TabsTrigger>
              <TabsTrigger
                value="yearly"
                className="flex-1 py-1.5 px-3 text-sm rounded-md data-[state=active]:bg-accent data-[state=active]:text-white data-[state=inactive]:text-text2 data-[state=inactive]:hover:bg-zinc-700/50 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-1.5 sm:mr-2" />
                年間
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-center gap-4">
            {/* ... 日付ナビゲーションボタン ... */}
            <div className="flex items-center gap-2 sm:gap-3">
              {activeTab === "monthly" && (
                <>
                  <div className="flex items-center">
                    <Button
                      onClick={goToPreviousYear}
                      className={periodControlButtonClass} // スタイル変更
                      disabled={isPreviousYearDisabled || dataLoading || isRecalculating}
                      title={`${selectedYear - 1}年へ`}
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{selectedYear - 1}</span>
                    </Button>
                    <span className="mx-2 sm:mx-3 text-sm sm:text-base font-medium text-text1 w-16 text-center">
                      {selectedYear}年
                    </span>
                    <Button
                      onClick={goToNextYear}
                      className={periodControlButtonClass} // スタイル変更
                      disabled={dataLoading || isRecalculating}
                      title={`${selectedYear + 1}年へ`}
                    >
                      <span className="hidden sm:inline">{selectedYear + 1}</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <Button
                      onClick={goToPreviousMonth}
                      className={periodControlButtonClass} // スタイル変更
                      disabled={isPreviousMonthDisabled || dataLoading || isRecalculating}
                      title={`${monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]}へ`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="mx-2 sm:mx-3 text-sm sm:text-base font-medium text-text1 w-12 text-center">
                      {monthNames[selectedMonth - 1]}
                    </span>
                    <Button
                      onClick={goToNextMonth}
                      className={periodControlButtonClass} // スタイル変更
                      disabled={dataLoading || isRecalculating}
                      title={`${monthNames[selectedMonth === 12 ? 0 : selectedMonth]}へ`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
              {activeTab === "yearly" && (
                <div className="flex items-center">
                  <Button
                    onClick={goToPreviousYear}
                    className={periodControlButtonClass} // スタイル変更
                    disabled={isPreviousYearDisabled || dataLoading || isRecalculating}
                    title={`${selectedYear - 1}年へ`}
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{selectedYear - 1}</span>
                  </Button>
                  <span className="mx-2 sm:mx-3 text-sm sm:text-base font-medium text-text1 w-16 text-center">
                    {selectedYear}年
                  </span>
                  <Button
                    onClick={goToNextYear}
                    className={periodControlButtonClass} // スタイル変更
                    disabled={dataLoading || isRecalculating}
                    title={`${selectedYear + 1}年へ`}
                  >
                    <span className="hidden sm:inline">{selectedYear + 1}</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              {/* ... データソース表示 ... */}
              {dataSource && (
                <div className="flex items-center text-xs text-text2 opacity-80 mr-2">
                  {dataSource === "stored" ? (
                    <Database className="h-3 w-3 mr-1 text-purple-400" />
                  ) : dataSource === "cache" ? (
                    <Database className="h-3 w-3 mr-1 text-green-400" />
                  ) : (
                    <Database className="h-3 w-3 mr-1 text-blue-400" />
                  )}
                  <span className="hidden sm:inline">
                    {dataSource === "stored" ? "保存済" : dataSource === "cache" ? "キャッシュ" : "サーバー"}
                  </span>
                  {lastUpdated && (
                    <div className="flex items-center ml-1.5 sm:ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={() => loadRankings(false)} // 手動更新は forceRefresh: false
                className={ghostButtonClass}
                disabled={dataLoading || isRecalculating}
                title="ランキングを更新"
              >
                {/* RefreshCw アイコンに直接 text-text1 を適用 */}
                <RefreshCw className={`h-4 w-4 text-black ${dataLoading && !isRecalculating ? "animate-spin" : ""}`} />
              </Button>
              <Button
                onClick={() => recalculateAndStoreRanking(false)} // 手動再計算
                className={whiteButtonClass}
                disabled={dataLoading || isRecalculating} // dataLoading も考慮
                title="ランキングを再計算して保存"
              >
                <Save className={`h-4 w-4 ${isRecalculating ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline">再計算&保存</span>
              </Button>
            </div>
          </div>

          {isRecalculating && (
            <div className="py-4 text-center text-text2">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>ランキングを処理中...</span>
              </div>
            </div>
          )}

          <div className="mt-2">
            {activeTab === "monthly" && renderRankingList(monthlyRanking, "月")}
            {activeTab === "yearly" && renderRankingList(yearlyRanking, "年")}
          </div>
        </div>
      </SectionCard>
    </AppShell>
  )
}
