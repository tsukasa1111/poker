"use client"

import type React from "react"
import { useState, useEffect } from "react" // useEffect をインポート
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/lib/firestore"
import { AlertTriangle, CheckCircle } from "lucide-react"

interface UserProfileTabProps {
  user: User
  onUserUpdated: () => void
}

export function UserProfileTab({ user, onUserUpdated }: UserProfileTabProps) {
  const [displayName, setDisplayName] = useState(user.displayName || "")
  const [notes, setNotes] = useState(user.notes || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ユーザーが変更されたときにフォームの値をリセット
  useEffect(() => {
    setDisplayName(user.displayName || "")
    setNotes(user.notes || "")
    setError(null)
    setSuccess(null)
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!displayName.trim()) {
        setError("表示名を入力してください")
        setLoading(false)
        return
      }

      const updateData: any = {
        displayName: displayName.trim(),
        notes: notes.trim(),
        lastUpdated: new Date(),
      }

      const userRef = doc(db, "users", user.id)
      await updateDoc(userRef, updateData)

      setSuccess("プロフィール情報を更新しました")
      onUserUpdated() // 親コンポーネントに更新を通知
    } catch (err: any) {
      console.error("User update error:", err)
      setError(err.message || "ユーザー情報の更新中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      {" "}
      {/* h-full flex flex-col を追加 */}
      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300 shrink-0">
          {" "}
          {/* shrink-0 を追加 */}
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 bg-green-900/20 border-green-900 text-green-300 shrink-0">
          {" "}
          {/* shrink-0 を追加 */}
          <CheckCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleProfileUpdate} className="space-y-6 flex flex-col flex-grow">
        {" "}
        {/* space-y-6, flex flex-col flex-grow を追加 */}
        <div className="space-y-2">
          <Label htmlFor="username-profile" className="block text-sm font-medium text-text2">
            ユーザー名
          </Label>
          <Input
            id="username-profile"
            value={user.username}
            className="bg-surface2 border-gray-600 text-text2 h-11 text-base"
            disabled
          />
          <p className="text-xs text-text2">ユーザー名は変更できません。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName-profile" className="block text-sm font-medium text-text2">
            表示名 <span className="text-red-400 ml-1">*</span>
          </Label>
          <Input
            id="displayName-profile"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-surface2 border-gray-600 focus:border-accent text-text1 h-11 text-base"
            required
          />
        </div>
        <div className="space-y-2 flex flex-col flex-grow">
          {" "}
          {/* flex flex-col flex-grow を追加 */}
          <Label htmlFor="notes-profile" className="block text-sm font-medium text-text2">
            メモ
          </Label>
          <Textarea
            id="notes-profile"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-surface2 border-gray-600 focus:border-accent text-text1 text-base flex-grow min-h-[120px]" // flex-grow と min-h を調整
            rows={5} // rows を調整
          />
        </div>
        <div className="mt-auto pt-4">
          {" "}
          {/* mt-auto pt-4 でボタンを一番下に配置 */}
          <Button
            type="submit"
            className="w-full btn-primary h-12 text-base font-semibold"
            disabled={loading || (user.displayName === displayName && user.notes === notes)} // 変更がない場合は無効化
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                更新中...
              </div>
            ) : (
              "プロフィールを保存"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
