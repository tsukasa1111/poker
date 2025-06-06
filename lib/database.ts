import { ref, get, set, push, update, query, orderByChild, equalTo } from "firebase/database"
import { database } from "./firebase"

// ユーザータイプの定義
export type User = {
  id: string
  username: string
  displayName?: string
  chips: number
  totalEarnings?: number
  totalLosses?: number
  lastUpdated: Date
  createdAt: Date
  notes?: string
  // 月次サマリーを追加
  monthlyTotals?: Record<string, number> // 例: { "2025-04": 2340, "2025-05": 1200 }
}

// チップ履歴タイプの定義
export type ChipHistory = {
  id: string
  userId: string
  username: string
  previousAmount: number
  newAmount: number
  changeAmount: number
  type: "add" | "subtract"
  reason: string
  staffEmail: string
  timestamp: Date
  date: string // YYYY-MM-DD形式
}

// 日毎のサマリータイプの定義
export type DailySummary = {
  id: string
  userId: string
  username: string
  date: string // YYYY-MM-DD形式
  startChips: number
  endChips: number
  netChange: number
  transactions: number
}

// データベースの初期化
export const initializeDatabase = async () => {
  try {
    // ルートノードを確認
    const rootRef = ref(database)
    const snapshot = await get(rootRef)

    // データベースが空の場合は初期構造を作成
    if (!snapshot.exists()) {
      const initialData = {
        users: {},
        chipHistory: {},
        dailySummary: {},
      }
      await set(rootRef, initialData)
      console.log("データベース構造を初期化しました")
    }
    return true
  } catch (error) {
    console.error("データベースの初期化に失敗しました:", error)
    return false
  }
}

// ユーザーをユーザー名で検索
export const searchUserByUsername = async (username: string): Promise<User | null> => {
  try {
    // まず、usersノードが存在するか確認
    const usersRef = ref(database, "users")
    const usersSnapshot = await get(usersRef)

    if (!usersSnapshot.exists()) {
      // usersノードが存在しない場合は空のオブジェクトを作成
      await set(usersRef, {})
    }

    const usernameQuery = query(usersRef, orderByChild("username"), equalTo(username))
    const snapshot = await get(usernameQuery)

    if (!snapshot.exists()) {
      return null
    }

    // 最初のマッチしたユーザーを取得
    const userData: any = Object.entries(snapshot.val())[0][1]
    const userId = Object.keys(snapshot.val())[0]

    return {
      id: userId,
      ...userData,
      lastUpdated: new Date(userData.lastUpdated),
      createdAt: new Date(userData.createdAt),
    }
  } catch (error) {
    console.error("Error searching user:", error)
    throw new Error("ユーザー検索中にエラーが発生しました。データベースへのアクセス権限がない可能性があります。")
  }
}

// 全ユーザーを取得
export const getAllUsers = async (): Promise<User[]> => {
  try {
    // まず、usersノードが存在するか確認
    const usersRef = ref(database, "users")
    const usersSnapshot = await get(usersRef)

    if (!usersSnapshot.exists()) {
      // usersノードが存在しない場合は空のオブジェクトを作成
      await set(usersRef, {})
      return []
    }

    const snapshot = await get(usersRef)

    if (!snapshot.exists()) {
      return []
    }

    const users: User[] = []
    snapshot.forEach((childSnapshot) => {
      const userData: any = childSnapshot.val()
      users.push({
        id: childSnapshot.key as string,
        ...userData,
        lastUpdated: new Date(userData.lastUpdated),
        createdAt: new Date(userData.createdAt),
      })
    })

    // ユーザー名でソート
    return users.sort((a, b) => a.username.localeCompare(b.username))
  } catch (error) {
    console.error("Error getting all users:", error)
    throw new Error("ユーザー一覧の取得に失敗しました。データベースへのアクセス権限がない可能性があります。")
  }
}

