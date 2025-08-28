import { Platform } from 'react-native';

/**
 * Check if the current platform is web
 */
export const isWeb = () => Platform.OS === 'web';

/**
 * Centralized Firebase Utilities
 * 
 * This file provides a single, platform-aware interface for all Firebase operations.
 * It automatically handles the differences between:
 * - Web: Firebase JS SDK (firebase/auth, firebase/firestore, etc.)
 * - React Native: React Native Firebase SDK (@react-native-firebase/*)
 * 
 * All Firebase operations throughout the app should use these utilities
 * instead of implementing platform-specific logic in individual files.
 */

// Import Firebase instances from config
import { auth, firestore } from '@/firebaseConfig';

// Platform-specific imports
let webFirestore: any;
let webAuth: any;
let Timestamp: any;

// React Native Firebase modular functions
let rnFirestoreModule: any;
let rnAuthModule: any;

if (isWeb()) {
  // Web Firebase SDK
  webFirestore = require('firebase/firestore');
  webAuth = require('firebase/auth');
  Timestamp = webFirestore.Timestamp;
} else {
  // React Native Firebase SDK - modular imports for v22+
  rnFirestoreModule = require('@react-native-firebase/firestore');
  rnAuthModule = require('@react-native-firebase/auth');
  Timestamp = rnFirestoreModule.Timestamp;
}

// ============================================================================
// FIRESTORE UTILITIES
// ============================================================================

/**
 * Get a collection reference
 */
export const getCollection = (collectionName: string) => {
  if (isWeb()) {
    return webFirestore.collection(firestore, collectionName);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.collection(firestore, collectionName);
  }
};

/**
 * Get a document reference
 */
export const getDocument = (collectionName: string, docId: string) => {
  if (isWeb()) {
    return webFirestore.doc(firestore, collectionName, docId);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.doc(firestore, collectionName, docId);
  }
};

/**
 * Get document data
 */
export const getDocumentData = async (docRef: any) => {
  if (isWeb()) {
    const docSnap = await webFirestore.getDoc(docRef);
    return { exists: docSnap.exists(), data: docSnap.data() };
  } else {
    // Use modular API for React Native Firebase v22+
    const docSnap = await rnFirestoreModule.getDoc(docRef);
    return { exists: docSnap.exists(), data: docSnap.data() };
  }
};

/**
 * Add a new document to a collection
 */
export const addDocument = async (collectionRef: any, data: any) => {
  if (isWeb()) {
    return webFirestore.addDoc(collectionRef, data);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.addDoc(collectionRef, data);
  }
};

/**
 * Update a document
 */
export const updateDocument = async (docRef: any, data: any) => {
  if (isWeb()) {
    return webFirestore.updateDoc(docRef, data);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.updateDoc(docRef, data);
  }
};

/**
 * Set document data
 */
export const setDocument = async (docRef: any, data: any) => {
  if (isWeb()) {
    return webFirestore.setDoc(docRef, data);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.setDoc(docRef, data);
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (docRef: any) => {
  if (isWeb()) {
    return webFirestore.deleteDoc(docRef);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.deleteDoc(docRef);
  }
};

// ============================================================================
// QUERY UTILITIES
// ============================================================================

/**
 * Create a where constraint
 */
export const where = (field: string, operator: any, value: any) => {
  if (isWeb()) {
    return webFirestore.where(field, operator, value);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.where(field, operator, value);
  }
};

/**
 * Create an orderBy constraint
 */
export const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => {
  if (isWeb()) {
    return webFirestore.orderBy(field, direction);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.orderBy(field, direction);
  }
};

/**
 * Create a limit constraint
 */
export const limit = (value: number) => {
  if (isWeb()) {
    return webFirestore.limit(value);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.limit(value);
  }
};

/**
 * Create a startAfter constraint
 */
export const startAfter = (value: any) => {
  if (isWeb()) {
    return webFirestore.startAfter(value);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.startAfter(value);
  }
};

/**
 * Create a query with constraints
 */
export const createQuery = (collectionRef: any, ...constraints: any[]) => {
  if (isWeb()) {
    return webFirestore.query(collectionRef, ...constraints);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.query(collectionRef, ...constraints);
  }
};

/**
 * Get documents from a query
 */
export const getDocs = async (query: any) => {
  if (isWeb()) {
    return webFirestore.getDocs(query);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnFirestoreModule.getDocs(query);
  }
};

/**
 * Get count from server
 */
export const getCountFromServer = async (query: any) => {
  if (isWeb()) {
    const snapshot = await webFirestore.getCountFromServer(query);
    return { data: snapshot.data() };
  } else {
    // Use modular API for React Native Firebase v22+
    const snapshot = await rnFirestoreModule.getCountFromServer(query);
    return { data: snapshot.data() };
  }
};

/**
 * Process query results to extract docs array (platform-independent)
 */
export const getDocsArray = (snapshot: any) => {
  // Normalize document structure so consuming code can use doc.data consistently
  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    data: typeof doc.data === 'function' ? doc.data() : doc.data
  }));
};

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

