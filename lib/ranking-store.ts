import { doc, getDoc, setDoc, serverTimestamp, type Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import { getMonthlyRanking, getYearlyRanking, type RankingEntry } from "./ranking"

// ランキングデータの型定義
export interface StoredRanking {
  id: string // ドキュメントID
  type: "monthly" | "yearly" // ランキングタイプ
  year: number // 年
  month?: number // 月（月間ランキングの場合のみ）
  entries: RankingEntry[] // ランキングエントリー
  updatedAt: Timestamp // 更新日時
  updatedBy: string // 更新者（メールアドレス）
}

/**
 * ランキングデータをFirestoreに保存する
 * @param type ランキングタイプ（monthly または yearly）
 * @param year 年
 * @param month 月（月間ランキングの場合のみ）
 * @param entries ランキングエントリー
 * @param updatedBy 更新者のメールアドレス
 * @returns 保存に成功したかどうか
 */
export const storeRanking = async (
  type: "monthly" | "yearly",
  year: number,
  month: number | undefined,
  entries: RankingEntry[],
  updatedBy: string,
): Promise<boolean> => {
  try {
    // ドキュメントIDを生成
    const docId = type === "monthly" ? `monthly_${year}_${month?.toString().padStart(2, "0")}` : `yearly_${year}`

    // ランキングデータを作成
    const rankingData: Omit<StoredRanking, "id"> = {
      type,
      year,
      ...(type === "monthly" ? { month } : {}),
      entries,
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy,
    }

    // Firestoreに保存
    const rankingsRef = doc(db, "rankings", docId)
    await setDoc(rankingsRef, rankingData)

    console.log(`ランキングデータを保存しました: ${docId}`)
    return true
  } catch (error) {
    console.error("ランキングデータの保存に失敗しました:", error)
    return false
  }
}

/**
 * 保存されたランキングデータをFirestoreから取得する
 * @param type ランキングタイプ（monthly または yearly）
 * @param year 年
 * @param month 月（月間ランキングの場合のみ）
 * @returns ランキングデータ（存在しない場合はnull）
 */
export const getStoredRanking = async (
  type: "monthly" | "yearly",
  year: number,
  month?: number,
): Promise<StoredRanking | null> => {
  try {
    // ドキュメントIDを生成
    const docId = type === "monthly" ? `monthly_${year}_${month?.toString().padStart(2, "0")}` : `yearly_${year}`

    // Firestoreからデータを取得
    const rankingRef = doc(db, "rankings", docId)
    const docSnap = await getDoc(rankingRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<StoredRanking, "id">
      return {
        id: docSnap.id,
        ...data,
        updatedAt: data.updatedAt as Timestamp,
      }
    } else {
      console.log(`ランキングデータが存在しません: ${docId}`)
      return null
    }
  } catch (error) {
    console.error("ランキングデータの取得に失敗しました:", error)
    return null
  }
}

/**
 * 月間ランキングを再計算してFirestoreに保存する
 * @param year 年
 * @param month 月
 * @param updatedBy 更新者のメールアドレス
 * @returns 保存に成功したかどうか
 */
export const recalculateAndStoreMonthlyRanking = async (
  year: number,
  month: number,
  updatedBy: string,
): Promise<boolean> => {
  try {
    console.log(`月間ランキングを再計算します: ${year}年${month}月`)

    // 月間ランキングを取得（強制的にサーバーから最新データを取得）
    const rankingData = await getMonthlyRanking(year, month, 50, true)

    if (!rankingData.ranking || rankingData.ranking.length === 0) {
      console.log("ランキングデータが空です")
      return false
    }

    // Firestoreに保存
    return await storeRanking("monthly", year, month, rankingData.ranking, updatedBy)
  } catch (error) {
    console.error("月間ランキングの再計算と保存に失敗しました:", error)
    return false
  }
}

/**
 * 年間ランキングを再計算してFirestoreに保存する
 * @param year 年
 * @param updatedBy 更新者のメールアドレス
 * @returns 保存に成功したかどうか
 */
export const recalculateAndStoreYearlyRanking = async (year: number, updatedBy: string): Promise<boolean> => {
  try {
    console.log(`年間ランキングを再計算します: ${year}年`)

    // 年間ランキングを取得（強制的にサーバーから最新データを取得）
    const rankingData = await getYearlyRanking(year, 50, true)

    if (!rankingData.ranking || rankingData.ranking.length === 0) {
      console.log("ランキングデータが空です")
      return false
    }

    // Firestoreに保存
    return await storeRanking("yearly", year, undefined, rankingData.ranking, updatedBy)
  } catch (error) {
    console.error("年間ランキングの再計算と保存に失敗しました:", error)
    return false
  }
}
