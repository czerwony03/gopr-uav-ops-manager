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
 * 
 * Platform differences are abstracted at the import level to avoid code duplication.
 */

// Import Firebase instances from config
import { auth, firestore } from '@/firebaseConfig';

// Platform-aware function imports - all differences handled here
let firestoreFunctions: any;
let authFunctions: any;
let Timestamp: any;

if (isWeb()) {
  // Web Firebase SDK
  const webFirestore = require('firebase/firestore');
  const webAuth = require('firebase/auth');
  
  firestoreFunctions = {
    collection: webFirestore.collection,
    doc: webFirestore.doc,
    getDoc: webFirestore.getDoc,
    addDoc: webFirestore.addDoc,
    updateDoc: webFirestore.updateDoc,
    setDoc: webFirestore.setDoc,
    deleteDoc: webFirestore.deleteDoc,
    where: webFirestore.where,
    orderBy: webFirestore.orderBy,
    limit: webFirestore.limit,
    startAfter: webFirestore.startAfter,
    query: webFirestore.query,
    getDocs: webFirestore.getDocs,
    getCountFromServer: webFirestore.getCountFromServer,
  };
  
  authFunctions = {
    signInWithEmailAndPassword: webAuth.signInWithEmailAndPassword,
    signInWithPopup: webAuth.signInWithPopup,
    signInWithCredential: webAuth.signInWithCredential,
    signOut: webAuth.signOut,
    onAuthStateChanged: webAuth.onAuthStateChanged,
    GoogleAuthProvider: webAuth.GoogleAuthProvider,
  };
  
  Timestamp = webFirestore.Timestamp;
} else {
  // React Native Firebase SDK - modular imports for v22+
  const rnFirestore = require('@react-native-firebase/firestore');
  const rnAuth = require('@react-native-firebase/auth');
  
  firestoreFunctions = {
    collection: rnFirestore.collection,
    doc: rnFirestore.doc,
    getDoc: rnFirestore.getDoc,
    addDoc: rnFirestore.addDoc,
    updateDoc: rnFirestore.updateDoc,
    setDoc: rnFirestore.setDoc,
    deleteDoc: rnFirestore.deleteDoc,
    where: rnFirestore.where,
    orderBy: rnFirestore.orderBy,
    limit: rnFirestore.limit,
    startAfter: rnFirestore.startAfter,
    query: rnFirestore.query,
    getDocs: rnFirestore.getDocs,
    getCountFromServer: rnFirestore.getCountFromServer,
  };
  
  authFunctions = {
    signInWithEmailAndPassword: rnAuth.signInWithEmailAndPassword,
    signInWithPopup: null, // Not available on React Native
    signInWithCredential: rnAuth.signInWithCredential,
    signOut: rnAuth.signOut,
    onAuthStateChanged: rnAuth.onAuthStateChanged,
    GoogleAuthProvider: rnAuth.GoogleAuthProvider,
  };
  
  Timestamp = rnFirestore.Timestamp;
}

// ============================================================================
// FIRESTORE UTILITIES
// ============================================================================

/**
 * Get a collection reference
 */
export const getCollection = (collectionName: string) => {
  return firestoreFunctions.collection(firestore, collectionName);
};

/**
 * Get a document reference
 */
export const getDocument = (collectionName: string, docId: string) => {
  return firestoreFunctions.doc(firestore, collectionName, docId);
};

/**
 * Get document data
 */
export const getDocumentData = async (docRef: any) => {
  const docSnap = await firestoreFunctions.getDoc(docRef);
  return { exists: docSnap.exists(), data: docSnap.data() };
};

/**
 * Add a new document to a collection
 */
export const addDocument = async (collectionRef: any, data: any) => {
  return firestoreFunctions.addDoc(collectionRef, data);
};

/**
 * Update a document
 */
export const updateDocument = async (docRef: any, data: any) => {
  return firestoreFunctions.updateDoc(docRef, data);
};

/**
 * Set document data
 */
export const setDocument = async (docRef: any, data: any) => {
  return firestoreFunctions.setDoc(docRef, data);
};

/**
 * Delete a document
 */
export const deleteDocument = async (docRef: any) => {
  return firestoreFunctions.deleteDoc(docRef);
};

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

/**
 * Sign in with email and password
 */
export const signInWithEmailAndPassword = async (email: string, password: string) => {
  return authFunctions.signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign in with popup (web only)
 */
export const signInWithPopup = async (provider: any) => {
  if (!authFunctions.signInWithPopup) {
    throw new Error('signInWithPopup is only available on web platform');
  }
  return authFunctions.signInWithPopup(auth, provider);
};

/**
 * Sign in with credential
 */
export const signInWithCredential = async (credential: any) => {
  return authFunctions.signInWithCredential(auth, credential);
};

/**
 * Sign out
 */
export const signOut = async () => {
  return authFunctions.signOut(auth);
};

/**
 * Set up auth state listener
 */
export const onAuthStateChanged = (callback: any) => {
  return authFunctions.onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

// ============================================================================
// AUTH PROVIDERS
// ============================================================================

/**
 * Google Auth Provider utilities
 */
export const GoogleAuthProvider = authFunctions.GoogleAuthProvider;

/**
 * Create Google Auth Provider instance (web only)
 */
export const createGoogleAuthProvider = () => {
  if (isWeb()) {
    return new authFunctions.GoogleAuthProvider();
  } else {
    throw new Error('createGoogleAuthProvider is only available on web platform');
  }
};

// ============================================================================
// QUERY UTILITIES
// ============================================================================

/**
 * Create a where constraint
 */
export const where = (field: string, operator: any, value: any) => {
  return firestoreFunctions.where(field, operator, value);
};

/**
 * Create an orderBy constraint
 */
export const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => {
  return firestoreFunctions.orderBy(field, direction);
};

/**
 * Create a limit constraint
 */
export const limit = (value: number) => {
  return firestoreFunctions.limit(value);
};

/**
 * Create a startAfter constraint
 */
export const startAfter = (value: any) => {
  return firestoreFunctions.startAfter(value);
};

/**
 * Create a query with constraints
 */
export const createQuery = (collectionRef: any, ...constraints: any[]) => {
  return firestoreFunctions.query(collectionRef, ...constraints);
};

/**
 * Get documents from a query
 */
export const getDocs = async (query: any) => {
  return firestoreFunctions.getDocs(query);
};

/**
 * Get count from server
 */
export const getCountFromServer = async (query: any) => {
  const snapshot = await firestoreFunctions.getCountFromServer(query);
  return { data: snapshot.data() };
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
 * Process query results to extract docs array (platform-independent)
 */
export const getDocsArray = (snapshot: any) => {
  // Normalize document structure so consuming code can use doc.data consistently
  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    data: typeof doc.data === 'function' ? doc.data() : doc.data
  }));
};

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
