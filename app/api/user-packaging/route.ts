// Prevent static generation for this API route.
export const dynamic = 'force-dynamic';

// app/api/user-packaging/route.ts

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { barcode, material } = await req.json();

  if (!barcode || !material) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  console.warn(
    `User ${userEmail} reported packaging for ${barcode}: ${material}`
  );

  // Optionally: Save to MongoDB here

  return NextResponse.json({ success: true });
}
