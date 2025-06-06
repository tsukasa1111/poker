import { NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ message: "ランキングIDが必要です" }, { status: 400 })
    }

    // Firestoreからランキングデータを直接取得
    const rankingRef = doc(db, "rankings", id)
    const docSnap = await getDoc(rankingRef)

    if (!docSnap.exists()) {
      return NextResponse.json({ message: "ランキングデータが見つかりません" }, { status: 404 })
    }

    const data = docSnap.data()

    // レスポンスを返す
    return NextResponse.json({
      id: docSnap.id,
      ...data,
      updatedAt: data.updatedAt.toDate(),
    })
  } catch (error) {
    console.error("ランキングAPI エラー:", error)
    return NextResponse.json({ message: "ランキングデータの取得に失敗しました", error: String(error) }, { status: 500 })
  }
}
