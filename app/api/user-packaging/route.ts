// Prevent static generation for this API route.
export const dynamic = 'force-dynamic';

// app/api/user-packaging/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PackagingReport from '@/models/PackagingReport';

export async function POST(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { barcode, material } = await req.json();

  if (typeof barcode !== 'string' || typeof material !== 'string') {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const normalizedBarcode = barcode.trim();
  const normalizedMaterial = material.trim();

  if (!/^\d{8,14}$/.test(normalizedBarcode)) {
    return NextResponse.json(
      { error: 'Invalid barcode format' },
      { status: 400 }
    );
  }

  if (!normalizedMaterial) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  await dbConnect();
  const report = await PackagingReport.create({
    userEmail,
    barcode: normalizedBarcode,
    material: normalizedMaterial,
  });

  return NextResponse.json({
    success: true,
    reportId: report._id,
  });
}
