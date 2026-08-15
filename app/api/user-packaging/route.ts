// Prevent static generation for this API route.
export const dynamic = 'force-dynamic';

// app/api/user-packaging/route.ts

import { NextResponse } from 'next/server';
import {
  validateBarcode,
  validateBarcodeFormat,
} from '@/lib/input-validation';

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

  // Validate barcode using the same helpers as the scan route so the two
  // endpoints share one source of truth (rejects non-strings, empty, oversize,
  // invalid characters, and numeric barcodes outside the 8-14 digit range).
  const barcodeValidation = validateBarcode(barcode);
  if (!barcodeValidation.valid) {
    return NextResponse.json(
      { error: barcodeValidation.error || 'Invalid barcode' },
      { status: 400 }
    );
  }
  const sanitizedBarcode = barcodeValidation.sanitized!;
  const formatValidation = validateBarcodeFormat(sanitizedBarcode);
  if (!formatValidation.valid) {
    return NextResponse.json(
      { error: formatValidation.error || 'Invalid barcode format' },
      { status: 400 }
    );
  }

  // Validate material: must be a string from the accepted, normalized set.
  if (typeof material !== 'string') {
    return NextResponse.json({ error: 'Invalid material' }, { status: 400 });
  }
  const normalizedMaterial = material.trim().toLowerCase();
  if (!normalizedMaterial || !VALID_MATERIALS.includes(normalizedMaterial)) {
    return NextResponse.json({ error: 'Invalid material' }, { status: 400 });
  }

  console.warn(
    `User ${userEmail} reported packaging for ${sanitizedBarcode}: ${normalizedMaterial}`
  );

  return NextResponse.json({ success: true });
}
