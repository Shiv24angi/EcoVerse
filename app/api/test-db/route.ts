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
    // Test environment variable without echoing its value back.
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'MONGODB_URI environment variable not found',
        },
        { status: 500 }
      );
    }

    // Test database connection. Only the readyState and database name are safe
    // to surface; the connection string itself must never be returned.
    const mongoose = await dbConnect();

    return NextResponse.json({
      status: 'success',
      message: 'MongoDB connection successful',
      database: mongoose.connection.db?.databaseName,
      readyState: mongoose.connection.readyState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log the full error server-side only. The raw Error.message, hostname,
    // errno, and syscall can reveal infrastructure details (cluster hostname,
    // network topology) and must not be sent to clients. See #437.
    console.error('❌ MongoDB connection test failed:', error);

    // Map to a coarse, safe client-facing category derived from the error
    // code, without echoing the original message or low-level fields.
    const nodeError =
      error instanceof Error
        ? (error as NodeJS.ErrnoException & { hostname?: string })
        : undefined;

    const code = nodeError?.code;
    let category = 'connection_error';
    let hint = 'Check the server logs for details.';
    if (code === 'ECONNREFUSED' || code === 'EREFUSED') {
      category = 'network_refused';
      hint =
        'The database refused the connection (network/firewall/IP allowlist).';
    } else if (code === 'ENOTFOUND') {
      category = 'dns_resolution_failed';
      hint = 'The database hostname could not be resolved.';
    } else if (
      error instanceof Error &&
      /authentication/i.test(error.message)
    ) {
      category = 'authentication_failed';
      hint = 'The database credentials were rejected.';
    }

    return NextResponse.json(
      {
        status: 'failed',
        error: 'MongoDB connection test failed',
        category,
        hint,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
