import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"

/**
 * 既存のユーザーに monthlyTotals フィールドを追加するマイグレーションスクリプト
 * このスクリプトは一度だけ実行してください
 */
export const migrateMonthlyTotals = async () => {
  try {
    console.log("ユーザーの monthlyTotals フィールド追加マイグレーションを開始します...")

    // すべてのユーザーを取得
    const usersRef = collection(db, "users")
    const snapshot = await getDocs(usersRef)

    if (snapshot.empty) {
      console.log("ユーザーが見つかりません")
      return
    }

    // 現在の年月を取得（YYYY-MM形式）
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // 更新カウンター
    let updateCount = 0

    // 各ユーザーに monthlyTotals フィールドを追加
    for (const docSnapshot of snapshot.docs) {
      const userData = docSnapshot.data()

      // 既に monthlyTotals フィールドがある場合はスキップ
      if (userData.monthlyTotals) {
        console.log(`ユーザー ${docSnapshot.id} は既に monthlyTotals フィールドを持っています`)
        continue
      }

      // 現在のチップ数を現在の月のサマリーとして設定
      const monthlyTotals = {
        [currentYearMonth]: userData.chips || 0,
      }

      // ドキュメントを更新
      const userRef = doc(db, "users", docSnapshot.id)
      await updateDoc(userRef, { monthlyTotals })

      console.log(`ユーザー ${docSnapshot.id} に monthlyTotals フィールドを追加しました`)
      updateCount++
    }

    console.log(`${updateCount} 人のユーザーを更新しました`)
    console.log("マイグレーション完了")
  } catch (error) {
    console.error("マイグレーションエラー:", error)
    throw error
  }
}

// このスクリプトを実行するためのエントリーポイント
// 例: node -r ts-node/register scripts/migrate-monthly-totals.ts
if (require.main === module) {
  migrateMonthlyTotals()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("マイグレーション失敗:", error)
      process.exit(1)
    })
}
