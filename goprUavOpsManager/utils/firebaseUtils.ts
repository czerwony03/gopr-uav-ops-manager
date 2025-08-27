import { Platform } from 'react-native';

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

if (Platform.OS === 'web') {
  // Web Firebase SDK
  webFirestore = require('firebase/firestore');
  webAuth = require('firebase/auth');
  Timestamp = webFirestore.Timestamp;
} else {
  // React Native Firebase SDK
  const firestoreModule = require('@react-native-firebase/firestore');
  Timestamp = firestoreModule.default.Timestamp;
}

// ============================================================================
// FIRESTORE UTILITIES
// ============================================================================

/**
 * Get a collection reference
 */
export const getCollection = (collectionName: string) => {
  if (Platform.OS === 'web') {
    return webFirestore.collection(firestore, collectionName);
  } else {
    return firestore.collection(collectionName);
  }
};

/**
 * Get a document reference
 */
export const getDocument = (collectionName: string, docId: string) => {
  if (Platform.OS === 'web') {
    return webFirestore.doc(firestore, collectionName, docId);
  } else {
    return firestore.collection(collectionName).doc(docId);
  }
};

/**
 * Get document data
 */
export const getDocumentData = async (docRef: any) => {
  if (Platform.OS === 'web') {
    const docSnap = await webFirestore.getDoc(docRef);
    return { exists: docSnap.exists(), data: docSnap.data() };
  } else {
    const docSnap = await docRef.get();
    return { exists: docSnap.exists, data: docSnap.data() };
  }
};

/**
 * Add a new document to a collection
 */
export const addDocument = async (collectionRef: any, data: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.addDoc(collectionRef, data);
  } else {
    return collectionRef.add(data);
  }
};

/**
 * Update a document
 */
export const updateDocument = async (docRef: any, data: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.updateDoc(docRef, data);
  } else {
    return docRef.update(data);
  }
};

/**
 * Set document data
 */
export const setDocument = async (docRef: any, data: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.setDoc(docRef, data);
  } else {
    return docRef.set(data);
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (docRef: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.deleteDoc(docRef);
  } else {
    return docRef.delete();
  }
};

// ============================================================================
// QUERY UTILITIES
// ============================================================================

/**
 * Create a where constraint
 */
export const where = (field: string, operator: any, value: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.where(field, operator, value);
  } else {
    return { type: 'where', field, operator, value };
  }
};

/**
 * Create an orderBy constraint
 */
export const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => {
  if (Platform.OS === 'web') {
    return webFirestore.orderBy(field, direction);
  } else {
    return { type: 'orderBy', field, direction };
  }
};

/**
 * Create a limit constraint
 */
export const limit = (value: number) => {
  if (Platform.OS === 'web') {
    return webFirestore.limit(value);
  } else {
    return { type: 'limit', value };
  }
};

/**
 * Create a startAfter constraint
 */
export const startAfter = (value: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.startAfter(value);
  } else {
    return { type: 'startAfter', value };
  }
};

/**
 * Create a query with constraints
 */
export const createQuery = (collectionRef: any, ...constraints: any[]) => {
  if (Platform.OS === 'web') {
    return webFirestore.query(collectionRef, ...constraints);
  } else {
    // React Native Firebase uses chaining
    let query = collectionRef;
    
    for (const constraint of constraints) {
      if (constraint.type === 'where') {
        query = query.where(constraint.field, constraint.operator, constraint.value);
      } else if (constraint.type === 'orderBy') {
        query = query.orderBy(constraint.field, constraint.direction);
      } else if (constraint.type === 'limit') {
        query = query.limit(constraint.value);
      } else if (constraint.type === 'startAfter') {
        query = query.startAfter(constraint.value);
      }
    }
    
    return query;
  }
};

/**
 * Get documents from a query
 */
export const getDocs = async (query: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.getDocs(query);
  } else {
    return query.get();
  }
};

/**
 * Get count from server
 */
export const getCountFromServer = async (query: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.getCountFromServer(query);
  } else {
    // React Native Firebase doesn't have getCountFromServer, we need to get docs and count
    const snapshot = await query.get();
    return { data: { count: snapshot.size } };
  }
};

/**
 * Process query results to extract docs array (platform-independent)
 */
export const getDocsArray = (snapshot: any) => {
  const docs = Platform.OS === 'web' ? snapshot.docs : snapshot.docs;
  
  // Normalize document structure so consuming code can use doc.data consistently
  return docs.map((doc: any) => ({
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
  if (Platform.OS === 'web') {
    return webAuth.signInWithEmailAndPassword(auth, email, password);
  } else {
    return auth.signInWithEmailAndPassword(email, password);
  }
};

/**
 * Sign in with popup (web only)
 */
export const signInWithPopup = async (provider: any) => {
  if (Platform.OS === 'web') {
    return webAuth.signInWithPopup(auth, provider);
  } else {
    throw new Error('signInWithPopup is only available on web platform');
  }
};

/**
 * Sign in with credential
 */
export const signInWithCredential = async (credential: any) => {
  if (Platform.OS === 'web') {
    return webAuth.signInWithCredential(auth, credential);
  } else {
    return auth.signInWithCredential(credential);
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (Platform.OS === 'web') {
    return webAuth.signOut(auth);
  } else {
    return auth.signOut();
  }
};

/**
 * Set up auth state listener
 */
export const onAuthStateChanged = (callback: any) => {
  if (Platform.OS === 'web') {
    return webAuth.onAuthStateChanged(auth, callback);
  } else {
    return auth.onAuthStateChanged(callback);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  if (Platform.OS === 'web') {
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
  if (Platform.OS === 'web') {
    const provider = webAuth.GoogleAuthProvider;
    return {
      ...provider,
      credential: provider.credential,
    };
  } else {
    const authModule = require('@react-native-firebase/auth');
    return authModule.default.GoogleAuthProvider;
  }
})();

/**
 * Create Google Auth Provider instance (web only)
 */
export const createGoogleAuthProvider = () => {
  if (Platform.OS === 'web') {
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
 * Check if the current platform is web
 */
export const isWeb = () => Platform.OS === 'web';

/**
 * Check if the current platform is React Native (Android/iOS)
 */
export const isReactNative = () => Platform.OS !== 'web';

/**
 * Get platform-specific error handling
 */
export const handleFirebaseError = (error: any, operation: string) => {
  console.error(`Firebase ${operation} error:`, error);
  
  // Add platform-specific error handling if needed
  if (Platform.OS === 'web') {
    // Web-specific error handling
  } else {
    // React Native-specific error handling
  }
  
  return error;
};