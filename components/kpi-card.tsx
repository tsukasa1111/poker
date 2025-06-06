"use client"

import type React from "react"
import { motion } from "framer-motion"

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  progress?: number
  color?: "accent" | "gold" | "default"
  icon?: React.ReactNode
}

export function KpiCard({ label, value, unit, progress, color = "accent", icon }: KpiCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case "gold":
        return "text-gold gold-item"
      case "accent":
        return "text-accent" // Sky blue for secondary accents
      default:
        return "text-text1"
    }
  }

  const displayValue = typeof value === "number" ? value.toLocaleString() : value

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring" }}
      className="bg-zinc-900/50 backdrop-blur-md shadow-xl p-5 rounded-xl border border-zinc-800/70 hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <p className="text-text2 text-xs sm:text-sm font-medium">{label}</p>
        {icon && <div className="text-text2 opacity-80">{icon}</div>}
      </div>

      <p className={`text-2xl md:text-3xl font-bold mt-2 ${getColorClasses()}`}>
        {displayValue}
        {unit && <span className="ml-1 text-sm sm:text-base opacity-80">{unit}</span>}
      </p>

      {progress != null && (
        <div className="mt-3">
          <div className="h-1.5 mt-1 bg-zinc-700/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className={`h-full rounded-full ${color === "gold" ? "bg-gold" : "bg-accent"}`}
            />
          </div>
          <p className="text-xs text-text2 mt-1 text-right">{Math.round(progress * 100)}%</p>
        </div>
      )}
    </motion.div>
  )
}
