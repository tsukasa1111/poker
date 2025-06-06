// クライアント側で使用するパスワードユーティリティ
// 注意: これは簡易的な実装です。本番環境では必ずサーバーサイドでハッシュ化してください。

/**
 * パスワードを簡易的にハッシュ化する関数（クライアント側用）
 * 注意: これは本番環境では使用しないでください
 */
export async function simpleHashPassword(password: string): Promise<string> {
  // 文字列をUTF-8エンコードしてArrayBufferに変換
  const encoder = new TextEncoder()
  const data = encoder.encode(password)

  // SHA-256ハッシュを計算
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)

  // ArrayBufferを16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  return hashHex
}
