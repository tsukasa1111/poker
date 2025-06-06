import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "./firebase"
import { serverTimestamp } from "firebase/firestore"
import type { User } from "@/types"

// ユーザー情報を取得する関数
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return null
    }

    const userData = userSnap.data()
    return {
      id: userSnap.id,
      ...userData,
      lastUpdated: userData.lastUpdated?.toDate(),
      createdAt: userData.createdAt?.toDate(),
    } as User
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error)
    return null
  }
}

// ユーザー情報を更新する関数
export const updateUser = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      console.error(`ユーザーID ${userId} が見つかりません`)
      return false
    }

    // ユーザー情報を更新
    await setDoc(
      userRef,
      {
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    )

    return true
  } catch (error) {
    console.error("ユーザー情報更新エラー:", error)
    return false
  }
}
