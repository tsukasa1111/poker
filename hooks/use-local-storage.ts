"use client"

import { useState } from "react"

// ローカルストレージにデータを保存する汎用フック
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 初期値の取得（ローカルストレージから読み込むか、なければ初期値を使用）
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // 値を設定し、ローカルストレージも更新する関数
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 新しい値が関数の場合は関数を実行して値を取得
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // 状態を更新
      setStoredValue(valueToStore)

      // ローカルストレージを更新
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue] as const
}