/**
 * Sign in with email and password
 */
export const signInWithEmailAndPassword = async (email: string, password: string) => {
  if (isWeb()) {
    return webAuth.signInWithEmailAndPassword(auth, email, password);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnAuthModule.signInWithEmailAndPassword(auth, email, password);
  }
};

/**
 * Sign in with popup (web only)
 */
export const signInWithPopup = async (provider: any) => {
  if (isWeb()) {
    return webAuth.signInWithPopup(auth, provider);
  } else {
    throw new Error('signInWithPopup is only available on web platform');
  }
};

/**
 * Sign in with credential
 */
export const signInWithCredential = async (credential: any) => {
  if (isWeb()) {
    return webAuth.signInWithCredential(auth, credential);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnAuthModule.signInWithCredential(auth, credential);
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (isWeb()) {
    return webAuth.signOut(auth);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnAuthModule.signOut(auth);
  }
};

/**
 * Set up auth state listener
 */
export const onAuthStateChanged = (callback: any) => {
  if (isWeb()) {
    return webAuth.onAuthStateChanged(auth, callback);
  } else {
    // Use modular API for React Native Firebase v22+
    return rnAuthModule.onAuthStateChanged(auth, callback);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  if (isWeb()) {
    return auth.currentUser;
  } else {
    return auth.currentUser;
  }
};

// ============================================================================
// AUTH PROVIDERS
// ============================================================================

/**
 * Google Auth Provider utilities
 */
export const GoogleAuthProvider = (() => {
  if (isWeb()) {
    const provider = webAuth.GoogleAuthProvider;
    return {
      ...provider,
      credential: provider.credential,
    };
  } else {
    // Use modular API for React Native Firebase v22+
    return rnAuthModule.GoogleAuthProvider;
  }
})();

/**
 * Create Google Auth Provider instance (web only)
 */
export const createGoogleAuthProvider = () => {
  if (isWeb()) {
    return new webAuth.GoogleAuthProvider();
  } else {
    throw new Error('createGoogleAuthProvider is only available on web platform');
  }
};

// ============================================================================
// TIMESTAMP UTILITIES
// ============================================================================

/**
 * Create a Firestore Timestamp from the current time
 */
export const timestampNow = () => {
  return Timestamp.now();
};

/**
 * Create a Firestore Timestamp from a Date
 */
export const timestampFromDate = (date: Date) => {
  return Timestamp.fromDate(date);
};

/**
 * Export Timestamp class for direct use
 */
export { Timestamp };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get platform-specific error handling
 */
export const handleFirebaseError = (error: any, operation: string) => {
  console.error(`Firebase ${operation} error:`, error);
  
  // Add platform-specific error handling if needed
  if (isWeb()) {
    // Web-specific error handling
  } else {
    // React Native-specific error handling
  }
  
  return error;
};
