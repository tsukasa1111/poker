"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, type QuerySnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types"

export function useRealtimeUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setLoading(true)

    try {
      // usersコレクションに対するクエリを作成
      const usersRef = collection(db, "users")
      const q = query(usersRef, orderBy("username"))

      // リアルタイムリスナーを設定
      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          // 初回読み込み時は全ユーザーを設定
          if (loading) {
            const allUsers: User[] = []
            snapshot.forEach((doc) => {
              const userData = doc.data()
              // monthlyTotals フィールドがない場合は空のオブジェクトを設定
              if (!userData.monthlyTotals) {
                userData.monthlyTotals = {}
              }
              allUsers.push({
                id: doc.id,
                ...userData,
                lastUpdated: userData.lastUpdated?.toDate(),
                createdAt: userData.createdAt?.toDate(),
              } as User)
            })
            setUsers(allUsers)
            setLoading(false)
            setLastUpdated(new Date())
            console.log(`[Firestore] 初回読み込み: ${allUsers.length}人のユーザーデータを取得しました`)
          } else {
            // 差分更新の処理
            snapshot.docChanges().forEach((change) => {
              const userData = change.doc.data()
              // monthlyTotals フィールドがない場合は空のオブジェクトを設定
              if (!userData.monthlyTotals) {
                userData.monthlyTotals = {}
              }
              const user = {
                id: change.doc.id,
                ...userData,
                lastUpdated: userData.lastUpdated?.toDate(),
                createdAt: userData.createdAt?.toDate(),
              } as User

              setUsers((prevUsers) => {
                switch (change.type) {
                  case "added":
                    console.log(`[Firestore] ユーザー追加: ${user.username}`)
                    return [...prevUsers, user]
                  case "modified":
                    console.log(`[Firestore] ユーザー更新: ${user.username}`)
                    return prevUsers.map((u) => (u.id === user.id ? user : u))
                  case "removed":
                    console.log(`[Firestore] ユーザー削除: ${user.username}`)
                    return prevUsers.filter((u) => u.id !== user.id)
                  default:
                    return prevUsers
                }
              })
              setLastUpdated(new Date())
            })
          }
        },
        (err) => {
          console.error("リアルタイム更新エラー:", err)
          setError(`リアルタイム更新エラー: ${err.message}`)
          setLoading(false)
        },
      )

      // クリーンアップ関数
      return () => {
        console.log("[Firestore] リアルタイムリスナーを解除しました")
        unsubscribe()
      }
    } catch (err: any) {
      console.error("リスナー設定エラー:", err)
      setError(`リスナー設定エラー: ${err.message}`)
      setLoading(false)
    }
  }, [])

  return {
    users,
    loading,
    error,
    lastUpdated,
  }
}
