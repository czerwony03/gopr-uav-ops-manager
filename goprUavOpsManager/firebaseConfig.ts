import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Configure Firebase Auth persistence for web platform
// Note: React Native (Android/iOS) has automatic persistence via AsyncStorage
// Web platform needs explicit configuration for local persistence
if (Platform.OS === 'web') {
  // Set persistence to local storage for web to ensure sessions persist
  // across browser sessions and page refreshes
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('[FirebaseConfig] Failed to set auth persistence:', error);
  });
}

// Initialize Cloud Firestore and get a reference to the service
export const firestore = getFirestore(app);
export const db = firestore; // Alias for compatibility with existing code

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
