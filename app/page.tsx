"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"
import DynamicHeadline from "@/components/dynamic-headline"
import { motion } from "framer-motion"
import { LogIn } from "lucide-react" // LogIn アイコンをインポート

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // パーティクルエフェクト（夜のカジノ感を演出）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
    }[] = []

    const createParticles = () => {
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: Math.random() * 0.2 - 0.1,
          speedY: Math.random() * 0.2 - 0.1,
          opacity: Math.random() * 0.3 + 0.1,
        })
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(253, 224, 71, ${particle.opacity})`
        ctx.fill()

        particle.x += particle.speedX
        particle.y += particle.speedY

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1
      })

      requestAnimationFrame(animate)
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      createParticles()
    }

    window.addEventListener("resize", handleResize)
    createParticles()
    animate()

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0a0a0a] text-zinc-100">
      {/* パーティクルの背景キャンバス */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* グラデーション背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,.15),transparent_60%)] z-0"></div>

      {/* ナビゲーションバー - app-shell.tsx のデザインに寄せる */}
      <header className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="PokerChipManager Logo"
            width={32} // サイズを app-shell と合わせる
            height={32}
            className="w-8 h-8 sm:w-10 sm:h-10" // サイズを app-shell と合わせる
          />
          {/* <h1 className="text-2xl font-bold font-heading"> // app-shell ではテキストロゴなし
          <span>Poker</span>
          <span>Chip</span>
          <span className="font-normal">Manager</span>
        </h1> */}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/login">
            <Button
              variant="outline" // app-shell のログアウトボタンに似たスタイル
              className="border-zinc-700 hover:bg-zinc-800 px-4 py-2 text-sm sm:text-base flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              ログイン
            </Button>
          </Link>
          {/* アカウント作成ボタンはCTAにあるので、ヘッダーからは削除しても良いか検討 */}
          {/* <Link href="/signup">
          <Button className="bg-[#fde047] text-black hover:bg-[#fcd34d] px-4 py-2 text-sm sm:text-base">
            アカウント作成
          </Button>
        </Link> */}
        </nav>
      </header>

      <main className="flex-1 flex flex-col relative z-10">
        {/* ヒーローセクション */}
        <section className="py-20 md:py-28 px-6 relative">
          {" "}
          {/* 上下のpaddingを少し調整 */}
          <div className="max-w-4xl mx-auto text-center">
            {" "}
            {/* 中央寄せ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <DynamicHeadline />

              <p className="mt-6 text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                PokerChipManagerは増減履歴を自動追跡し、
                <br />
                ランキングをリアルタイム更新。
                <br />
                ポーカーゲームの運営がもっとスマートに。
              </p>

              <div className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                {" "}
                {/* 中央寄せ */}
                <Link href="/login">
                  <Button className="bg-[#fde047] text-black hover:bg-[#fcd34d] px-8 py-3 text-base sm:text-lg font-bold w-full sm:w-auto">
                    管理者ログイン
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="outline"
                    className="border-zinc-700 hover:bg-zinc-800 px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
                  >
                    アカウント作成
                  </Button>
                </Link>
              </div>

              {/* <div className="mt-4 flex flex-col sm:flex-row gap-8 justify-center">
              <p className="text-sm text-zinc-400">管理者アカウントはチップの追加・減少などの操作が可能です</p>
              <p className="text-sm text-zinc-400">新規アカウントを作成して、すべての機能にアクセスできます</p>
            </div> */}
            </motion.div>
          </div>
        </section>

        {/* 機能紹介セクション - ガラスモーフィズムデザイン */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-16 font-heading">主な機能</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                className="backdrop-blur-md bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="bg-[#fde047] w-12 h-12 flex items-center justify-center rounded-full mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3 font-heading">チップ管理</h4>
                <p className="text-zinc-300">
                  プレイヤーのチップ残高をリアルタイムで追跡し、増減履歴を記録。即座に残高が更新され、取引履歴も確認できます。
                </p>
              </motion.div>

              <motion.div
                className="backdrop-blur-md bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="bg-[#fde047] w-12 h-12 flex items-center justify-center rounded-full mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3 font-heading">ランキング</h4>
                <p className="text-zinc-300">
                  月間・年間のランキングを自動生成し、トッププレイヤーを表示。競争を促進し、プレイヤーのモチベーションを高めます。
                </p>
              </motion.div>

              <motion.div
                className="backdrop-blur-md bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="bg-[#fde047] w-12 h-12 flex items-center justify-center rounded-full mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3 font-heading">統計分析</h4>
                <p className="text-zinc-300">
                  プレイヤーの成績を分析し、トレンドやパターンを可視化。データに基づいた運営判断をサポートします。
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-zinc-500 border-t border-zinc-800 relative z-10">
        <p>© {new Date().getFullYear()} PokerChipManager. All rights reserved.</p>
      </footer>
    </div>
  )
}
