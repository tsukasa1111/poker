"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface SectionCardProps {
  title: string
  children: ReactNode
  className?: string
  variant?: "default" | "accent" | "gold"
  hoverable?: boolean
}

export function SectionCard({
  title,
  children,
  className = "",
  variant = "default",
  hoverable = false,
}: SectionCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "accent":
        return "border-accent/30 shadow-accent/10" // Adjusted opacity
      case "gold":
        return "border-gold/40 shadow-gold/20 gold-card" // Adjusted opacity
      default:
        return "border-zinc-800/70" // Base border style from landing page
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className={`
        bg-zinc-900/50 backdrop-blur-md shadow-xl 
        p-6 rounded-xl w-full border 
        ${getVariantClasses()}
        ${hoverable ? "glass-card-hover" : ""}
        ${className}
      `}
    >
      <h2 className="text-lg md:text-xl font-semibold mb-4 font-heading text-text1 border-b border-zinc-700/50 pb-3 flex items-center justify-between">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </motion.section>
  )
}
