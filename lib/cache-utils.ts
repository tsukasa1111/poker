import { collection, getDocsFromCache, getDocsFromServer, query, type QueryConstraint } from "firebase/firestore"
import { db } from "./firebase"

// キャッシュ有効期限の設定（ミリ秒）- すべて8時間に統一
const CACHE_EXPIRY = {
  USERS: 8 * 60 * 60 * 1000, // ユーザーデータは8時間
  RANKINGS: 8 * 60 * 60 * 1000, // ランキングも8時間に変更
  HISTORY: 8 * 60 * 60 * 1000, // 履歴も8時間に変更
}

// キャッシュタイムスタンプを保存するオブジェクト
const cacheTimestamps: Record<string, number> = {}

// メモリ内キャッシュを保存するオブジェクト
const memoryCache: Record<string, { data: any; timestamp: number }> = {}

// キャッシュの状態を保存するオブジェクト
export const cacheStatus: Record<string, { source: "cache" | "server" | "memory"; timestamp: number }> = {}

/**
 * 様々な形式のタイムスタンプを安全にDateオブジェクトに変換する関数
 * @param timestamp 変換するタイムスタンプ（Firestoreのタイムスタンプ、Date、数値など）
 * @returns Dateオブジェクト、変換できない場合は現在の日時
 */
export function safeToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date() // タイムスタンプがない場合は現在の日時を返す
  }

  try {
    // Firestoreのタイムスタンプの場合（toDate()メソッドがある）
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      return timestamp.toDate()
    }

    // すでにDateオブジェクトの場合
    if (timestamp instanceof Date) {
      return timestamp
    }

    // 数値（ミリ秒）の場合
    if (typeof timestamp === "number") {
      return new Date(timestamp)
    }

    // 文字列の場合
    if (typeof timestamp === "string") {
      return new Date(timestamp)
    }

    // オブジェクトで seconds と nanoseconds プロパティがある場合（シリアライズされたFirestoreタイムスタンプ）
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
    }

    // その他の場合は現在の日時を返す
    return new Date()
  } catch (error) {
    console.error("タイムスタンプの変換エラー:", error)
    return new Date() // エラーが発生した場合は現在の日時を返す
  }
}

/**
 * キャッシュファーストでFirestoreからデータを取得する関数
 * @param collectionPath コレクションパス
 * @param queryConstraints クエリ制約
 * @param cacheKey キャッシュキー
 * @param expiryTime キャッシュの有効期限（ミリ秒）
 * @param forceRefresh 強制的に最新データを取得するかどうか
 * @returns クエリスナップショットとデータソース
 */
