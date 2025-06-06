import { NextResponse } from "next/server"
import { getAllUsers } from "@/lib/firestore"

export async function GET() {
  try {
    console.log("API: Fetching all users...")
    const users = await getAllUsers()
    console.log(`API: Successfully fetched ${users.length} users`)
    return NextResponse.json(users)
  } catch (error) {
    console.error("API Error fetching users:", error)
    return NextResponse.json(
      {
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
