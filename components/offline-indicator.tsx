"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"
import { motion } from "framer-motion"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // 初期状態を設定
    setIsOnline(navigator.onLine)

    // オンライン/オフライン状態の変更を監視
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-40 bg-amber-900/80 text-amber-200 px-3 py-2 rounded-md flex items-center gap-2 shadow-lg"
    >
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">オフラインモード</span>
    </motion.div>
  )
}
