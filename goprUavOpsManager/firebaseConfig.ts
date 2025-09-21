import { Platform } from 'react-native';

let app: any;
let auth: any;
let firestore: any;
let storage: any;
let analytics: any;

if (Platform.OS === 'web') {
  // Web platform: Use Firebase JS SDK
  const { initializeApp } = require('firebase/app');
  const { getAuth, setPersistence, browserLocalPersistence } = require('firebase/auth');
  const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = require('firebase/firestore');
  const { getStorage } = require('firebase/storage');

  // Only import analytics if not in test environment
  let getAnalytics: any = null;
  let isSupported: any = null;
  if (process.env.NODE_ENV !== 'test') {
    const analyticsModule = require('firebase/analytics');
    getAnalytics = analyticsModule.getAnalytics;
    isSupported = analyticsModule.isSupported;
  }

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
  storage = getStorage(app);

  // Initialize Analytics for web (only in production and if supported)
  if (process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false' && typeof window !== 'undefined' && getAnalytics && isSupported) {
    isSupported().then((supported: boolean) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('[FirebaseConfig] Web Firebase Analytics initialized');
      } else {
        console.log('[FirebaseConfig] Firebase Analytics not supported on this browser');
        analytics = null;
      }
    }).catch((error: any) => {
      console.warn('[FirebaseConfig] Failed to check Analytics support:', error);
      analytics = null;
    });
  } else {
    console.log('[FirebaseConfig] Firebase Analytics disabled for web');
    analytics = null;
  }

  // Configure auth persistence for web
  setPersistence(auth, browserLocalPersistence).catch((error: any) => {
    console.error('[FirebaseConfig] Failed to set auth persistence:', error);
  });

  // Enable Firestore offline persistence for web with timeout
  const enablePersistence = () => {
    try {
      const initialization = initializeFirestore(app, {
        cache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
      console.log('[FirebaseConfig] Web Firebase initialized with local persistence and offline support');
      return initialization;
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('[FirebaseConfig] Firestore persistence failed: Multiple tabs open, persistence enabled only in first tab');
      } else if (error.code === 'unimplemented') {
        console.warn('[FirebaseConfig] Firestore persistence not available in this browser');
      } else if (error.message === 'Persistence setup timeout') {
        console.warn('[FirebaseConfig] Firestore persistence setup timed out, continuing without offline persistence');
      } else {
        console.error('[FirebaseConfig] Failed to enable Firestore persistence:', error);
      }
      console.log('[FirebaseConfig] Web Firebase initialized without offline persistence', error);
    }
  };

  firestore = enablePersistence();
} else {
  // React Native (Android/iOS): Use React Native Firebase SDK for proper native persistence
  const rnFirebaseApp = require('@react-native-firebase/app').default;
  const rnFirebaseAuth = require('@react-native-firebase/auth').default;
  const rnFirebaseFirestore = require('@react-native-firebase/firestore').default;
  const rnFirebaseStorage = require('@react-native-firebase/storage').default;

  // Only import analytics if not in test environment
  let rnFirebaseAnalytics: any = null;
  if (process.env.NODE_ENV !== 'test') {
    rnFirebaseAnalytics = require('@react-native-firebase/analytics').default;
  }

  // React Native Firebase automatically uses native configuration
  // from google-services.json (Android) and GoogleService-Info.plist (iOS)
  // This provides proper native session persistence
  app = rnFirebaseApp;
  auth = rnFirebaseAuth();
  firestore = rnFirebaseFirestore();
  storage = rnFirebaseStorage();

  // Initialize Analytics for React Native (only in production)
  if (process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false' && rnFirebaseAnalytics) {
    analytics = rnFirebaseAnalytics();
    console.log('[FirebaseConfig] React Native Firebase Analytics initialized');
  } else {
    console.log('[FirebaseConfig] Firebase Analytics disabled for React Native');
    analytics = null;
  }

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

export { app, auth, firestore, storage, analytics };
