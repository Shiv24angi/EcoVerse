import mongoose, { Mongoose } from 'mongoose';

// Fix: Extend the global type
declare global {
  var mongoose:
    | {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<Mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable in .env.local'
    );
  }

  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    const opts = {
      dbName: 'carbontracker',
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      retryWrites: true,
    };

    console.warn('🔄 Attempting to connect to MongoDB Atlas...');

    try {
      cached!.promise = mongoose.connect(MONGODB_URI, opts);
      cached!.conn = await cached!.promise;
      console.warn('✅ MongoDB connected successfully!');
      return cached!.conn;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      cached!.promise = null;
      throw error;
    }
  }

  try {
    cached!.conn = await cached!.promise;
    return cached!.conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cached!.promise = null;
    throw error;
  }
}

export default dbConnect;
