import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    console.log("✅ Signup endpoint hit");

    await dbConnect();
    console.log("✅ Connected to DB");

    const body = await req.json();
    console.log("📦 Request body:", body);

    const {
      name,
      email,
      password,
      firebaseUid,
    } = body;

    // Require basic fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Require either password OR firebaseUid
    if (!password && !firebaseUid) {
      return NextResponse.json(
        {
          error:
            "Password or Firebase UID is required",
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      console.warn(
        "⚠️ User already exists:",
        email
      );

      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password only for manual signup
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(
        password,
        10
      );
    }

    const user = await User.create({
      name,
      username: name,
      full_name: name,
      email,

      // manual auth
      password: hashedPassword,

      // google auth
      firebaseUid: firebaseUid || null,

      monthlyCarbon: 0,
      totalScanned: 0,
      joinedAt: new Date().toISOString(),
    });

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

    console.log("✅ User created:", user);

    return NextResponse.json(
      { user },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    console.error(
      "🔥 Signup API error:",
      message
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}