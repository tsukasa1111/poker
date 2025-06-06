import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"

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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)

// クライアントサイドでのみ永続キャッシュを有効化
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("🔥 Firestore with persistent cache initialized")
    })
    .catch((err) => {
      if (err.code === "failed-precondition") {
        // 複数タブが開いている場合など
        console.warn("Firestore persistence unavailable: Multiple tabs open")
      } else if (err.code === "unimplemented") {
        // ブラウザ非対応の場合
        console.warn("Firestore persistence unavailable: Browser not supported")
      }
    })
}

export { app, auth, db }
