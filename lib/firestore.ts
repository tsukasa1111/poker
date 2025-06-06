import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
  Timestamp, // Timestamp をインポート
  type QuerySnapshot,
  type DocumentData,
  type DocumentSnapshot, // getDoc の戻り値の型付けのため
  type QueryDocumentSnapshot, // snapshot.docs の要素の型付けのため
} from "firebase/firestore"
import { db } from "./firebase"
import { getDataWithCache, updateMemoryCache, clearCache } from "./cache-utils"
import {
  recalculateAndStoreMonthlyRanking, // 追加
  recalculateAndStoreYearlyRanking, // 追加
} from "./ranking-store"
import { showToast } from "./toast" // 追加

// User型を定義
export interface User {
  id: string
  username: string
  displayName: string
  chips: number
  totalEarnings: number
  totalLosses: number
  lastUpdated: Date | Timestamp // Firestore Timestamp も許容
  createdAt: Date | Timestamp // Firestore Timestamp も許容
  notes: string
  role: string
  passwordHash?: string
  monthlyTotals?: Record<string, number>
}

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
  timestamp: Date | Timestamp // Firestore Timestamp も許容
  date: string // YYYY-MM-DD形式
}

export type DailySummary = {
  id: string
  userId: string
  username: string
  date: string
  startChips: number
  endChips: number
  netChange: number
  transactions: number
  createdAt: Date | Timestamp
  lastUpdated: Date | Timestamp
}

const safeToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Timestamp) {
    // Timestamp インスタンスを先にチェック
    return timestamp.toDate()
  }
  if (timestamp && typeof timestamp.toDate === "function") {
    // Firestore V8 以前の Timestamp 互換
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  if (typeof timestamp === "number") {
    return new Date(timestamp)
  }
  // console.warn("safeToDate: Could not convert timestamp, returning new Date(). Input:", timestamp);
  return new Date()
}

// searchUserByUsername, getAllUsers, addChipHistory, updateDailySummary は前回の修正から変更なし
export const searchUserByUsername = async (username: string, forceRefresh = false): Promise<User | null> => {
  try {
    const { snapshot, source } = await getDataWithCache(
      "users",
      [where("username", "==", username)],
      `user_${username}`,
      8 * 60 * 60 * 1000,
      forceRefresh,
    )

    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0] as QueryDocumentSnapshot<
        Omit<User, "id" | "lastUpdated" | "createdAt"> & { lastUpdated: Timestamp; createdAt: Timestamp }
      >
      const userData = docSnap.data()
      return {
        id: docSnap.id,
        ...userData,
        lastUpdated: safeToDate(userData.lastUpdated),
        createdAt: safeToDate(userData.createdAt),
      } as User // キャストは残すが、より安全な型付けを検討
    } else {
      return null
    }
  } catch (error) {
    console.error("ユーザー検索エラー:", error)
    return null
  }
}

export const getAllUsers = async (forceRefresh = false): Promise<User[]> => {
  try {
    console.log("Firestore: Fetching all users...")
    const { snapshot, source } = await getDataWithCache(
      "users",
      [orderBy("username")],
      "all_users",
      8 * 60 * 60 * 1000,
      forceRefresh,
    )

    const users: User[] = []
    snapshot.forEach((doc) => {
      const docSnap = doc as QueryDocumentSnapshot<
        Omit<User, "id" | "lastUpdated" | "createdAt"> & { lastUpdated: Timestamp; createdAt: Timestamp }
      >
      const userData = docSnap.data()
      users.push({
        id: doc.id,
        ...userData,
        lastUpdated: safeToDate(userData.lastUpdated),
        createdAt: safeToDate(userData.createdAt),
      } as User) // キャストは残すが、より安全な型付けを検討
    })
    console.log(`Firestore: Successfully fetched ${users.length} users (source: ${source})`)
    return users
  } catch (error) {
    console.error("Firestore error fetching users:", error)
    if (error instanceof Error) {
      throw new Error(`Firestoreからのユーザー取得エラー: ${error.message}`)
    }
    throw error
  }
}

