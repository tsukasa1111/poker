"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, RefreshCw, Calculator, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getMonthlyRanking, recalcMonthlyRanking, type RankingEntry } from "@/lib/ranking"
import { showToast } from "@/lib/toast"

export default function Ranking() {
  const { user: staffUser } = useAuth()
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ランキングを読み込む
  const loadRanking = async () => {
    if (!staffUser) {
      setError("認証されていません。再度ログインしてください。")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getMonthlyRanking(20)
      setRanking(data.ranking)
      setUpdatedAt(data.updatedAt)
    } catch (err: any) {
      console.error("ランキングの取得に失敗しました:", err)
      setError(err.message || "ランキングの取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  // ランキングを再計算する
  const handleRecalc = async () => {
    if (!staffUser) {
      showToast.error("認証されていません。再度ログインしてください。")
      return
    }

    setRecalcLoading(true)
    try {
      await recalcMonthlyRanking()
      showToast.success("ランキングを再計算しました")
      await loadRanking()
    } catch (err: any) {
      console.error("ランキングの再計算に失敗しました:", err)
      showToast.error(err.message || "再計算に失敗しました")
    } finally {
      setRecalcLoading(false)
    }
  }

  // 初回マウント時にランキングを読み込む
  useEffect(() => {
    if (staffUser) {
      loadRanking()
    }
  }, [staffUser])

  // 最終更新日時が24時間以上前かどうかをチェック
  const isStale = updatedAt && Date.now() - updatedAt.getTime() > 24 * 60 * 60 * 1000

  // 現在の年月を取得
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStr = month.toString().padStart(2, "0")

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-bold">月間ランキング</CardTitle>
          <span className="text-sm text-gray-400">
            {year}年{monthStr}月
          </span>
          {updatedAt ? (
            <span className={`text-xs ${isStale ? "text-red-400" : "text-gray-400"}`}>
              更新: {updatedAt.toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}
            </span>
          ) : (
            <span className="text-xs text-yellow-400">未計算</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRecalc}
            disabled={loading || recalcLoading}
            variant="outline"
            size="sm"
            className="h-8 px-2 gap-1"
          >
            <Calculator className="h-4 w-4" /> 再計算
          </Button>
          <Button
            onClick={loadRanking}
            disabled={loading || recalcLoading}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || recalcLoading ? (
          <div className="flex justify-center py-8">
            <p>{recalcLoading ? "再計算中..." : "読み込み中..."}</p>
          </div>
        ) : ranking.length > 0 ? (
          <div className="space-y-1">
            {ranking.map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-2 rounded-md ${index < 3 ? "bg-[#0f0f0f]" : ""}`}
              >
                <div className="flex items-center">
                  <div className="w-8 text-center">
                    {index === 0 ? (
                      <Trophy className="h-5 w-5 text-yellow-500 mx-auto" />
                    ) : index === 1 ? (
                      <Trophy className="h-5 w-5 text-gray-400 mx-auto" />
                    ) : index === 2 ? (
                      <Trophy className="h-5 w-5 text-amber-700 mx-auto" />
                    ) : (
                      <span className="text-gray-400">{index + 1}</span>
                    )}
                  </div>
                  <span className="ml-3 font-medium">{entry.displayName || entry.username}</span>
                </div>
                <span className="font-bold">{entry.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : updatedAt ? (
          <p className="text-center py-4 text-gray-400">ランキングが空です</p>
        ) : (
          <p className="text-center py-4 text-gray-400">「再計算」を押して初回ランキングを生成してください</p>
        )}
      </CardContent>
    </Card>
  )
}
