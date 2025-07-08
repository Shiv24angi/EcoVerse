import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, firebaseUid } = body

  if (!name || !email || !firebaseUid) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // ✅ You can connect to a real DB here and create user
  const user = {
    _id: firebaseUid,
    name,
    email,
    joinedAt: new Date().toISOString(),
    monthlyCarbon: 0,
    totalScanned: 0,
  }

  return NextResponse.json({ user }, { status: 200 })
}