const addChipHistory = async (
  userId: string,
  username: string,
  previousAmount: number,
  newAmount: number,
  changeAmount: number,
  type: string,
  reason: string,
  staffEmail: string,
) => {
  try {
    const chipHistoryRef = collection(db, "chipHistory")
    await addDoc(chipHistoryRef, {
      userId,
      username,
      previousAmount,
      newAmount,
      changeAmount,
      type,
      reason,
      staffEmail,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().slice(0, 10),
    })
  } catch (error) {
    console.error("チップ履歴追加エラー:", error)
  }
}

const updateDailySummary = async (
  userId: string,
  username: string,
  startChips: number,
  endChips: number,
  netChange: number,
  transactions: number,
) => {
  try {
    const date = new Date().toISOString().slice(0, 10)
    const dailySummaryRef = collection(db, "dailySummary")
    const q = query(dailySummaryRef, where("userId", "==", userId), where("date", "==", date))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      await addDoc(collection(db, "dailySummary"), {
        userId,
        username,
        date,
        startChips,
        endChips,
        netChange,
        transactions,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      })
    } else {
      querySnapshot.forEach(async (document) => {
        const docRef = doc(db, "dailySummary", document.id)
        await updateDoc(docRef, {
          endChips,
          netChange: document.data().netChange + netChange,
          transactions: document.data().transactions + transactions,
          lastUpdated: serverTimestamp(),
        })
      })
    }
  } catch (error) {
    console.error("日毎のサマリー更新エラー:", error)
  }
}

