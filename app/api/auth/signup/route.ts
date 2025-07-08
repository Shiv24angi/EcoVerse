// /app/api/auth/signup/route.ts
import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

export async function POST(req: Request) {
  try {
    console.log("✅ Signup endpoint hit")

    await dbConnect()
    console.log("✅ Connected to DB")

    const body = await req.json()
    console.log("📦 Request body:", body)

    const { name, email, firebaseUid } = body

    if (!name || !email || !firebaseUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      console.warn("⚠️ User already exists:", email)
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    const user = await User.create({
      _id: firebaseUid,
      name,
      email,
      monthlyCarbon: 0,
      totalScanned: 0,
      joinedAt: new Date().toISOString(),
    })

    console.log("✅ User created:", user)

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error"
    console.error("🔥 Signup API error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
