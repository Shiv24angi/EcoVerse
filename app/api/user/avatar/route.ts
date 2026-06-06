import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

export async function PUT(req: Request) {
  try {
    await dbConnect()

    const body = await req.json()
    const { email, avatarId } = body

    if (!email || !avatarId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { avatarId } },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("User from DB:", updatedUser?.avatarId)

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error"
    console.error("🔥 Avatar update error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
