"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { initializeFirestore } from "@/lib/firestore"
import AppShell from "@/components/app-shell"
import { PageTitle } from "@/components/page-title"
import UserListMini from "@/components/user-list-mini"
import { motion } from "framer-motion"
import { KpiCard } from "@/components/kpi-card"
import { Coins, Users, Clock, AlertTriangle } from "lucide-react"
import { useRealtimeUsers } from "@/hooks/use-realtime-users"
import {
  recalculateAndStoreMonthlyRanking,
  recalculateAndStoreYearlyRanking,
  getStoredRanking,
} from "@/lib/ranking-store"
import { showToast } from "@/lib/toast"

// 自動再計算の閾値（ミリ秒）。ここでは1時間（60分 * 60秒 * 1000ミリ秒）に設定
const AUTO_RECALC_THRESHOLD = 60 * 60 * 1000

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [firestoreInitialized, setFirestoreInitialized] = useState(false)
  // refreshUserListTrigger は UserListMini がリアルタイムデータを受け取るため不要になりますが、
  // 既存の onUserAdded の呼び出しを維持するために残しておきます。
  const [refreshUserListTrigger, setRefreshUserListTrigger] = useState(0)

  const {
    users: realtimeUsers,
    loading: usersLoading,
    error: usersError,
    lastUpdated: usersLastUpdated,
  } = useRealtimeUsers()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && !firestoreInitialized) {
      initializeFirestore()
        .then((success) => {
          setFirestoreInitialized(success)
          if (!success) {
            setAuthError("Firestoreの初期化に失敗しました。権限が不足している可能性があります。")
          }
        })
        .catch((error) => {
          console.error("Firestore初期化エラー:", error)
          setAuthError("Firestoreの初期化中にエラーが発生しました。")
        })
    }
  }, [user, firestoreInitialized])

  // ランキングの自動再計算ロジック
  useEffect(() => {
    const checkAndRecalculateRankings = async () => {
      if (!user || !user.email) return

      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      // 月間ランキングのチェックと再計算
      try {
        const storedMonthlyRanking = await getStoredRanking("monthly", currentYear, currentMonth)

        let shouldRecalculateMonthly = false
        if (!storedMonthlyRanking) {
          console.log("月間ランキングデータが保存されていません。再計算をトリガーします。")
          shouldRecalculateMonthly = true
        } else {
          const lastUpdatedTime = storedMonthlyRanking.updatedAt.toDate().getTime()
          if (now.getTime() - lastUpdatedTime > AUTO_RECALC_THRESHOLD) {
            console.log("月間ランキングデータが古いため、再計算をトリガーします。")
            shouldRecalculateMonthly = true
          }
        }

        if (shouldRecalculateMonthly) {
          showToast.info("月間ランキングを自動更新中: 最新の月間ランキングデータを取得しています...")
          const success = await recalculateAndStoreMonthlyRanking(currentYear, currentMonth, user.email)
          if (success) {
            showToast.success("月間ランキング更新完了: 月間ランキングが最新の状態に更新されました。")
          } else {
            showToast.error("月間ランキング更新失敗: 月間ランキングの更新中にエラーが発生しました。")
          }
        }
      } catch (error) {
        console.error("月間ランキング自動更新エラー:", error)
        showToast.error(`月間ランキング更新エラー: ${error instanceof Error ? error.message : String(error)}`)
      }

      // 年間ランキングのチェックと再計算
      try {
        const storedYearlyRanking = await getStoredRanking("yearly", currentYear)

        let shouldRecalculateYearly = false
        if (!storedYearlyRanking) {
          console.log("年間ランキングデータが保存されていません。再計算をトリガーします。")
          shouldRecalculateYearly = true
        } else {
          const lastUpdatedTime = storedYearlyRanking.updatedAt.toDate().getTime()
          if (now.getTime() - lastUpdatedTime > AUTO_RECALC_THRESHOLD) {
            console.log("年間ランキングデータが古いため、再計算をトリガーします。")
            shouldRecalculateYearly = true
          }
        }

        if (shouldRecalculateYearly) {
          showToast.info("年間ランキングを自動更新中: 最新の年間ランキングデータを取得しています...")
          const success = await recalculateAndStoreYearlyRanking(currentYear, user.email)
          if (success) {
            showToast.success("年間ランキング更新完了: 年間ランキングが最新の状態に更新されました。")
          } else {
            showToast.error("年間ランキング更新失敗: 年間ランキングの更新中にエラーが発生しました。")
          }
        }
      } catch (error) {
        console.error("年間ランキング自動更新エラー:", error)
        showToast.error(`年間ランキング更新エラー: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (user && firestoreInitialized) {
      checkAndRecalculateRankings()
    }
  }, [user, firestoreInitialized]) // userとfirestoreInitializedが変更されたときに実行

  const handleUserAdded = () => {
    // UserListMini がリアルタイムデータを受け取るため、このトリガーは直接的なデータ更新には不要ですが、
    // 必要に応じてUIの再レンダリングなどをトリガーするために残しておきます。
    setRefreshUserListTrigger((prev) => prev + 1)
  }

  const kpiData = useMemo(() => {
    if (!realtimeUsers || realtimeUsers.length === 0) {
      return {
        totalUsers: "---",
        totalChips: "---",
        dashboardLastUpdated: "---",
      }
    }
    const totalUsers = realtimeUsers.length
    const totalChips = realtimeUsers.reduce((sum, currentUser) => sum + (currentUser.chips || 0), 0)
    const dashboardLastUpdated = usersLastUpdated ? usersLastUpdated.toLocaleString("ja-JP") : "---"
    return {
      totalUsers: totalUsers.toLocaleString(),
      totalChips: totalChips.toLocaleString(),
      dashboardLastUpdated,
    }
  }, [realtimeUsers, usersLastUpdated])

  if (authLoading || usersLoading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg sm:text-xl text-text2">読み込み中...</p>
          </motion.div>
        </div>
      </AppShell>
    )
  }

  if (!user) {
    return null
  }

  const displayError = authError || usersError

  return (
    <AppShell>
      <PageTitle>{/* AddUserDialog の呼び出しは UserListMini に移動したため、ここからは削除 */}</PageTitle>

      {displayError && (
        <Alert variant="destructive" className="mb-6 bg-red-900/30 border-red-700/50 text-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <AlertDescription className="text-xs sm:text-sm">{displayError}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* UserListMini にリアルタイムデータをプロップスとして渡す */}
      <div className="space-y-8 mb-8">
        <UserListMini
          users={realtimeUsers}
          loading={usersLoading}
          error={usersError}
          lastUpdated={usersLastUpdated}
          onUserAdded={handleUserAdded} // 新規ユーザー追加時のコールバックは維持
        />
      </div>

      {/* KPIカードを UserListMini の下に表示 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard label="総ユーザー数" value={kpiData.totalUsers} icon={<Users className="h-5 w-5" />} color="accent" />
        <KpiCard
          label="総チップ数"
          value={kpiData.totalChips}
          unit="枚"
          icon={<Coins className="h-5 w-5" />}
          color="gold"
        />
        <KpiCard
          label="データ最終更新"
          value={kpiData.dashboardLastUpdated}
          icon={<Clock className="h-5 w-5" />}
          color="default"
        />
      </div>
    </AppShell>
  )
}
