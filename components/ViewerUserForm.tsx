"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { useViewerUsers } from "@/src/context/ViewerUsersContext"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function ViewerUserForm() {
  const { viewerUsers, addUser } = useViewerUsers()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    username?: string
    password?: string
  }>({})

  // 入力値のバリデーション
  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {}

    // ユーザー名のバリデーション
    if (!username.trim()) {
      errors.username = "ユーザー名を入力してください。"
    } else if (viewerUsers.some((user) => user.username === username)) {
      // ローカルでの重複チェック
      errors.username = "そのユーザー名はすでに存在します。"
    }

    // パスワードのバリデーション
    if (!password.trim()) {
      errors.password = "パスワードを入力してください。"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 楽観的更新＋バッチ書き込み
      const result = await addUser(username, password)

      if (result) {
        setSuccess("ユーザーを追加しました！")
        // フォームをリセット
        setUsername("")
        setPassword("")
        setValidationErrors({})
      } else {
        setError("ユーザーの追加に失敗しました。")
      }
    } catch (err) {
      setError("エラーが発生しました。再度お試しください。")
      console.error("ユーザー追加エラー:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-[#1a1a1a] border-[#333] w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>読み取り専用ユーザーの追加</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-900/20 border-green-900 text-green-300">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              placeholder="例：tanaka"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-[#0f0f0f] border-[#333] p-2 rounded-lg"
              disabled={loading}
            />
            {validationErrors.username && <p className="text-sm text-red-400 mt-1">{validationErrors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#0f0f0f] border-[#333] p-2 rounded-lg"
              disabled={loading}
            />
            {validationErrors.password && <p className="text-sm text-red-400 mt-1">{validationErrors.password}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-gray-200 p-2 m-2 rounded-lg"
            disabled={loading}
          >
            {loading ? "追加中..." : "ユーザーを追加"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
