"use client"

import AppShell from "@/components/app-shell"
import LoginCard from "@/components/login-card"

export default function LoginPage() {
  return (
    <AppShell>
      <div className="min-h-[80vh] flex items-center justify-center py-12 relative">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,.15),transparent_65%)]" />

        {/* ログインカード */}
        <LoginCard />
      </div>

      {/* キーフレームアニメーション */}
      <style jsx global>{`
        @keyframes float {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
      `}</style>
    </AppShell>
  )
}
