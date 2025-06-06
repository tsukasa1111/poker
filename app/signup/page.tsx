"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signUp } from "@/lib/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("パスワードが一致しません")
      setLoading(false)
      return
    }

    const { user, error } = await signUp(email, password)

    if (error) {
      setError(error)
      setLoading(false)
      return
    }

    if (user) {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ナビゲーションバー */}
      <header className="container mx-auto px-4 py-4">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <Image src="/images/logo.png" alt="PokerChipManager Logo" width={40} height={40} className="w-10 h-10" />
          <h1 className="text-2xl font-bold">
            <span>Poker</span>
            <span>Chip</span>
            <span className="font-normal">Manager</span>
          </h1>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#1a1a1a] border-[#333] border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">アカウント作成</CardTitle>
            <CardDescription className="text-center text-gray-400">新しいアカウントを作成してください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-900 text-red-300">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#0f0f0f] border-[#333] focus:border-white transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#0f0f0f] border-[#333] focus:border-white transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="パスワード（確認）"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#0f0f0f] border-[#333] focus:border-white transition-colors"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={loading}>
                {loading ? "作成中..." : "アカウント作成"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center w-full">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                すでにアカウントをお持ちの方はこちら
              </Link>
            </div>
            <div className="text-center w-full">
              <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                ホームに戻る
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
