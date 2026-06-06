import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

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

  // Generate the JWT
  const token = await signToken({
    email: user.email,
    userId: user._id.toString()
  });

  // Set the token securely as an HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return NextResponse.json({ user: userData }, {status: 200});
}