// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
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
