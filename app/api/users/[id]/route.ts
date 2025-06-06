import { NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const userData = userSnap.data()
    return NextResponse.json({
      id: userSnap.id,
      ...userData,
      lastUpdated: userData.lastUpdated?.toDate(),
      createdAt: userData.createdAt?.toDate(),
    })
  } catch (error) {
    console.error("API Error fetching user:", error)
    return NextResponse.json(
      {
        message: "Failed to fetch user",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
