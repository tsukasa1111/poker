import type { User } from "@/types"

// ユーザーデータをCSV形式に変換する関数
export function convertToCSV(users: User[]): string {
  // CSVヘッダー
  const headers = ["ユーザー名", "表示名", "チップ数", "総獲得", "総損失", "最終更新日", "作成日", "メモ", "ロール"]

  // ユーザーデータを行に変換
  const rows = users.map((user) => [
    user.username,
    user.displayName || "",
    user.chips.toString(),
    user.totalEarnings?.toString() || "0",
    user.totalLosses?.toString() || "0",
    user.lastUpdated ? new Date(user.lastUpdated).toLocaleString("ja-JP") : "",
    user.createdAt ? new Date(user.createdAt).toLocaleString("ja-JP") : "",
    user.notes || "",
    user.role || "",
  ])

  // ヘッダーと行を結合してCSV文字列を作成
  return [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))].join(
    "\n",
  )
}

// ユーザーデータをJSONとして整形する関数
export function formatJSON(users: User[]): string {
  return JSON.stringify(users, null, 2)
}

// ファイルをダウンロードする関数
export function downloadFile(content: string, fileName: string, contentType: string): boolean {
  try {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.style.display = "none"
    document.body.appendChild(a)

    a.click()

    setTimeout(() => {
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 100)

    return true
  } catch (error) {
    console.error("ファイルダウンロードエラー:", error)
    return false
  }
}

// 代替ダウンロード方法（ブラウザの制限に対応）
export function downloadFileAlternative(content: string, fileName: string, contentType: string): boolean {
  try {
    // データURIスキームを使用する方法
    const dataURI = `data:${contentType};charset=utf-8,${encodeURIComponent(content)}`

    const link = document.createElement("a")
    link.href = dataURI
    link.download = fileName
    link.style.display = "none"
    document.body.appendChild(link)

    link.click()

    setTimeout(() => {
      document.body.removeChild(link)
    }, 100)

    return true
  } catch (error) {
    console.error("代替ダウンロード方法エラー:", error)

    // 最後の手段：新しいウィンドウでテキストを開く
    try {
      const win = window.open("", "_blank")
      if (win) {
        win.document.write(`<pre>${content}</pre>`)
        win.document.title = fileName
        win.document.close()
        return true
      }
    } catch (e) {
      console.error("ウィンドウ開くエラー:", e)
    }

    return false
  }
}

// ファイル名を生成する関数
export function generateFileName(prefix: string, extension: string): string {
  const now = new Date()
  const dateStr = now.toISOString().split("T")[0] // YYYY-MM-DD形式

  // .all形式のファイル名を生成
  if (extension === "all") {
    return `${dateStr}.all`
  }

  // 従来の形式（CSVやJSONの場合）
  return `${prefix}_${dateStr}.${extension}`
}
