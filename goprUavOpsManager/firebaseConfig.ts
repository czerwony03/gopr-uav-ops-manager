import { Platform } from 'react-native';

let app: any;
let auth: any;
let firestore: any;
let storage: any;

if (Platform.OS === 'web') {
  // Web platform: Use Firebase JS SDK
  const { initializeApp } = require('firebase/app');
  const { getAuth, setPersistence, browserLocalPersistence } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');
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

  // Configure persistence for web
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('[FirebaseConfig] Failed to set auth persistence:', error);
  });

  console.log('[FirebaseConfig] Web Firebase initialized with local persistence');
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

  console.log('[FirebaseConfig] React Native Firebase initialized with native persistence');
}

// Alias for compatibility with existing code
export const db = firestore;

export { auth, firestore, storage };
export default app;
