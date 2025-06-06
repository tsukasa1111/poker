"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface PageTitleProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageTitle({ title, description, children }: PageTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading mb-2">{title}</h1>
      {description && <p className="text-text2 text-base sm:text-lg">{description}</p>}
      {children}
    </motion.div>
  )
}
