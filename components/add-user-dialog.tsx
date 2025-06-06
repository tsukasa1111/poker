"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { UserPlus, AlertTriangle, CheckCircle } from "lucide-react"
import { createUser } from "@/lib/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

// ここを 'export default function' に変更しました
export default function AddUserDialog({ onUserAdded }: { onUserAdded?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [username, setUsername] = useState("@")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    username?: string
    displayName?: string
  }>({})

  const usernameInputRef = useRef<HTMLInputElement>(null)

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value.startsWith("@")) {
      setUsername("@" + value.replace("@", ""))
    } else {
      setUsername(value)
    }
  }

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && username === "@" && e.currentTarget.selectionStart === 1) {
      e.preventDefault()
    }
  }

  const handleUsernameFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.currentTarget.value === "@" && e.currentTarget.selectionStart === 0) {
      e.currentTarget.setSelectionRange(1, 1)
    } else if (e.currentTarget.selectionStart === 0 && e.currentTarget.value.startsWith("@")) {
      e.currentTarget.setSelectionRange(1, e.currentTarget.value.length)
    }
  }

  const resetForm = () => {
    setUsername("@")
    setDisplayName("")
    setError(null)
    setSuccess(null)
    setValidationErrors({})
    setLoading(false)
  }

  const validateForm = (): boolean => {
    const errors: {
      username?: string
      displayName?: string
    } = {}

    if (!username.trim() || username === "@") {
      errors.username = "ユーザーIDを入力してください"
    } else if (!/^@[A-Za-z0-9_]{1,15}$/.test(username)) {
      errors.username = "ユーザーIDは@で始まる1文字以上の半角英数字とアンダースコアで、15文字以内で入力してください"
    }

    if (!displayName.trim()) {
      errors.displayName = "表示名を入力してください"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const cleanUsername = username
      const newUser = await createUser(cleanUsername, 0, displayName.trim(), "") // パスワード引数は空文字

      if (newUser) {
        setSuccess(`ユーザー「${cleanUsername}」を作成しました`)
        setTimeout(() => {
          setIsOpen(false) // ダイアログを閉じる
          if (onUserAdded) onUserAdded()
        }, 1500)
      } else {
        setError("ユーザーの作成に失敗しました")
      }
    } catch (err: any) {
      console.error("ユーザー作成エラー:", err)
      if (err.message && err.message.includes("このユーザー名は既に使用されています")) {
        setError(`ユーザーID「${username}」は既に使用されています。`)
        setValidationErrors((prev) => ({ ...prev, username: `ユーザーID「${username}」は既に使用されています。` }))
      } else {
        setError(err.message || "ユーザー作成中にエラーが発生しました")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary" onClick={() => setIsOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          新規ユーザー追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-surface1 border-surface2 text-text1">
        <DialogHeader>
          <DialogTitle>新規ユーザー追加</DialogTitle>
          <DialogDescription className="text-text2">
            新しいユーザーの情報を入力してください。ユーザーIDは後から変更できません。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="my-4 bg-red-900/20 border-red-900 text-red-300">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="my-4 bg-green-900/20 border-green-900 text-green-300">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!success && ( // 成功メッセージ表示時はフォームを隠す
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザーID (必須)</Label>
              <Input
                id="username"
                ref={usernameInputRef}
                placeholder="@tanaka"
                value={username}
                onChange={handleUsernameChange}
                onKeyDown={handleUsernameKeyDown}
                onFocus={handleUsernameFocus}
                onClick={handleUsernameFocus} // クリック時にもフォーカス処理
                className={`bg-surface2 border-gray-600 focus:border-accent ${validationErrors.username ? "border-red-500 focus:border-red-500" : ""}`}
                required
                disabled={loading}
              />
              {validationErrors.username && <p className="text-xs text-red-400">{validationErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">表示名 (必須)</Label>
              <Input
                id="displayName"
                placeholder="例：田中太郎"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={`bg-surface2 border-gray-600 focus:border-accent ${validationErrors.displayName ? "border-red-500 focus:border-red-500" : ""}`}
                required
                disabled={loading}
              />
              {validationErrors.displayName && <p className="text-xs text-red-400">{validationErrors.displayName}</p>}
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={loading}>
                  キャンセル
                </Button>
              </DialogClose>
              <Button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "作成中..." : "ユーザーを作成"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {success && ( // 成功メッセージ表示時のみ閉じるボタンを表示
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                閉じる
              </Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
