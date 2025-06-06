"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { motion } from "framer-motion"
import { SectionCard } from "@/components/section-card"
import { EmptyState } from "@/components/empty-state"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"

interface ChipChange {
  id: string
  username: string
  timestamp: Date
  changeAmount: number
  type: "add" | "subtract"
}

export function RecentChanges() {
  const [changes, setChanges] = useState<ChipChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const chipHistoryRef = collection(db, "chipHistory")
    const q = query(chipHistoryRef, orderBy("timestamp", "desc"), limit(10))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newChanges: ChipChange[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          newChanges.push({
            id: doc.id,
            username: data.username,
            timestamp: data.timestamp?.toDate() || new Date(),
            changeAmount: data.changeAmount || 0,
            type: data.type,
          })
        })
        setChanges(newChanges)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching recent changes:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return (
    <SectionCard title="最近のチップ変更">
      {loading ? (
        <div className="py-4 text-center text-text2">読み込み中...</div>
      ) : changes.length > 0 ? (
        <ul className="space-y-2">
          {changes.map((change, index) => (
            <motion.li
              key={change.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex justify-between items-center text-sm py-2 border-b border-surface2 last:border-0"
            >
              <span className="text-text2">{format(change.timestamp, "MM/dd HH:mm", { locale: ja })}</span>
              <span className="font-medium">{change.username}</span>
              <span className={`font-mono ${change.type === "add" ? "text-green-400" : "text-red-400"}`}>
                {change.type === "add" ? "+" : "-"}
                {change.changeAmount.toLocaleString()}
              </span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <EmptyState text="まだ取引がありません" />
      )}
    </SectionCard>
  )
}