export const updateUserChips = async (
  userId: string,
  amount: number,
  type: "add" | "subtract",
  reason: string,
  staffEmail: string,
): Promise<boolean> => {
  // userId の有効性を関数の冒頭で厳密にチェック
  if (typeof userId !== "string" || userId.trim() === "") {
    console.error("[updateUserChips] Invalid userId provided. Aborting update. userId:", userId)
    return false
  }
  // デバッグ用に引数をログ出力
  // console.log("[updateUserChips] Called with:", { userId, amount, type, reason, staffEmail });

  try {
    const userRef = doc(db, "users", userId) // userId はここで有効な文字列であることが保証される
    const docSnap: DocumentSnapshot<DocumentData> = await getDoc(userRef)

    if (!docSnap.exists()) {
      console.error(`[updateUserChips] User with ID ${userId} not found.`)
      return false
    }

    const userData = docSnap.data()
    if (!userData) {
      console.error(`[updateUserChips] User data is undefined for ID ${userId}, though document exists.`)
      return false
    }

    let currentUsername = userData.username
    if (typeof currentUsername !== "string" || currentUsername.trim() === "") {
      console.warn(
        `[updateUserChips] userData.username is not a valid string for userId ${userId}. Found: type=${typeof userData.username}, value="${userData.username}". Using fallback: "user_${userId}".`,
      )
      currentUsername = `user_${userId}`
    }

    const currentChips = userData.chips || 0
    let newChips = type === "add" ? currentChips + amount : currentChips - amount
    if (newChips < 0) {
      newChips = 0
    }

    let totalEarnings = userData.totalEarnings || 0
    let totalLosses = userData.totalLosses || 0
    if (type === "add") {
      totalEarnings += amount
    } else {
      totalLosses += amount
    }

    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const updateData: any = {
      chips: newChips,
      totalEarnings,
      totalLosses,
      lastUpdated: serverTimestamp(),
    }
    const delta = type === "add" ? amount : -amount
    updateData[`monthlyTotals.${currentYearMonth}`] = increment(delta)

    // console.log("[updateUserChips] Updating document with data:", updateData);
    await updateDoc(userRef, updateData)

    await addChipHistory(userId, currentUsername, currentChips, newChips, amount, type, reason, staffEmail)
    await updateDailySummary(userId, currentUsername, currentChips, newChips, type === "add" ? amount : -amount, 1)

    clearCache(`user_${currentUsername}`)
    try {
      const { snapshot, source } = await getDataWithCache(
        "users",
        [orderBy("username")],
        "all_users",
        8 * 60 * 60 * 1000,
        false,
      )
      if (source === "memory" || source === "cache") {
        const updatedDocs = snapshot.docs.map((doc) => {
          if (doc.id === userId) {
            const docData = doc.data()
            const updatedDocData = {
              ...docData,
              chips: newChips,
              totalEarnings,
              totalLosses,
              lastUpdated: Timestamp.fromDate(now), // JS Date を Firestore Timestamp に変換
              monthlyTotals: {
                ...(docData.monthlyTotals || {}),
                [currentYearMonth]: (docData.monthlyTotals?.[currentYearMonth] || 0) + delta,
              },
            }
            return {
              ...doc,
              id: doc.id,
              exists: doc.exists,
              data: () => updatedDocData,
              get: doc.get,
              ref: doc.ref,
              metadata: doc.metadata,
            } as QueryDocumentSnapshot<DocumentData>
          }
          return doc as QueryDocumentSnapshot<DocumentData>
        })

        const updatedSnapshot: QuerySnapshot<DocumentData> = {
          ...snapshot,
          docs: updatedDocs,
          empty: updatedDocs.length === 0,
          size: updatedDocs.length,
          docChanges: () => snapshot.docChanges(), // 関数として呼び出す
          forEach: (callback: (result: QueryDocumentSnapshot<DocumentData>) => void) => {
            updatedDocs.forEach(callback)
          },
        }
        updateMemoryCache("all_users", updatedSnapshot)
        console.log(`[Cache] ユーザー ${currentUsername} のチップ更新に伴いキャッシュを更新しました`)
      }
    } catch (cacheError) {
      console.error("[updateUserChips] Cache update error:", cacheError)
    }

    // チップ更新後にランキングを再計算して保存
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    try {
      showToast.info("ランキングを更新中: チップ更新に伴いランキングを再計算しています...")
      const monthlySuccess = await recalculateAndStoreMonthlyRanking(currentYear, currentMonth, staffEmail)
      const yearlySuccess = await recalculateAndStoreYearlyRanking(currentYear, staffEmail)

      if (monthlySuccess && yearlySuccess) {
        showToast.success("ランキング更新完了: 月間および年間ランキングが最新の状態に更新されました。")
      } else {
        showToast.error("ランキング更新失敗: ランキングの更新中にエラーが発生しました。")
      }
    } catch (rankingError) {
      console.error("チップ更新後のランキング再計算エラー:", rankingError)
      showToast.error(
        `ランキング更新エラー: ${rankingError instanceof Error ? rankingError.message : String(rankingError)}`,
      )
    }

    return true
  } catch (error: any) {
    console.error(
      "[updateUserChips] Error during chip update process for userId:",
      userId,
      "Error:",
      error.message,
      error.stack,
      error,
    )
    return false
  }
}

// getMonthlyRanking, getUserChipHistory, getUserDailySummary, initializeFirestore, updateUser, createUser は前回の修正から変更なし
export const getMonthlyRanking = async (maxResults = 10): Promise<User[]> => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, orderBy("chips", "desc"), limit(maxResults))
    const querySnapshot = await getDocs(q)
    const users: User[] = []
    querySnapshot.forEach((doc) => {
      const docSnap = doc as QueryDocumentSnapshot<
        Omit<User, "id" | "lastUpdated" | "createdAt"> & { lastUpdated: Timestamp; createdAt: Timestamp }
      >
      const userData = docSnap.data()
      users.push({
        id: doc.id,
        ...userData,
        lastUpdated: safeToDate(userData.lastUpdated),
        createdAt: safeToDate(userData.createdAt),
      } as User)
    })
    return users
  } catch (error) {
    console.error("ランキング取得エラー:", error)
    return []
  }
}

