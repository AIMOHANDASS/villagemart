"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessaging = exports.firebaseAdminApp = exports.initFirebaseAdmin = void 0;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
Object.defineProperty(exports, "getMessaging", { enumerable: true, get: function () { return messaging_1.getMessaging; } });
/**
 * Initializes the Firebase Admin SDK.
 * Supports multiple initialization methods:
 * 1. Explicit Service Account Credentials (via env variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 2. Application Default Credentials (ADC) if running in Google Cloud (Cloud Run, Compute Engine)
 */
const initFirebaseAdmin = () => {
    // Prevent duplicate initialization
    if ((0, app_1.getApps)().length > 0) {
        return (0, app_1.getApp)();
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
            return (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        }
        else {
            // 2. Fallback to ADC (Application Default Credentials) for Google Cloud Run
            console.log(`[Firebase Admin] Initializing with Application Default Credentials (ADC)`);
            return (0, app_1.initializeApp)();
        }
    }
    catch (error) {
        console.error(`[Firebase Admin] Failed to initialize: ${error.message}`);
        // Don't throw, let the app start even if Firebase is unconfigured
        return null;
    }
};
exports.initFirebaseAdmin = initFirebaseAdmin;
// Export the default app instance
exports.firebaseAdminApp = (0, exports.initFirebaseAdmin)();
