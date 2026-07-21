import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getServiceAccount() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error(
      'Firebase Admin SDK requires FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ' +
        'and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.'
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

function getFirebaseAdminAuth() {
  if (getApps().length === 0) {
    const serviceAccount = getServiceAccount();
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }

  return getAuth();
}

export async function verifyFirebaseIdToken(
  idToken: string
) {
  const auth = getFirebaseAdminAuth();
  return auth.verifyIdToken(idToken);
}
