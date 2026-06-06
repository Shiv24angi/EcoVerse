import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, firebaseUid } = body

  if (!name || !email || !firebaseUid) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  let userDoc = null
  try {
    await dbConnect()
    userDoc = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          name,
          firebaseUid,
          authProvider: "google",
          avatarId: "avatar-1",
          monthlyCarbon: 0,
          totalScanned: 0,
          joinedAt: new Date().toISOString()
        }
      },
      {
        new: true,
        upsert: true,
        lean: true
      }
    )
    
    console.log("Google login email:", email);
    console.log("Mongo user found:", !!userDoc);
    console.log("Mongo avatar:", userDoc?.avatarId);
    
  } catch (err) {
    console.error("Failed to upsert user in google route:", err)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  // Map the MongoDB document back to the required frontend shape, ensuring we use raw DB values
  const user = {
    _id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    joinedAt: userDoc.createdAt ? new Date(userDoc.createdAt).toISOString().split("T")[0] : userDoc.joinedAt,
    monthlyCarbon: userDoc.monthlyCarbon || 0,
    totalScanned: userDoc.totalScanned || 0,
    avatarId: userDoc.avatarId || "avatar-1",
    avatarCustomization: userDoc.avatarCustomization || {},
  }

  return NextResponse.json({ user }, { status: 200 })
}
