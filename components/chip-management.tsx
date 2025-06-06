"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { updateUserChips, type User } from "@/lib/firestore"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "react-hot-toast"
import {
  PlusCircle,
  MinusCircle,
  Eye,
  Edit,
  Coins,
  TrendingUp,
  TrendingDown,
  Info,
  StarIcon as SuccessIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const REASON_PRESETS = {
  add: [
    { id: "deposit", label: "預け入れ" },
    { id: "tournament-win", label: "トーナメント優勝" },
    { id: "game-win", label: "ゲーム勝利" },
    { id: "bonus", label: "ボーナス" },
  ],
  subtract: [
    { id: "withdraw", label: "引き出し" },
    { id: "tournament-entry", label: "トーナメント参加" },
    { id: "drink", label: "ドリンク購入" },
    { id: "food", label: "フード購入" },
  ],
}

interface ChipManagementProps {
  user: User | null
  onUpdate: () => void
  onSuccessAndCloseModal?: () => void
  inModal?: boolean
}

export default function ChipManagement({
  user,
  onUpdate,
  onSuccessAndCloseModal,
  inModal = false,
}: ChipManagementProps) {
  const { user: staffUser } = useAuth()
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState(false)
  const [type, setType] = useState<"add" | "subtract">("add")
  const [loading, setLoading] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)

  const isReadOnlyUser = user ? user.role === "readonly" || user.role === "viewer" : false

  const isFormValid = useMemo(() => {
    return (
      amount.trim() !== "" && Number.parseInt(amount) > 0 && !isNaN(Number.parseInt(amount)) && reason.trim() !== ""
    )
  }, [amount, reason])

  useEffect(() => {
    setAmount("")
    setReason("")
    setSelectedPreset(null)
    setCustomReason(false)
    setType("add")
    setShowSuccessAlert(false)
  }, [user?.id])

  const handleTypeChange = (newType: "add" | "subtract") => {
    setType(newType)
    setSelectedPreset(null)
    setReason("")
    setCustomReason(false)
  }

  const handlePresetSelect = (presetId: string) => {
    if (presetId === "custom") {
      setCustomReason(true)
      setSelectedPreset("custom")
      setReason("")
    } else {
      const presets = type === "add" ? REASON_PRESETS.add : REASON_PRESETS.subtract
      const preset = presets.find((p) => p.id === presetId)
      if (preset) {
        setReason(preset.label)
        setSelectedPreset(presetId)
        setCustomReason(false)
      }
    }
  }

  const handleUpdateChips = async () => {
    if (!user || typeof user.id !== "string" || user.id.trim() === "") {
      toast.error("ユーザー情報が正しく読み込めていません。ページを再読み込みするか、再度ユーザーを選択してください。")
      return
    }
    if (!staffUser) {
      toast.error("認証されていません。再度ログインしてください。")
      return
    }
    if (!isFormValid) {
      toast.error("チップ数と理由を正しく入力してください。")
      return
    }
    if (!staffUser?.email) {
      toast.error("スタッフ情報が取得できません。")
      return
    }

    setLoading(true)
    setShowSuccessAlert(false)
    const loadingToastId = toast.loading("チップ情報を更新中...")

    try {
      const parsedAmount = Number.parseInt(amount)
      const result = await updateUserChips(user.id, parsedAmount, type, reason, staffUser.email)
      toast.dismiss(loadingToastId)
      if (result) {
        setShowSuccessAlert(true)
        setAmount("")
        setReason("")
        setSelectedPreset(null)
        setCustomReason(false)

        if (onUpdate) {
          onUpdate()
        }

        const alertDisplayDuration = 1500 // 1.5秒に短縮

        if (inModal && onSuccessAndCloseModal) {
          setTimeout(() => {
            setShowSuccessAlert(false)
            onSuccessAndCloseModal()
          }, alertDisplayDuration)
        } else {
          setTimeout(() => {
            setShowSuccessAlert(false)
          }, alertDisplayDuration)
        }
      } else {
        toast.error("チップの更新に失敗しました。詳細はシステムログを確認してください。")
        console.error(`[ChipManagement] updateUserChips returned false for user ${user.id}`)
      }
    } catch (err: any) {
      toast.dismiss(loadingToastId)
      toast.error(err.message || "チップ更新中に予期せぬエラーが発生しました。")
      console.error("[ChipManagement] Error during updateUserChips call:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    if (inModal) return <div className="p-6 text-center text-text2">ユーザー情報がありません。</div>
    return (
      <Card className="w-full bg-surface1 border-surface2 shadow-lg glass-card">
        <CardHeader>
          <CardTitle className="text-text1">チップ操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-text2">操作対象のユーザーを選択してください。</div>
        </CardContent>
      </Card>
    )
  }

  const content = (
    <div className="space-y-6 py-2 w-full">
      {showSuccessAlert && (
        <Alert
          variant="default"
          className="border-green-500 bg-green-500/10 text-green-700 dark:border-green-400 dark:bg-green-400/10 dark:text-green-300"
        >
          <SuccessIcon className="h-5 w-5 !text-green-500 dark:!text-green-400" />
          <AlertTitle className="font-semibold !text-green-600 dark:!text-green-300">更新完了</AlertTitle>
          <AlertDescription className="!text-green-700 dark:!text-green-400">
            チップの更新が正常に完了しました。
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-text1">操作タイプ</Label>
        <RadioGroup
          value={type}
          onValueChange={(value) => handleTypeChange(value as "add" | "subtract")}
          className="grid grid-cols-2 gap-2 rounded-lg border border-surface2 bg-surface1 p-1"
          disabled={isReadOnlyUser || loading || showSuccessAlert}
        >
          <RadioGroupItem value="add" id={`add-${user.id}`} className="sr-only" />
          <Label
            htmlFor={`add-${user.id}`}
            className={cn(
              "flex items-center justify-center cursor-pointer rounded-md py-2.5 px-4 text-center text-sm font-medium transition-all",
              type === "add"
                ? "bg-green-600/20 text-green-300 border border-green-500 shadow-sm"
                : "text-text2 hover:bg-surface2",
              (loading || showSuccessAlert) && "opacity-50 cursor-not-allowed",
            )}
          >
            <PlusCircle className="inline-block w-4 h-4 mr-2 align-middle" />
            追加
          </Label>
          <RadioGroupItem value="subtract" id={`subtract-${user.id}`} className="sr-only" />
          <Label
            htmlFor={`subtract-${user.id}`}
            className={cn(
              "flex items-center justify-center cursor-pointer rounded-md py-2.5 px-4 text-center text-sm font-medium transition-all",
              type === "subtract"
                ? "bg-red-600/20 text-red-300 border border-red-500 shadow-sm"
                : "text-text2 hover:bg-surface2",
              (loading || showSuccessAlert) && "opacity-50 cursor-not-allowed",
            )}
          >
            <MinusCircle className="inline-block w-4 h-4 mr-2 align-middle" />
            減少
          </Label>
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`amount-${user.id}`} className="text-sm font-medium text-text2 flex items-center">
          チップ数 <span className="text-red-400 ml-1">*</span>
        </Label>
        <Input
          id={`amount-${user.id}`}
          type="number"
          placeholder="例: 1,000 (必須)"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="bg-surface2 border-gray-600 focus:border-accent text-text1 h-12 text-base tabular-nums"
          disabled={isReadOnlyUser || loading || showSuccessAlert}
          min="1"
        />
      </div>
      <div className="space-y-3">
        <Label className="text-sm font-medium text-text2 flex items-center">
          チップ操作の理由 <span className="text-red-400 ml-1">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {(type === "add" ? REASON_PRESETS.add : REASON_PRESETS.subtract).map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant={selectedPreset === preset.id ? "default" : "outline"}
              className={cn(
                "h-auto py-3 px-3 text-sm justify-center transition-all duration-150 ease-in-out text-pretty",
                selectedPreset === preset.id
                  ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-surface1 scale-105"
                  : "bg-surface2 border-gray-600 text-text1 hover:bg-surface2/80 hover:border-accent",
              )}
              onClick={() => handlePresetSelect(preset.id)}
              disabled={isReadOnlyUser || loading || showSuccessAlert}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            variant={selectedPreset === "custom" ? "default" : "outline"}
            className={cn(
              "h-auto py-3 px-3 text-sm justify-center transition-all duration-150 ease-in-out col-span-2 text-pretty",
              selectedPreset === "custom"
                ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-surface1 scale-105"
                : "bg-surface2 border-gray-600 text-text1 hover:bg-surface2/80 hover:border-accent",
            )}
            onClick={() => handlePresetSelect("custom")}
            disabled={isReadOnlyUser || loading || showSuccessAlert}
          >
            <Edit className="w-4 h-4 mr-1.5" />
            カスタム入力
          </Button>
        </div>
        {customReason && (
          <Textarea
            id={`custom-reason-${user.id}`}
            placeholder="具体的な理由を入力してください (必須)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-3 bg-surface2 border-gray-600 focus:border-accent text-text1 min-h-[90px] text-base"
            disabled={isReadOnlyUser || loading || showSuccessAlert}
          />
        )}
      </div>
      {!isReadOnlyUser && (
        <Button
          onClick={handleUpdateChips}
          disabled={isReadOnlyUser || loading || showSuccessAlert || !isFormValid}
          className="w-full btn-primary h-12 mt-6 text-base font-semibold"
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
              処理中...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              {type === "add" ? <PlusCircle className="w-5 h-5 mr-2" /> : <MinusCircle className="w-5 h-5 mr-2" />}
              {type === "add" ? "チップを追加" : "チップを減少"}
            </div>
          )}
        </Button>
      )}
      {isReadOnlyUser && (
        <div className="mt-6 p-3 bg-yellow-900/30 text-yellow-300 rounded-md text-sm flex items-center gap-2">
          <Info className="h-5 w-5 flex-shrink-0" />
          このユーザーは読み取り専用のため、チップ操作はできません。
        </div>
      )}
    </div>
  )

  if (inModal) {
    return content
  }

  return (
    <Card className="w-full bg-surface1 border-surface2 shadow-lg glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xl">
          <div className="flex items-center gap-2 text-text1">
            {isReadOnlyUser ? (
              <>
                <Eye className="h-6 w-6 text-blue-400 flex-shrink-0" />
                <span>読み取り専用</span>
              </>
            ) : (
              <>
                <Coins className="h-6 w-6 text-accent flex-shrink-0" />
                <span>チップ操作</span>
              </>
            )}
            <span className="font-semibold truncate text-accent-2">: {user.displayName || user.username}</span>
          </div>
          <div className="text-sm text-text2 font-normal pt-1 sm:pt-0 tabular-nums">ID: {user.username}</div>
        </CardTitle>
        <CardDescription className="text-text2 pt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gray-400" />
            <span>
              現在の手持ち: <span className="font-semibold text-text1 tabular-nums">{user.chips.toLocaleString()}</span>{" "}
              枚
            </span>
          </div>
          {user.totalEarnings !== undefined && user.totalEarnings > 0 && (
            <div className="flex items-center gap-2 text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span className="tabular-nums">総獲得: {user.totalEarnings.toLocaleString()} 枚</span>
            </div>
          )}
          {user.totalLosses !== undefined && user.totalLosses > 0 && (
            <div className="flex items-center gap-2 text-red-400">
              <TrendingDown className="h-4 w-4" />
              <span className="tabular-nums">総損失: {user.totalLosses.toLocaleString()} 枚</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