// 新規ユーザーの作成
export const createUser = async (
  username: string,
  initialChips = 0,
  displayName?: string,
  notes?: string,
): Promise<User | null> => {
  try {
    // ユーザー名の重複チェック
    const existingUser = await searchUserByUsername(username)
    if (existingUser) {
      throw new Error("このユーザー名は既に使用されています")
    }

    // usersノードが存在するか確認
    const usersRef = ref(database, "users")
    const usersSnapshot = await get(usersRef)

    if (!usersSnapshot.exists()) {
      // usersノードが存在しない場合は空のオブジェクトを作成
      await set(usersRef, {})
    }

    const now = new Date()
    const timestamp = now.getTime()

    const newUser = {
      username,
      displayName: displayName || username,
      chips: initialChips,
      totalEarnings: initialChips > 0 ? initialChips : 0,
      totalLosses: 0,
      lastUpdated: timestamp,
      createdAt: timestamp,
      notes: notes || "",
    }

    const newUserRef = push(usersRef)
    await set(newUserRef, newUser)
    const userId = newUserRef.key as string

    // 初期チップがある場合は履歴に記録
    if (initialChips > 0) {
      await addChipHistory(userId, username, 0, initialChips, initialChips, "add", "初期チップ", "system")

      // 日毎のサマリーを更新
      await updateDailySummary(userId, username, 0, initialChips, initialChips, 1)
    }

    return {
      id: userId,
      ...newUser,
      lastUpdated: now,
      createdAt: now,
    }
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

// チップ履歴を追加
const addChipHistory = async (
  userId: string,
  username: string,
  previousAmount: number,
  newAmount: number,
  changeAmount: number,
  type: "add" | "subtract",
  reason: string,
  staffEmail: string,
) => {
  try {
    // chipHistoryノードが存在するか確認
    const historyRef = ref(database, "chipHistory")
    const historySnapshot = await get(historyRef)

    if (!historySnapshot.exists()) {
      // chipHistoryノードが存在しない場合は空のオブジェクトを作成
      await set(historyRef, {})
    }

    const now = new Date()
    const timestamp = now.getTime()
    const dateStr = now.toISOString().split("T")[0] // YYYY-MM-DD形式

    const newHistoryRef = push(historyRef)
    await set(newHistoryRef, {
      userId,
      username,
      previousAmount,
      newAmount,
      changeAmount,
      type,
      reason,
      staffEmail,
      timestamp,
      date: dateStr,
    })
  } catch (error) {
    console.error("Error adding chip history:", error)
    throw error
  }
}

// 日毎のサマリーを更新
const updateDailySummary = async (
  userId: string,
  username: string,
  startChips: number,
  endChips: number,
  netChange: number,
  transactions: number,
) => {
  try {
    // dailySummaryノードが存在するか確認
    const summaryRef = ref(database, "dailySummary")
    const summarySnapshot = await get(summaryRef)

    if (!summarySnapshot.exists()) {
      // dailySummaryノードが存在しない場合は空のオブジェクトを作成
      await set(summaryRef, {})
    }

    const dateStr = new Date().toISOString().split("T")[0] // YYYY-MM-DD形式

    // 今日のサマリーを検索
    // 複合インデックスを使用する代わりに、userId_dateフィールドを使用
    const userSummaries = await get(query(summaryRef, orderByChild("userId"), equalTo(userId)))

    let todaySummary = null
    let summaryId = null

    if (userSummaries.exists()) {
      // ユーザーのサマリーから今日のものを探す
      userSummaries.forEach((childSnapshot) => {
        const data = childSnapshot.val()
        if (data.date === dateStr) {
          todaySummary = data
          summaryId = childSnapshot.key
        }
      })
    }

    if (!todaySummary) {
      // 新しいサマリーを作成
      const newSummaryRef = push(summaryRef)
      await set(newSummaryRef, {
        userId,
        username,
        date: dateStr,
        startChips,
        endChips,
        netChange,
        transactions,
        timestamp: new Date().getTime(),
      })
    } else {
      // 既存のサマリーを更新
      await update(ref(database, `dailySummary/${summaryId}`), {
        endChips,
        netChange: todaySummary.netChange + netChange,
        transactions: todaySummary.transactions + transactions,
        timestamp: new Date().getTime(),
      })
    }
  } catch (error) {
    console.error("Error updating daily summary:", error)
    throw error
  }
}

// ユーザーのチップを更新
export const updateUserChips = async (
  userId: string,
  amount: number,
  type: "add" | "subtract",
  reason: string,
  staffEmail: string,
): Promise<boolean> => {
  try {
    const userRef = ref(database, `users/${userId}`)
    const snapshot = await get(userRef)

    if (!snapshot.exists()) {
      return false
    }

    const userData = snapshot.val()
    const currentChips = userData.chips || 0
    const newChips = type === "add" ? currentChips + amount : currentChips - amount

    // チップ数が0未満にならないようにチェック
    if (newChips < 0) {
      return false
    }

    // 合計収益/損失の計算
    let totalEarnings = userData.totalEarnings || 0
    let totalLosses = userData.totalLosses || 0

    if (type === "add") {
      totalEarnings += amount
    } else {
      totalLosses += amount
    }

    // 現在の年月を取得（YYYY-MM形式）
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // 月次サマリーの更新用データを準備
    const monthlyTotals = userData.monthlyTotals || {}
    const currentMonthTotal = monthlyTotals[currentYearMonth] || 0
    const delta = type === "add" ? amount : -amount
    monthlyTotals[currentYearMonth] = currentMonthTotal + delta

    // ユーザーのチップ数を更新
    await update(userRef, {
      chips: newChips,
      totalEarnings,
      totalLosses,
      monthlyTotals,
      lastUpdated: new Date().getTime(),
    })

    // チップ履歴を記録
    await addChipHistory(userId, userData.username, currentChips, newChips, amount, type, reason, staffEmail)

    // 日毎のサマリーを更新
    await updateDailySummary(userId, userData.username, currentChips, newChips, type === "add" ? amount : -amount, 1)

    return true
  } catch (error) {
    console.error("Error updating chips:", error)
    return false
  }
}

// 月間ランキングを取得
export const getMonthlyRanking = async (maxResults = 10): Promise<User[]> => {
  try {
    // usersノードが存在するか確認
    const usersRef = ref(database, "users")
    const usersSnapshot = await get(usersRef)

    if (!usersSnapshot.exists()) {
      // usersノードが存在しない場合は空のオブジェクトを作成
      await set(usersRef, {})
      return []
    }

    const snapshot = await get(usersRef)

    if (!snapshot.exists()) {
      return []
    }

    const users: User[] = []
    snapshot.forEach((childSnapshot) => {
      const userData: any = childSnapshot.val()
      users.push({
        id: childSnapshot.key as string,
        ...userData,
        lastUpdated: new Date(userData.lastUpdated),
        createdAt: new Date(userData.createdAt),
      })
    })

    // チップ数でソートして上位を返す
    return users.sort((a, b) => b.chips - a.chips).slice(0, maxResults)
  } catch (error) {
    console.error("Error getting ranking:", error)
    throw new Error("ランキングの取得に失敗しました。データベースへのアクセス権限がない可能性があります。")
  }
}

// ユーザーのチップ履歴を取得
export const getUserChipHistory = async (userId: string, maxResults = 10): Promise<ChipHistory[]> => {
  try {
    // chipHistoryノードが存在するか確認
    const historyRef = ref(database, "chipHistory")
    const historySnapshot = await get(historyRef)

    if (!historySnapshot.exists()) {
      // chipHistoryノードが存在しない場合は空のオブジェクトを作成
      await set(historyRef, {})
      return []
    }

    const userQuery = query(historyRef, orderByChild("userId"), equalTo(userId))
    const snapshot = await get(userQuery)

    if (!snapshot.exists()) {
      return []
    }

    const history: ChipHistory[] = []
    snapshot.forEach((childSnapshot) => {
      const historyData: any = childSnapshot.val()
      history.push({
        id: childSnapshot.key as string,
        ...historyData,
        timestamp: new Date(historyData.timestamp),
      })
    })

    // 日時でソートして最新を返す
    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, maxResults)
  } catch (error) {
    console.error("Error getting chip history:", error)
    throw new Error("チップ履歴の取得に失敗しました。データベースへのアクセス権限がない可能性があります。")
  }
}

// 日毎のサマリーを取得
export const getUserDailySummary = async (userId: string, days = 7): Promise<DailySummary[]> => {
  try {
    // dailySummaryノードが存在するか確認
    const summaryRef = ref(database, "dailySummary")
    const summarySnapshot = await get(summaryRef)

    if (!summarySnapshot.exists()) {
      // dailySummaryノードが存在しない場合は空のオブジェクトを作成
      await set(summaryRef, {})
      return []
    }

    const userQuery = query(summaryRef, orderByChild("userId"), equalTo(userId))
    const snapshot = await get(userQuery)

    if (!snapshot.exists()) {
      return []
    }

    const summaries: DailySummary[] = []
    snapshot.forEach((childSnapshot) => {
      const summaryData: any = childSnapshot.val()
      summaries.push({
        id: childSnapshot.key as string,
        ...summaryData,
      })
    })

    // 日付でソートして最新を返す
    return summaries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days)
  } catch (error) {
    console.error("Error getting daily summary:", error)
    throw new Error("日毎サマリーの取得に失敗しました。データベースへのアクセス権限がない可能性があります。")
  }
}
