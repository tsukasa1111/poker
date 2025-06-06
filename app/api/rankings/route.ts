import { NextResponse } from "next/server"
import { getStoredRanking } from "@/lib/ranking-store"

export async function GET(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const url = new URL(request.url)
    const type = (url.searchParams.get("type") as "monthly" | "yearly") || "monthly"
    const year = Number.parseInt(url.searchParams.get("year") || new Date().getFullYear().toString())
    const month = url.searchParams.get("month") ? Number.parseInt(url.searchParams.get("month") as string) : undefined

    // 保存されたランキングデータを取得
    const ranking = await getStoredRanking(type, year, month)

    if (!ranking) {
      return NextResponse.json({ message: "ランキングデータが見つかりません" }, { status: 404 })
    }

    // レスポンスを返す
    return NextResponse.json({
      type: ranking.type,
      year: ranking.year,
      month: ranking.month,
      entries: ranking.entries,
      updatedAt: ranking.updatedAt.toDate(),
    })
  } catch (error) {
    console.error("ランキングAPI エラー:", error)
    return NextResponse.json({ message: "ランキングデータの取得に失敗しました", error: String(error) }, { status: 500 })
  }
}
