"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { signOut } from "@/lib/auth"
import { Trophy, Home } from "lucide-react" // UserCircle をインポート
import { OfflineIndicator } from "./offline-indicator"

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/" // ログアウト後はログインページにリダイレクト
  }

  const navLinks = [
    { href: "/dashboard", label: "ダッシュボード", icon: Home, active: pathname === "/dashboard" },
    { href: "/ranking", label: "ランキング", icon: Trophy, active: pathname === "/ranking" },
  ]

  // ログイン状態に応じてロゴのリンク先を決定
  const logoHref = user ? "/dashboard" : "/"

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-bg">
      <OfflineIndicator />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,.15),transparent_60%)] z-0"></div>

      <header className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between relative z-10">
        <Link href={logoHref} className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="PokerChipManager Logo"
            width={32}
            height={32}
            className="w-8 h-8 sm:w-10 sm:h-10"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              {/* ... ログイン済みユーザー向けのナビゲーション ... */}
              <div className="hidden md:flex items-center gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md transition-colors duration-base flex items-center gap-2 ${
                      link.active ? "bg-surface2 text-text1" : "text-text2 hover:text-text1 hover:bg-surface1"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
              <div className="md:hidden flex items-center gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`p-2 rounded-md transition-colors duration-base ${
                      link.active ? "bg-surface2 text-text1" : "text-text2 hover:text-text1 hover:bg-surface1"
                    }`}
                    aria-label={link.label}
                  >
                    <link.icon className="h-5 w-5" />
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-text2 hidden md:inline">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm"
                >
                  ログアウト
                </button>
              </div>
            </>
          ) : (
            // ログインボタンの表示条件に pathname !== "/login" を追加
            pathname !== "/login" && (
              <Link href="/login">
                <button className="btn-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm">
                  ログイン
                </button>
              </Link>
            )
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col relative z-10 container mx-auto px-4 py-4 sm:py-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {children}
        </motion.div>
      </main>

      <footer className="container mx-auto px-4 py-6 sm:py-8 text-center text-text2 border-t border-surface2 relative z-10"></footer>
    </div>
  )
}
