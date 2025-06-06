import { collection, getDocs, query, getDocsFromCache, getDocsFromServer } from "firebase/firestore"
import { db } from "./firebase"

// ランキングエントリの型定義
export interface RankingEntry {
  rank: number
  userId: string
  username: string
  displayName?: string
  total: number
}

// ランキングデータの型定義
export interface RankingData {
  updatedAt: Date | null
  ranking: RankingEntry[]
  source?: "cache" | "server" | "default" // データソースを追加
}

/**
 * 月次ランキングを取得する
 * @param year 年（指定しない場合は現在の年）
 * @param month 月（指定しない場合は現在の月）
 * @param maxResults 取得する最大件数
 * @param forceRefresh キャッシュを無視して強制的に最新データを取得するかどうか
 * @returns ランキングデータ
 */
export const getMonthlyRanking = async (
  year?: number,
  month?: number,
  maxResults = 20,
  forceRefresh = false,
): Promise<RankingData> => {
  try {
    // 年月を取得
    const now = new Date()
    const targetYear = year || now.getFullYear()
    const targetMonth = month || now.getMonth() + 1
    const targetYearMonth = `${targetYear}-${String(targetMonth).padStart(2, "0")}`

    console.log(`[Firestore] 月次ランキングを取得: ${targetYearMonth}`)

    // Firestoreからユーザーデータを取得
    const usersRef = collection(db, "users")
    const q = query(usersRef)

    let querySnapshot
    let dataSource: "cache" | "server" | "default" = "default"

    if (forceRefresh) {
      // 強制的にサーバーから最新データを取得
      console.log("[Firestore Server] サーバーから強制的に最新データを取得します")
      querySnapshot = await getDocsFromServer(q)
      dataSource = "server"
    } else {
      try {
        // まずキャッシュから取得を試みる
        console.log("[Firestore Cache] キャッシュからデータ取得を試みます")
        querySnapshot = await getDocsFromCache(q)
        console.log("[Firestore Cache] ✅ キャッシュからデータを取得しました")
        dataSource = "cache"
      } catch (cacheError) {
        // キャッシュになければサーバーから取得
        console.log("[Firestore Server] キャッシュにデータがないため、サーバーから取得します", cacheError)
        querySnapshot = await getDocs(q)
        dataSource = "server"
      }
    }

    if (querySnapshot.empty) {
      console.log("ユーザーデータが見つかりません")
      return {
        updatedAt: new Date(),
        ranking: [],
        source: dataSource,
      }
    }

    // ユーザーデータを配列に変換
    const users: any[] = []
    querySnapshot.forEach((doc) => {
      const userData = doc.data()
      users.push({
        id: doc.id,
        ...userData,
        lastUpdated: userData.lastUpdated?.toDate(),
        createdAt: userData.createdAt?.toDate(),
      })
    })

    console.log(`[Firestore ${dataSource}] ${users.length}人のユーザーデータを取得しました`)
    console.log(`対象の年月: ${targetYearMonth}`)

    // 月次サマリーでフィルタリングとソート
    const ranking = users
      .map((user) => {
        // monthlyTotalsから該当する月のデータを取得
        let monthlyTotal = 0

        if (user.monthlyTotals && user.monthlyTotals[targetYearMonth] !== undefined) {
          monthlyTotal = user.monthlyTotals[targetYearMonth]
          console.log(`ユーザー ${user.username} の ${targetYearMonth} のデータ: ${monthlyTotal}`)
        } else {
          // 該当する月のデータがない場合は0を使用
          console.log(`ユーザー ${user.username} の ${targetYearMonth} のデータなし`)
        }

        return {
          rank: 0, // 仮の値、後で計算
          userId: user.id,
          username: user.username || "",
          displayName: user.displayName || "",
          total: monthlyTotal,
        }
      })
      // 月次データでソート（降順）
      .sort((a, b) => b.total - a.total)
      // ランクを計算
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
      // 上位N件を取得
      .slice(0, maxResults)

    return {
      updatedAt: new Date(),
      ranking,
      source: dataSource,
    }
  } catch (error) {
    console.error("月次ランキング取得エラー:", error)
    // エラーメッセージをより詳細に
    const errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    throw new Error(`月次ランキング取得エラー: ${errorMessage}`)
  }
}

