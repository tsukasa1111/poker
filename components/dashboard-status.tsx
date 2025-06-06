"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

interface DashboardStatusProps {
  lastUpdated?: Date | null
  isLoading?: boolean
  onRefresh?: () => void
}

export function DashboardStatus({ lastUpdated, isLoading = false, onRefresh }: DashboardStatusProps) {
  const router = useRouter()
  const [timeAgo, setTimeAgo] = useState<string>("")

  // 時間経過表示を更新
  useEffect(() => {
    if (!lastUpdated) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diff = now.getTime() - lastUpdated.getTime()

      // 1分未満
      if (diff < 60000) {
        setTimeAgo(`${Math.floor(diff / 1000)}秒前`)
        return
      }

      // 1時間未満
      if (diff < 3600000) {
        setTimeAgo(`${Math.floor(diff / 60000)}分前`)
        return
      }

      // 24時間未満
      if (diff < 86400000) {
        setTimeAgo(`${Math.floor(diff / 3600000)}時間前`)
        return
      }

      // それ以上
      setTimeAgo(`${Math.floor(diff / 86400000)}日前`)
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 10000) // 10秒ごとに更新

    return () => clearInterval(interval)
  }, [lastUpdated])

  // 最新データを取得
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else {
      router.refresh()
    }
    toast.success("最新データを取得しています...")
  }

  return (
    <div className="flex items-center text-xs sm:text-sm text-text2 bg-surface1/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm">
      {/* データ状態インジケーター（クリック不可） */}
      <div className="flex items-center">
        <Database className="h-4 w-4 mr-2" />
        <span className="text-xs sm:text-sm">保存データ</span>
        {lastUpdated && (
          <span className="ml-2 font-mono text-xs sm:text-sm">
            {timeAgo ? `(${timeAgo})` : `(${lastUpdated.toLocaleTimeString()})`}
          </span>
        )}
      </div>

      {/* 最新取得ボタン */}
      <Button
        onClick={handleRefresh}
        variant="outline"
        size="sm"
        className="bg-surface2 hover:bg-surface3"
        disabled={isLoading}
      >
        <Database className="h-4 w-4 mr-2" />
        最新取得
        {isLoading && <RefreshCw className="h-3 w-3 ml-2 animate-spin" />}
      </Button>
    </div>
  )
}
