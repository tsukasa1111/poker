"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { initializeFirestore } from "@/lib/firestore"
import AppShell from "@/components/app-shell"
import { PageTitle } from "@/components/page-title"
// import { AddUserDialog } from "@/components/add-user-dialog"; // UserListMini に移動するため削除
import UserListMini from "@/components/user-list-mini" // ここを修正しました
import { motion } from "framer-motion"
import { KpiCard } from "@/components/kpi-card"
import { Coins, Users, Clock, AlertTriangle } from "lucide-react" // UserPlus は UserListMini で使用
import { useRealtimeUsers } from "@/hooks/use-realtime-users"

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [firestoreInitialized, setFirestoreInitialized] = useState(false)
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

  const handleUserAdded = () => {
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

      {/* UserListMini を先に表示 */}
      <div className="space-y-8 mb-8">
        <UserListMini key={refreshUserListTrigger} onUserAdded={handleUserAdded} />
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
