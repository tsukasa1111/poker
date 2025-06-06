import useSWR, { mutate as globalMutate } from "swr"
import type { User } from "@/types"

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    // レスポンスがHTMLの場合（エラーページなど）
    const contentType = res.headers.get("content-type")
    if (contentType && contentType.includes("text/html")) {
      throw new Error("APIエンドポイントが見つかりません。HTMLが返されました。")
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      const error: any = new Error(errorData.message || "APIからのユーザー取得に失敗しました")
      error.status = res.status
      error.info = errorData
      throw error
    }

    return res.json()
  } catch (error) {
    console.error("Fetch error:", error)
    throw error
  }
}

export function useAllUsers() {
  const { data, error, mutate, isValidating } = useSWR<User[]>("/api/users", fetcher, {
    // 12時間 = 12 * 60 * 60 * 1000 ms
    dedupingInterval: 12 * 60 * 60 * 1000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    // エラー時の再試行を制限
    errorRetryCount: 3,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // HTMLエラーの場合は再試行しない
      if (error.message.includes("HTMLが返されました")) return

      // 3回まで再試行
      if (retryCount >= 3) return

      // 5秒後に再試行
      setTimeout(() => revalidate({ retryCount }), 5000)
    },
  })

  // 特定のユーザーのみを更新する関数
  const updateUser = async (userId: string) => {
    try {
      // 特定のユーザーのデータを取得
      const res = await fetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error("ユーザーの更新に失敗しました")

      const updatedUser = await res.json()

      // 現在のデータがある場合のみ更新
      if (data) {
        // 既存のユーザーリストから該当ユーザーを更新
        const updatedData = data.map((user) => (user.id === userId ? updatedUser : user))

        // キャッシュを更新（再取得せずに）
        mutate(updatedData, false)
      }
    } catch (error) {
      console.error("Error updating user:", error)
      throw error
    }
  }

  return {
    data,
    error,
    mutate,
    isValidating,
    updateUser, // 新しい関数を追加
  }
}

// グローバルに特定のユーザーを更新する関数
export async function updateUserGlobally(userId: string) {
  try {
    // 特定のユーザーのデータを取得
    const res = await fetch(`/api/users/${userId}`)
    if (!res.ok) throw new Error("ユーザーの更新に失敗しました")

    const updatedUser = await res.json()

    // SWRのグローバルmutate関数を使用して、キャッシュを更新
    // まず現在のデータを取得せずに、更新関数を渡す
    await globalMutate(
      "/api/users",
      async (currentData: User[] | undefined) => {
        if (!currentData) return currentData

        // 既存のユーザーリストから該当ユーザーを更新
        return currentData.map((user) => (user.id === userId ? updatedUser : user))
      },
      false, // revalidateオプションをfalseに設定して再検証を行わない
    )

    return true
  } catch (error) {
    console.error("Error updating user globally:", error)
    return false
  }
}
