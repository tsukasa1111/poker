import useSWR from "swr"
import type { User } from "@/types"

// レスポンスの型定義
export type UsersWithMetricsResponse = {
  users: User[]
  userCount: number
  metrics?: {
    reads: { used: number; limit: number }
    writes: { used: number; limit: number }
    storage: { usedGB: number; limitGB: number }
  }
}

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
      const error: any = new Error(errorData.message || "APIからのデータ取得に失敗しました")
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

export function useUsersWithMetrics() {
  const { data, error, mutate, isValidating } = useSWR<UsersWithMetricsResponse>("/api/usersWithMetrics", fetcher, {
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

  return {
    data,
    error,
    mutate,
    isValidating,
    users: data?.users || [],
    userCount: data?.userCount || 0,
    metrics: data?.metrics,
  }
}
