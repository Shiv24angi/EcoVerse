import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp && getApps().includes(adminApp)) {
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccount && serviceAccount !== 'your_service_account_json') {
    try {
      const parsed = JSON.parse(serviceAccount);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      return adminApp;
    } catch (error) {
      console.error(
        '[Firebase Admin] Failed to initialize with FIREBASE_SERVICE_ACCOUNT, falling back:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  adminApp = initializeApp({ projectId });
  return adminApp;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name: string;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseUser | null> {
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken, true);

    if (!decoded.uid || !decoded.email) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      name:
        (typeof decoded.name === 'string' && decoded.name.trim()
          ? decoded.name.trim()
          : undefined) ||
        decoded.email.split('@')[0] ||
        'User',
    };
  } catch (error) {
    console.warn('[Firebase Admin] ID token verification failed:', error);
    return null;
  }
}