/**
 * 年次ランキングを取得する
 * @param year 年（指定しない場合は現在の年）
 * @param maxResults 取得する最大件数
 * @param forceRefresh キャッシュを無視して強制的に最新データを取得するかどうか
 * @returns ランキングデータ
 */
export const getYearlyRanking = async (year?: number, maxResults = 20, forceRefresh = false): Promise<RankingData> => {
  try {
    // 年を取得
    const currentYear = year || new Date().getFullYear()
    console.log(`[Firestore] 年次ランキングを取得: ${currentYear}年`)

    // Firestoreからユーザーデータを取得
    const usersRef = collection(db, "users")
    const q = query(usersRef) // 年間ランキングでは全ユーザーのチップ変動を集計するため、チップ数での絞り込みはしない

    let querySnapshot
    let dataSource: "cache" | "server" | "default" = "default"

    if (forceRefresh) {
      console.log("[Firestore Server] 年間ランキング: サーバーから強制的に最新データを取得します")
      querySnapshot = await getDocsFromServer(q)
      dataSource = "server"
    } else {
      try {
        console.log("[Firestore Cache] 年間ランキング: キャッシュからデータ取得を試みます")
        querySnapshot = await getDocsFromCache(q)
        console.log("[Firestore Cache] ✅ 年間ランキング: キャッシュからデータを取得しました")
        dataSource = "cache"
      } catch (cacheError) {
        console.log(
          "[Firestore Server] 年間ランキング: キャッシュにデータがないため、サーバーから取得します",
          cacheError,
        )
        querySnapshot = await getDocs(q)
        dataSource = "server"
      }
    }

    if (querySnapshot.empty) {
      console.log("ユーザーデータが見つかりません")
      return {
        updatedAt: new Date(),
        ranking: [],
        source: dataSource,
      }
    }

    const users: any[] = []
    querySnapshot.forEach((doc) => {
      const userData = doc.data()
      users.push({
        id: doc.id,
        ...userData,
        // lastUpdated と createdAt は Date オブジェクトに変換しておく
        lastUpdated: userData.lastUpdated?.toDate ? userData.lastUpdated.toDate() : new Date(userData.lastUpdated),
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt),
      })
    })

    console.log(`[Firestore ${dataSource}] 年間ランキング: ${users.length}人のユーザーデータを取得しました`)

    // 年次サマリーを計算
    const ranking = users
      .map((user) => {
        let yearTotal = 0
        if (user.monthlyTotals) {
          // monthlyTotals は { "YYYY-MM": amount } の形式と想定
          for (const yearMonth in user.monthlyTotals) {
            if (yearMonth.startsWith(String(currentYear))) {
              yearTotal += Number(user.monthlyTotals[yearMonth] || 0)
            }
          }
        }
        // console.log(`ユーザー ${user.username} の ${currentYear}年の合計チップ変動: ${yearTotal}`) // デバッグ用
        return {
          rank: 0, // 仮の値、後で計算
          userId: user.id,
          username: user.username || "",
          displayName: user.displayName || user.username, // displayName がなければ username を使用
          total: yearTotal,
        }
      })
      // .filter((entry) => entry.total !== 0) // チップ変動が0のユーザーはランキングから除外する場合 -> この行を削除
      .sort((a, b) => b.total - a.total) // 年間合計でソート（降順）
      .map((entry, index) => ({
        // ランクを計算
        ...entry,
        rank: index + 1,
      }))
      .slice(0, maxResults) // 上位N件を取得

    return {
      updatedAt: new Date(),
      ranking,
      source: dataSource,
    }
  } catch (error) {
    console.error("年次ランキング取得エラー:", error)
    const errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    throw new Error(`年次ランキング取得エラー: ${errorMessage}`)
  }
}

/**
 * 月次ランキングを再計算する
 */
export const recalcMonthlyRanking = async (): Promise<void> => {
  try {
    console.log("月次ランキングを再計算します")
    // 実際の再計算ロジックはここに実装
    // 現在はダミー実装
    return Promise.resolve()
  } catch (error) {
    console.error("ランキング再計算エラー:", error)
    throw new Error("ランキングの再計算に失敗しました")
  }
}
