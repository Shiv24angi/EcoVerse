// Prevent static generation for this API route.
export const dynamic = 'force-dynamic';

// app/api/user-packaging/route.ts

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { barcode, material } = await req.json();

    if (!barcode || !material) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Log without exposing user email
    console.warn(`Packaging report: barcode=${barcode}, material=${material}`);

    // Optionally: Save to MongoDB here

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      'Packaging report error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to process packaging report' },
      { status: 500 }
    );
  }
}
