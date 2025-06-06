"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { SectionCard } from "@/components/section-card"
import { EmptyState } from "@/components/empty-state"
import { getMonthlyRanking, type RankingEntry } from "@/lib/ranking"
import { Trophy } from "lucide-react"

export function MiniRanking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNumbers, setShowNumbers] = useState(false)

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const data = await getMonthlyRanking(10)
        setRanking(data.ranking)
        setLoading(false)

        // アニメーション効果のために少し遅延させてから数字を表示
        setTimeout(() => {
          setShowNumbers(true)
        }, 500)
      } catch (err: any) {
        console.error("ランキングの取得に失敗しました:", err)
        setError(err.message || "ランキングの取得に失敗しました。")
        setLoading(false)
      }
    }

    fetchRanking()
  }, [])

  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-accent2"
      case 2:
        return "text-gray-300"
      case 3:
        return "text-amber-700"
      default:
        return "text-text2"
    }
  }

  return (
    <SectionCard title="月間ランキング">
      {loading ? (
        <div className="py-4 text-center text-text2">読み込み中...</div>
      ) : error ? (
        <div className="py-4 text-center text-red-400">{error}</div>
      ) : ranking.length > 0 ? (
        <ul className="space-y-1">
          {ranking.map((entry, index) => (
            <motion.li
              key={entry.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center justify-between p-2 rounded-md hover:bg-surface2"
            >
              <div className="flex items-center">
                <div className="w-8 flex justify-center">
                  <Trophy className={`h-4 w-4 ${getTrophyColor(entry.rank)}`} />
                </div>
                <span className="font-medium">{entry.displayName || entry.username}</span>
              </div>
              <motion.span
                className="font-mono text-accent2 font-bold"
                initial={{ opacity: 1, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: showNumbers ? "blur(0px)" : "blur(4px)",
                }}
                transition={{ duration: 0.5 }}
              >
                {showNumbers ? entry.total.toLocaleString() : "???"}
              </motion.span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <EmptyState text="ランキングデータがありません" />
      )}
    </SectionCard>
  )
}
