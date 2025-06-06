"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "../lib/firebase"

// ViewerUserの型定義
export interface ViewerUser {
  username: string
  password: string
  createdAt: number
}

// ViewerUsersContextの型定義
interface ViewerUsersContextType {
  viewerUsers: ViewerUser[]
  loading: boolean
  error: string | null
  addUser: (username: string, password: string) => Promise<boolean>
}

// ViewerUsersContextの作成
const ViewerUsersContext = createContext<ViewerUsersContextType | undefined>(undefined)

// ViewerUsersProviderの型定義
interface ViewerUsersProviderProps {
  children: ReactNode
}

// ViewerUsersProviderコンポーネント
export const ViewerUsersProvider: React.FC<ViewerUsersProviderProps> = ({ children }) => {
  const [viewerUsers, setViewerUsers] = useState<ViewerUser[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 初回マウント時にviewerUsers/listを取得
  useEffect(() => {
    const fetchViewerUsers = async () => {
      try {
        // セッションストレージからデータを取得
        const cachedData = sessionStorage.getItem("viewerUsers")
        if (cachedData) {
          setViewerUsers(JSON.parse(cachedData))
          setLoading(false)
          return
        }

        // Firestoreからデータを取得
        const docRef = doc(db, "viewerUsers", "list")
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          const users = data.users || []
          setViewerUsers(users)
          // セッションストレージにデータを保存
          sessionStorage.setItem("viewerUsers", JSON.stringify(users))
        } else {
          // ドキュメントが存在しない場合は空の配列を初期化
          await setDoc(doc(db, "viewerUsers", "list"), { users: [] })
          setViewerUsers([])
          sessionStorage.setItem("viewerUsers", JSON.stringify([]))
        }
      } catch (err) {
        console.error("ViewerUsers取得エラー:", err)
        setError("ユーザー一覧の取得に失敗しました")
      } finally {
        setLoading(false)
      }
    }

    fetchViewerUsers()
  }, [])

  // ユーザーを追加する関数（楽観的更新＋バッチ書き込み）
  const addUser = async (username: string, password: string): Promise<boolean> => {
    try {
      // ユーザー名の重複チェック（ローカルで完結）
      const isDuplicate = viewerUsers.some((user) => user.username === username)
      if (isDuplicate) {
        setError("そのユーザー名は既に使用されています")
        return false
      }

      // 新しいユーザーオブジェクト
      const newUser: ViewerUser = {
        username,
        password,
        createdAt: Date.now(),
      }

      // 楽観的更新（UIを即時更新）
      const updatedUsers = [...viewerUsers, newUser]
      setViewerUsers(updatedUsers)
      sessionStorage.setItem("viewerUsers", JSON.stringify(updatedUsers))

      // Firestoreに書き込み
      const docRef = doc(db, "viewerUsers", "list")
      await setDoc(docRef, { users: updatedUsers }, { merge: true })

      return true
    } catch (err) {
      console.error("ユーザー追加エラー:", err)
      // エラー時にはロールバック
      setViewerUsers(viewerUsers)
      sessionStorage.setItem("viewerUsers", JSON.stringify(viewerUsers))
      setError("ユーザーの追加に失敗しました")
      return false
    }
  }

  const value = {
    viewerUsers,
    loading,
    error,
    addUser,
  }

  return <ViewerUsersContext.Provider value={value}>{children}</ViewerUsersContext.Provider>
}

// カスタムフック
export const useViewerUsers = (): ViewerUsersContextType => {
  const context = useContext(ViewerUsersContext)
  if (context === undefined) {
    throw new Error("useViewerUsers must be used within a ViewerUsersProvider")
  }
  return context
}
