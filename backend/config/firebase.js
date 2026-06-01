const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
let firebaseApp = null;

const resolveServiceAccountPath = () => {
  if (!serviceAccountPath) return null;
  if (path.isAbsolute(serviceAccountPath)) return serviceAccountPath;
  return path.resolve(__dirname, '..', serviceAccountPath);
};

try {
  const resolvedPath = resolveServiceAccountPath();

  if (resolvedPath && fs.existsSync(resolvedPath)) {
    const serviceAccount = require(resolvedPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized');
  } else {
    console.warn('Firebase Admin SDK is not initialized. Add FIREBASE_SERVICE_ACCOUNT_KEY_PATH in backend/.env.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
}

const isFirebaseAdminReady = () => Boolean(firebaseApp);

const verifyFirebaseIdToken = async (idToken) => {
  if (!firebaseApp) {
    const error = new Error('Firebase Admin SDK is not configured.');
    error.statusCode = 503;
    throw error;
  }

  return admin.auth().verifyIdToken(idToken);
};

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!firebaseApp) {
    return { sent: 0, failed: 0, skipped: true, reason: 'firebase_not_configured' };
  }

  const validTokens = (tokens || []).filter(Boolean);
  if (!validTokens.length) {
    return { sent: 0, failed: 0, skipped: true, reason: 'missing_tokens' };
  }

  const response = await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data,
    tokens: validTokens
  });

  return {
    sent: response.successCount,
    failed: response.failureCount
  };
};

module.exports = {
  admin,
  isFirebaseAdminReady,
  sendPushNotification,
  verifyFirebaseIdToken
};