export const getUserChipHistory = async (userId: string, maxResults = 10): Promise<ChipHistory[]> => {
  try {
    const { snapshot, source } = await getDataWithCache(
      "chipHistory",
      [where("userId", "==", userId)],
      `history_${userId}`,
      8 * 60 * 60 * 1000,
      false,
    )
    const history: ChipHistory[] = []
    snapshot.forEach((doc) => {
      const docSnap = doc as QueryDocumentSnapshot<Omit<ChipHistory, "id" | "timestamp"> & { timestamp: Timestamp }>
      const historyData = docSnap.data()
      history.push({
        id: doc.id,
        ...historyData,
        timestamp: safeToDate(historyData.timestamp),
        date: historyData.date, // date は元々 string なのでそのまま
      } as ChipHistory)
    })
    return history
      .sort((a, b) => safeToDate(b.timestamp).getTime() - safeToDate(a.timestamp).getTime())
      .slice(0, maxResults)
  } catch (error) {
    console.error("チップ履歴取得エラー:", error)
    return []
  }
}

export const getUserDailySummary = async (userId: string, days = 7): Promise<DailySummary[]> => {
  try {
    const { snapshot, source } = await getDataWithCache(
      "dailySummary",
      [where("userId", "==", userId)],
      `summary_${userId}`,
      8 * 60 * 60 * 1000,
      false,
    )
    const summaries: DailySummary[] = [] // DailySummary 型は変更なし
    snapshot.forEach((doc) => {
      const summaryData = doc.data() as Omit<DailySummary, "id">
      summaries.push({
        id: doc.id,
        ...summaryData,
      } as DailySummary)
    })
    return summaries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days)
  } catch (error) {
    console.error("日毎のサマリー取得エラー:", error)
    return []
  }
}

export const initializeFirestore = async (): Promise<boolean> => {
  try {
    const usersRef = collection(db, "users")
    await getDocs(usersRef)
    return true
  } catch (error) {
    console.error("Firestoreの初期化に失敗しました:", error)
    return false
  }
}

export const updateUser = async (userId: string, updateData: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)
    const dataToUpdate: Partial<DocumentData> = { ...updateData }
    if (updateData.lastUpdated instanceof Date) {
      dataToUpdate.lastUpdated = Timestamp.fromDate(updateData.lastUpdated)
    }
    if (updateData.createdAt instanceof Date) {
      dataToUpdate.createdAt = Timestamp.fromDate(updateData.createdAt)
    }
    await updateDoc(userRef, dataToUpdate)
  } catch (error) {
    console.error("ユーザー情報更新エラー:", error)
    throw error
  }
}

export const createUser = async (
  username: string,
  initialChips = 0,
  displayName?: string,
  notes?: string,
): Promise<User | null> => {
  try {
    const existingUser = await searchUserByUsername(username)
    if (existingUser) {
      throw new Error("このユーザー名は既に使用されています")
    }

    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const monthlyTotals: Record<string, number> = {}
    if (initialChips > 0) {
      monthlyTotals[currentYearMonth] = initialChips
    }

    const newUserDocData = {
      username,
      displayName: displayName || username,
      chips: initialChips,
      totalEarnings: initialChips > 0 ? initialChips : 0,
      totalLosses: 0,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
      notes: notes || "",
      role: "staff",
      monthlyTotals: monthlyTotals,
    }

    const usersRef = collection(db, "users")
    const docRef = await addDoc(usersRef, newUserDocData)
    const userId = docRef.id

    if (initialChips > 0) {
      await addChipHistory(userId, username, 0, initialChips, initialChips, "add", "初期チップ", "system")
      await updateDailySummary(userId, username, 0, initialChips, initialChips, 1)
    }

    clearCache("all_users")

    return {
      id: userId,
      ...newUserDocData,
      lastUpdated: now,
      createdAt: now,
    } as User // キャストは残すが、より安全な型付けを検討
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}
