export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const cspReport = await req.json();

    // Log CSP violations for security monitoring
    console.warn('CSP Violation:', JSON.stringify(cspReport));

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}
