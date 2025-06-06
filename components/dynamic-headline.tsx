"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const TAGLINES = ["残高、一瞬で。", "増減見える化。", "履歴、丸見え。", "数字、逃さない。"] as const // 7〜8字中心

export default function DynamicHeadline() {
  const [index, setIndex] = useState(0)

  // 4秒ごとに切り替え（リロード毎にランダム開始）
  useEffect(() => {
    setIndex(Math.floor(Math.random() * TAGLINES.length))
    const t = setInterval(() => setIndex((i) => (i + 1) % TAGLINES.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative h-20 md:h-24 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.h1
          key={TAGLINES[index]}
          className="absolute inset-0 flex items-center text-4xl md:text-6xl font-extrabold tracking-tight font-heading"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {TAGLINES[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  )
}