export async function getDataWithCache(
  collectionPath: string,
  queryConstraints: QueryConstraint[] = [],
  cacheKey: string,
  expiryTime: number = CACHE_EXPIRY.USERS,
  forceRefresh = false,
) {
  // 現在の時刻を取得
  const now = Date.now()

  // メモリキャッシュをチェック（強制更新でなければ）
  if (!forceRefresh && memoryCache[cacheKey] && now - memoryCache[cacheKey].timestamp < expiryTime) {
    console.log(
      `[Cache] メモリキャッシュからデータを取得: ${cacheKey} (有効期限まであと${Math.round((memoryCache[cacheKey].timestamp + expiryTime - now) / 60000)}分)`,
    )
    cacheStatus[cacheKey] = { source: "memory", timestamp: memoryCache[cacheKey].timestamp }
    return { snapshot: memoryCache[cacheKey].data, source: "memory" as const }
  }

  // コレクションへの参照を取得
  const collectionRef = collection(db, collectionPath)
  const q = query(collectionRef, ...queryConstraints)

  // キャッシュが有効かどうかをチェック
  const isCacheValid = cacheTimestamps[cacheKey] && now - cacheTimestamps[cacheKey] < expiryTime

  try {
    // 強制更新が指定されている場合、またはキャッシュが無効な場合はサーバーから取得
    if (forceRefresh || !isCacheValid) {
      console.log(
        `[Firestore] サーバーからデータを取得: ${collectionPath} (キー: ${cacheKey})${forceRefresh ? " (強制更新)" : ""}`,
      )
      const snapshot = await getDocsFromServer(q)

      // キャッシュタイムスタンプを更新
      cacheTimestamps[cacheKey] = now
      cacheStatus[cacheKey] = { source: "server", timestamp: now }

      // メモリキャッシュに保存
      memoryCache[cacheKey] = { data: snapshot, timestamp: now }

      return { snapshot, source: "server" as const }
    }

    // まずキャッシュから取得を試みる
    try {
      console.log(`[Firestore] キャッシュからデータ取得を試行: ${collectionPath} (キー: ${cacheKey})`)
      const snapshot = await getDocsFromCache(q)
      console.log(`[Firestore] ✅ キャッシュからデータを取得しました: ${collectionPath}`)

      cacheStatus[cacheKey] = { source: "cache", timestamp: now }

      // メモリキャッシュも更新
      memoryCache[cacheKey] = { data: snapshot, timestamp: now }

      return { snapshot, source: "cache" as const }
    } catch (cacheError) {
      // キャッシュになければサーバーから取得
      console.log(`[Firestore] キャッシュにデータがないため、サーバーから取得: ${collectionPath}`, cacheError)
      const snapshot = await getDocsFromServer(q)

      // キャッシュタイムスタンプを更新
      cacheTimestamps[cacheKey] = now
      cacheStatus[cacheKey] = { source: "server", timestamp: now }

      // メモリキャッシュに保存
      memoryCache[cacheKey] = { data: snapshot, timestamp: now }

      return { snapshot, source: "server" as const }
    }
  } catch (error) {
    console.error(`[Firestore] データ取得エラー: ${collectionPath}`, error)
    throw error
  }
}

/**
 * メモリキャッシュを直接更新する関数
 * @param cacheKey キャッシュキー
 * @param data 更新するデータ
 */
export function updateMemoryCache(cacheKey: string, data: any) {
  const now = Date.now()
  memoryCache[cacheKey] = { data, timestamp: now }
  cacheTimestamps[cacheKey] = now
  cacheStatus[cacheKey] = { source: "memory", timestamp: now }
  console.log(`[Cache] メモリキャッシュを更新しました: ${cacheKey}`)
}

/**
 * メモリキャッシュをクリアする関数
 * @param cacheKey 特定のキャッシュキー（指定しない場合はすべてクリア）
 */
export function clearCache(cacheKey?: string) {
  if (cacheKey) {
    delete cacheTimestamps[cacheKey]
    delete memoryCache[cacheKey]
    delete cacheStatus[cacheKey]
    console.log(`[Cache] キャッシュをクリアしました: ${cacheKey}`)
  } else {
    Object.keys(cacheTimestamps).forEach((key) => {
      delete cacheTimestamps[key]
      delete memoryCache[key]
      delete cacheStatus[key]
    })
    console.log(`[Cache] すべてのキャッシュをクリアしました`)
  }
}

/**
 * キャッシュの状態を取得する関数
 */
export function getCacheStatus() {
  return Object.entries(cacheStatus).map(([key, status]) => ({
    key,
    source: status.source,
    age: Math.round((Date.now() - status.timestamp) / 1000), // 秒単位の経過時間
    timestamp: new Date(status.timestamp).toLocaleString(),
  }))
}

/**
 * キャッシュの有効期限を取得する関数
 */
export function getCacheExpiry() {
  return {
    USERS: CACHE_EXPIRY.USERS / (60 * 60 * 1000), // 時間単位
    RANKINGS: CACHE_EXPIRY.RANKINGS / (60 * 60 * 1000),
    HISTORY: CACHE_EXPIRY.HISTORY / (60 * 60 * 1000),
  }
}
