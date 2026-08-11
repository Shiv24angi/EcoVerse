// Prevent static generation for this API route.
export const dynamic = 'force-dynamic';

// app/api/user-packaging/route.ts

import { NextResponse } from 'next/server';

const VALID_MATERIALS = [
  'plastic',
  'glass',
  'metal',
  'cardboard',
  'paper',
  'composite',
  'biodegradable',
  'recyclable',
  'non-recyclable',
];

export async function POST(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { barcode, material } = body as {
    barcode?: unknown;
    material?: unknown;
  };

  // Validate barcode
  if (
    typeof barcode !== 'string' ||
    !barcode ||
    barcode.length > 100 ||
    !/^[A-Za-z0-9-_]+$/.test(barcode)
  ) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 });
  }

  // Validate material
  if (
    typeof material !== 'string' ||
    !VALID_MATERIALS.includes(material.toLowerCase())
  ) {
    return NextResponse.json({ error: 'Invalid material' }, { status: 400 });
  }

  console.warn(
    `User ${userEmail} reported packaging for ${barcode}: ${material}`
  );

  return NextResponse.json({ success: true });
}
