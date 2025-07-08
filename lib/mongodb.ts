import mongoose, { Mongoose } from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local")
}

// Fix: Extend the global type
declare global {
  var mongoose: {
    conn: Mongoose | null
    promise: Promise<Mongoose> | null
  } | undefined
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect(): Promise<Mongoose> {
  if (cached!.conn) return cached!.conn

  if (!cached!.promise) {
    const opts = {
      dbName: "carbontracker",
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
      retryWrites: true
    }

    console.log("🔄 Attempting to connect to MongoDB Atlas...")
    
    try {
      cached!.promise = mongoose.connect(MONGODB_URI, opts)
      cached!.conn = await cached!.promise
      console.log("✅ MongoDB connected successfully!")
      return cached!.conn
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error)
      cached!.promise = null
      throw error
    }
  }

  try {
    cached!.conn = await cached!.promise
    return cached!.conn
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    cached!.promise = null
    throw error
  }
}

export default dbConnect







