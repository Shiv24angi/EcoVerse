// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
// TODO: Import your related models here to ensure cross-collection cleanup
// import CarbonData from '@/models/CarbonData';
// import Activity from '@/models/Activity';

import { verifyCookieAuth } from '@/lib/auth';
import { deleteFirebaseUser } from '@/lib/firebase-admin';

export async function DELETE(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authError = await verifyCookieAuth(req, email);
  if (authError) return authError;

  try {
    await dbConnect();

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const firebaseDeleted = await deleteFirebaseUser(existingUser.firebaseUid);

    // =======================================================================
    // Cross-Collection Cleanup:
    // Delete or anonymize all associated records from separate collections
    // using the user's `_id`, `email`, or `firebaseUid` before removing the user.
    // =======================================================================

    // Uncomment and replace with your actual models and identifiers:
    /*
    await Promise.all([
      CarbonData.deleteMany({ userId: existingUser._id }),
      Activity.deleteMany({ firebaseUid: existingUser.firebaseUid }),
      // For models where you prefer anonymization instead of hard deletion:
      // Post.updateMany({ authorEmail: email }, { $set: { authorEmail: 'deleted_user@ecoverse.app', authorName: 'Deleted User' } })
    ]);
    */

    const deleteResult = await User.deleteOne({ email });

    if (!deleteResult?.deletedCount) {
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json(
      { success: true, deleted: true, firebaseDeleted },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete user account' },
      { status: 500 }
    );
  }
}
