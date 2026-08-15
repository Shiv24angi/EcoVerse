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
    await dbConnect();

    return NextResponse.json({
      status: 'success',
      message: 'MongoDB connection successful',
    });
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);

    return NextResponse.json(
      {
        status: 'failed',
        error: 'Database connection failed. Check server logs for details.',
      },
      { status: 500 }
    );
  }
}
