export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';

/**
 * POST /api/user/score/rollover - Trigger monthly rollover explicitly
 *
 * This separates the monthly rollover write operation from the GET endpoint.
 * Call this endpoint when you want to trigger a monthly rollover.
 */
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const result = await checkAndRunMonthlyRollover(email);

    return NextResponse.json({
      success: true,
      rolloverTriggered: result.rolledOver,
      archivedMonth: result.archivedMonth,
      bonusAwarded: result.bonusAwarded,
    });
  } catch (error) {
    console.error(
      'Monthly rollover error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to run monthly rollover' },
      { status: 500 }
    );
  }
}
