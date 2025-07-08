import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("🔍 Testing MongoDB connection...")
    
    // Test environment variable
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      return NextResponse.json({ 
        error: "MONGODB_URI environment variable not found",
        status: "failed"
      }, { status: 500 })
    }

    console.log("✅ MONGODB_URI found:", mongoUri.substring(0, 20) + "...")

    // Test database connection
    const mongoose = await dbConnect()
    
    console.log("✅ MongoDB connection successful!")
    console.log("Connection state:", mongoose.connection.readyState)
    console.log("Database name:", mongoose.connection.db?.databaseName)

    return NextResponse.json({
      status: "success",
      message: "MongoDB connection successful",
      database: mongoose.connection.db?.databaseName,
      readyState: mongoose.connection.readyState,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("❌ MongoDB connection test failed:", error)

    const errorInfo: any = {
      status: "failed",
      error: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      timestamp: new Date().toISOString()
    }

    // Provide specific guidance based on error type
    if (error.code === 'EREFUSED') {
      errorInfo.message = "Connection refused - check network/firewall settings"
      errorInfo.suggestions = [
        "Check if your IP is whitelisted in MongoDB Atlas",
        "Verify the connection string is correct",
        "Try connecting from a different network",
        "Check if MongoDB Atlas cluster is running"
      ]
    } else if (error.code === 'ENOTFOUND') {
      errorInfo.message = "DNS resolution failed - check hostname"
      errorInfo.suggestions = [
        "Verify the cluster hostname in your connection string",
        "Check your DNS settings",
        "Try using a different DNS server (8.8.8.8)"
      ]
    } else if (error.message.includes('authentication')) {
      errorInfo.message = "Authentication failed - check credentials"
      errorInfo.suggestions = [
        "Verify your username and password",
        "Check if the database user exists",
        "Ensure the user has proper permissions"
      ]
    }

    return NextResponse.json(errorInfo, { status: 500 })
  }
}
