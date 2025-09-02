import { Platform } from 'react-native';

let app: any;
let auth: any;
let firestore: any;
let storage: any;

if (Platform.OS === 'web') {
  // Web platform: Use Firebase JS SDK
  const { initializeApp } = require('firebase/app');
  const { getAuth, setPersistence, browserLocalPersistence } = require('firebase/auth');
  const { getFirestore, enableIndexedDbPersistence } = require('firebase/firestore');
  const { getStorage } = require('firebase/storage');

  // Firebase configuration
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Initialize Firebase for web
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);

  // Configure auth persistence for web
  setPersistence(auth, browserLocalPersistence).catch((error: any) => {
    console.error('[FirebaseConfig] Failed to set auth persistence:', error);
  });

  // Enable Firestore offline persistence for web
  enableIndexedDbPersistence(firestore).catch((error: any) => {
    if (error.code === 'failed-precondition') {
      console.warn('[FirebaseConfig] Firestore persistence failed: Multiple tabs open, persistence enabled only in first tab');
    } else if (error.code === 'unimplemented') {
      console.warn('[FirebaseConfig] Firestore persistence not available in this browser');
    } else {
      console.error('[FirebaseConfig] Failed to enable Firestore persistence:', error);
    }
  });

  console.log('[FirebaseConfig] Web Firebase initialized with local persistence and offline support');
} else {
  // React Native (Android/iOS): Use React Native Firebase SDK for proper native persistence
  const rnFirebaseApp = require('@react-native-firebase/app').default;
  const rnFirebaseAuth = require('@react-native-firebase/auth').default;
  const rnFirebaseFirestore = require('@react-native-firebase/firestore').default;
  const rnFirebaseStorage = require('@react-native-firebase/storage').default;

  // React Native Firebase automatically uses native configuration
  // from google-services.json (Android) and GoogleService-Info.plist (iOS)
  // This provides proper native session persistence
  app = rnFirebaseApp;
  auth = rnFirebaseAuth();
  firestore = rnFirebaseFirestore();
  storage = rnFirebaseStorage();

  // Enable Firestore offline persistence for React Native
  // This is enabled by default in React Native Firebase, but we can configure it
  try {
    firestore.settings({
      persistence: true,
      cacheSizeBytes: 100 * 1024 * 1024, // 100MB cache
    });
    console.log('[FirebaseConfig] React Native Firebase initialized with native persistence and offline support');
  } catch (error) {
    console.warn('[FirebaseConfig] Firestore settings already configured:', error);
    console.log('[FirebaseConfig] React Native Firebase initialized with native persistence');
  }
}

// Alias for compatibility with existing code
export const db = firestore;

export { auth, firestore, storage };
export default app;
