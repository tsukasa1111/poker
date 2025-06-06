"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signIn } from "@/lib/auth" // signInWithEmailAndPassword を signIn に変更
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, AlertTriangle, LogIn } from "lucide-react"

export default function LoginCard() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。")
      setLoading(false)
      return
    }

    try {
      const userCredential = await signIn(email, password) // signInWithEmailAndPassword を signInWithEmail に変更
      if (userCredential?.user) {
        router.push("/dashboard")
      } else {
        setError("ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      // Firebaseのエラーコードに基づいてより具体的なメッセージを表示
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("メールアドレスまたはパスワードが正しくありません。")
      } else if (err.code === "auth/invalid-email") {
        setError("有効なメールアドレスを入力してください。")
      } else {
        setError("ログイン中にエラーが発生しました。しばらくしてから再度お試しください。")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-surface1 border-surface2 shadow-xl glass-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-6">
          <Image src="/images/logo.png" alt="Logo" width={64} height={64} className="rounded-full" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-text1">管理者ログイン</CardTitle>
        <CardDescription className="text-sm sm:text-base text-text2 pt-1">
          管理者アカウントでログインしてください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-900 text-red-300">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm text-text2">
              メールアドレス
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface2 border-gray-600 focus:border-accent text-text1 h-11"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs sm:text-sm text-text2">
              パスワード
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-surface2 border-gray-600 focus:border-accent text-text1 h-11 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-text2 hover:text-accent focus:outline-none"
                aria-label={showPassword ? "パスワードを非表示" : "パスワードを表示"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full btn-primary h-11 text-base font-medium mt-2" disabled={loading}>
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                処理中...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <LogIn className="h-5 w-5 mr-2" />
                ログイン
              </div>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center block">
        <p className="text-xs text-text2">問題が発生した場合は、システム管理者にお問い合わせください。</p>
      </CardFooter>
    </Card>
  )
}
