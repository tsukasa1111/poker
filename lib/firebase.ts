import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from "firebase/firestore"
import { getDatabase } from "firebase/database"

// Firebaseの設定
// 環境変数から読み込む
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// 環境変数が設定されているか確認
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error("Firebase環境変数が設定されていません。.env.localファイルに必要な環境変数を設定してください。")
}

// Firebaseの初期化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)

// 新しい方法でFirestoreを初期化（キャッシュ設定を含む）
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
})

// クライアントサイドでのみ実行されるログ
if (typeof window !== "undefined") {
  console.log("🔥 Firestore with persistent cache initialized")
}

const database = getDatabase(app)

export { app, auth, db, database }
