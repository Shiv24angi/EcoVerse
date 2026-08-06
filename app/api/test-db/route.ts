// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    );
  }

  try {
    console.warn('🔍 Testing MongoDB connection...');

    // Test environment variable
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json(
        {
          error: 'MONGODB_URI environment variable not found',
          status: 'failed',
        },
        { status: 500 }
      );
    }

    console.warn('✅ MONGODB_URI found');

    // Test database connection
    const mongoose = await dbConnect();

    console.warn('✅ MongoDB connection successful!');
    console.warn('Connection state:', mongoose.connection.readyState);
    console.warn('Database name:', mongoose.connection.db?.databaseName);

    return NextResponse.json({
      status: 'success',
      message: 'MongoDB connection successful',
      database: mongoose.connection.db?.databaseName,
      readyState: mongoose.connection.readyState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);

    // SECURITY: Do not expose internal error details to clients
    // Only log detailed errors server-side; return generic message to client
    return NextResponse.json(
      {
        status: 'failed',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
