import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseReady = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseReady ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const googleProvider = app ? new GoogleAuthProvider() : null;

const canUseMessaging = () => (
  app &&
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  import.meta.env.VITE_FIREBASE_VAPID_KEY
);

export { app, auth, googleProvider, signInWithPopup };

export const requestForToken = async () => {
  if (!canUseMessaging()) return null;

  try {
    const messaging = getMessaging(app);
    return getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
  } catch (error) {
    console.warn('Firebase messaging token unavailable:', error.message);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!canUseMessaging()) return resolve(null);
    const messaging = getMessaging(app);
    return onMessage(messaging, resolve);
  });

