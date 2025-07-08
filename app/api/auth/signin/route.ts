import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  await dbConnect();
  const { email, password } = await req.json();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
    const userData = {
    _id: user._id,
    email: user.email,
    name: user.name,
    monthlyCarbon: user.monthlyCarbon || 0,
    totalScanned: user.totalScanned || 0,
    joinedAt: user.createdAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
  }

  return NextResponse.json({ user: userData }, {status: 200});
}