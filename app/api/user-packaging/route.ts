// app/api/user-packaging/route.ts

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { barcode, material, userEmail } = await req.json()

  if (!barcode || !material) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  console.log(`User ${userEmail} reported packaging for ${barcode}: ${material}`)

  // Optionally: Save to MongoDB here

  return NextResponse.json({ success: true })
}
