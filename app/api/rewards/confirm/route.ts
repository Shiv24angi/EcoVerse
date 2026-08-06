// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { confirmPendingPoints } from '@/lib/rewards-system';

/**
 * POST /api/rewards/confirm - Explicitly confirm aged pending points
 * 
 * This endpoint is idempotent - calling it multiple times with the same
 * parameters produces the same result. It should be called when the client
 * wants to trigger point confirmation (e.g., when the user views the rewards page
 * and has pending points older than the confirmation threshold).
 * 
 * This separates the write operation from the GET /api/rewards endpoint,
 * making GET requests truly idempotent per HTTP semantics.
 */
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get confirmation data without mutating the original document
    const confirmationData = confirmPendingPoints(user);

    if (confirmationData.confirmedPoints > 0) {
      const now = new Date();
      const transactionIdsToConfirm =
        confirmationData.confirmedTransactions.map((t) => t._id);

      // Perform atomic update
      const updatedUser = await User.findOneAndUpdate(
        { email },
        [
          {
            $set: {
              matchedPoints: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$rewardTransactions', []] },
                        as: 't',
                        cond: {
                          $and: [
                            { $in: ['$$t._id', transactionIdsToConfirm] },
                            { $eq: ['$$t.pointsType', 'unconfirmed'] },
                          ],
                        },
                      },
                    },
                    as: 'mt',
                    in: { $ifNull: ['$$mt.points', 0] },
                  },
                },
              },
            },
          },
          {
            $set: {
              confirmedPoints: {
                $add: [
                  { $ifNull: ['$confirmedPoints', 0] },
                  { $ifNull: ['$matchedPoints', 0] },
                ],
              },
              unconfirmedPoints: {
                $subtract: [
                  { $ifNull: ['$unconfirmedPoints', 0] },
                  { $ifNull: ['$matchedPoints', 0] },
                ],
              },
              rewardTransactions: {
                $map: {
                  input: { $ifNull: ['$rewardTransactions', []] },
                  as: 't',
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $in: ['$$t._id', transactionIdsToConfirm] },
                          { $eq: ['$$t.pointsType', 'unconfirmed'] },
                        ],
                      },
                      then: {
                        $mergeObjects: [
                          '$$t',
                          { pointsType: 'confirmed', confirmedAt: now },
                        ],
                      },
                      else: '$$t',
                    },
                  },
                },
              },
            },
          },
          { $unset: 'matchedPoints' },
        ],
        { new: true }
      );

      return NextResponse.json({
        success: true,
        confirmedPoints: confirmationData.confirmedPoints,
        transactionsConfirmed: confirmationData.confirmedTransactions.length,
        pointsSummary: updatedUser
          ? {
              totalPointsEarned: updatedUser.totalPointsEarned,
              confirmedPoints: updatedUser.confirmedPoints,
              unconfirmedPoints: updatedUser.unconfirmedPoints,
            }
          : null,
      });
    }

    // No points to confirm
    return NextResponse.json({
      success: true,
      confirmedPoints: 0,
      transactionsConfirmed: 0,
      message: 'No pending points to confirm',
    });
  } catch (error) {
    console.error('Point confirmation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to confirm points' },
      { status: 500 }
    );
  }
}
