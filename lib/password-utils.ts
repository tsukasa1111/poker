// このファイルはサーバーサイドでのみ使用されるべきです
// API Routes内でのみインポートしてください

import bcrypt from "bcryptjs"

// ソルト生成のラウンド数（コスト）
const SALT_ROUNDS = 12

/**
 * パスワードをハッシュ化する関数
 * @param password ハッシュ化するパスワード
 * @param pepper ペッパー文字列
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string, pepper: string): Promise<string> {
  // ペッパーを追加
  const passwordWithPepper = password + pepper

  // bcryptでハッシュ化（ソルトは自動生成される）
  return await bcrypt.hash(passwordWithPepper, SALT_ROUNDS)
}

/**
 * パスワードが正しいかを検証する関数
 * @param password 検証するパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @param pepper ペッパー文字列
 * @returns パスワードが一致するかどうか
 */
export async function verifyPassword(password: string, hashedPassword: string, pepper: string): Promise<boolean> {
  try {
    if (!password || !hashedPassword || !pepper) {
      console.error("Missing required parameters for password verification")
      return false
    }

    // ペッパーを追加
    const passwordWithPepper = password + pepper

    // bcryptで検証
    return await bcrypt.compare(passwordWithPepper, hashedPassword)
  } catch (error) {
    console.error("Password verification error:", error)
    throw new Error("パスワード検証中にエラーが発生しました")
  }
}

/**
 * パスワードの強度をチェックする関数
 * @param password チェックするパスワード
 * @returns エラーメッセージ（問題がなければnull）
 */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "パスワードは8文字以上である必要があります"
  }

  // 英大文字、英小文字、数字、特殊文字のカウント
  let hasUpperCase = false
  let hasLowerCase = false
  let hasNumber = false
  let hasSpecialChar = false

  for (const char of password) {
    if (char >= "A" && char <= "Z") hasUpperCase = true
    else if (char >= "a" && char <= "z") hasLowerCase = true
    else if (char >= "0" && char <= "9") hasNumber = true
    else hasSpecialChar = true
  }

  // 少なくとも2種類の文字種を含むかチェック
  const charTypeCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length
  if (charTypeCount < 2) {
    return "パスワードは英大文字、英小文字、数字、特殊文字のうち少なくとも2種類を含む必要があります"
  }

  return null
}
