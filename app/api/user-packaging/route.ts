// Prevent static generation for this API route.
export const dynamic = 'force-dynamic';

// app/api/user-packaging/route.ts

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { barcode, material } = payload as {
    barcode?: unknown;
    material?: unknown;
  };

  if (
    typeof barcode !== 'string' ||
    !barcode.trim() ||
    typeof material !== 'string' ||
    !material.trim()
  ) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  console.warn(
    `User ${userEmail} reported packaging for ${barcode.trim()}: ${material.trim()}`
  );

  // Optionally: Save to MongoDB here

  return NextResponse.json({ success: true });
}
