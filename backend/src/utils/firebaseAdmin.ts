import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Initializes the Firebase Admin SDK.
 * Supports multiple initialization methods:
 * 1. Explicit Service Account Credentials (via env variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 2. Application Default Credentials (ADC) if running in Google Cloud (Cloud Run, Compute Engine)
 */
export const initFirebaseAdmin = () => {
  // Prevent duplicate initialization
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle escaped newlines in private key string
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  try {
    if (projectId && clientEmail && privateKey) {
      // 1. Explicit Initialization (Local dev or explicitly provided secrets)
      console.log(`[Firebase Admin] Initializing with explicit credentials for project: ${projectId}`);
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      // 2. Fallback to ADC (Application Default Credentials) for Google Cloud Run
      console.log(`[Firebase Admin] Initializing with Application Default Credentials (ADC)`);
      return initializeApp();
    }
  } catch (error: any) {
    console.error(`[Firebase Admin] Failed to initialize: ${error.message}`);
    // Don't throw, let the app start even if Firebase is unconfigured
    return null;
  }
};

// Export the default app instance
export const firebaseAdminApp = initFirebaseAdmin();
export { getMessaging };
