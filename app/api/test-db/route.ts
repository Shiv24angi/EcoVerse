import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
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

    const message = error instanceof Error ? error.message : 'Unknown error';
    const nodeError =
      error instanceof Error
        ? (error as NodeJS.ErrnoException & { hostname?: string })
        : undefined;
    const isDev = process.env.NODE_ENV !== 'production';

    const errorInfo: {
      status: string;
      error: string;
      code?: string;
      errno?: number;
      syscall?: string;
      hostname?: string;
      timestamp: string;
      message?: string;
      suggestions?: string[];
    } = {
      status: 'failed',
      error: message,
      code: isDev ? nodeError?.code : undefined,
      errno: isDev ? nodeError?.errno : undefined,
      syscall: isDev ? nodeError?.syscall : undefined,
      hostname: isDev ? nodeError?.hostname : undefined,
      timestamp: new Date().toISOString(),
    };

    // Provide specific guidance based on error type
    if (nodeError?.code === 'EREFUSED') {
      errorInfo.message =
        'Connection refused - check network/firewall settings';
      errorInfo.suggestions = [
        'Check if your IP is whitelisted in MongoDB Atlas',
        'Verify the connection string is correct',
        'Try connecting from a different network',
        'Check if MongoDB Atlas cluster is running',
      ];
    } else if (nodeError?.code === 'ENOTFOUND') {
      errorInfo.message = 'DNS resolution failed - check hostname';
      errorInfo.suggestions = [
        'Verify the cluster hostname in your connection string',
        'Check your DNS settings',
        'Try using a different DNS server (8.8.8.8)',
      ];
    } else if (message.includes('authentication')) {
      errorInfo.message = 'Authentication failed - check credentials';
      errorInfo.suggestions = [
        'Verify your username and password',
        'Check if the database user exists',
        'Ensure the user has proper permissions',
      ];
    }

    return NextResponse.json(errorInfo, { status: 500 });
  }
}
