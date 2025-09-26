import { Platform } from 'react-native';
import { DocumentReference, CollectionReference, QuerySnapshot } from 'firebase/firestore';

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
import { auth, firestore, storage, analytics } from '@/firebaseConfig';

// Platform-aware function imports - all differences handled here
let firestoreFunctions: any;
let authFunctions: any;
let storageFunctions: any;
let analyticsFunctions: any;
let Timestamp: any;

if (isWeb()) {
  // Web Firebase SDK
  const webFirestore = require('firebase/firestore');
  const webAuth = require('firebase/auth');
  const webStorage = require('firebase/storage');
  
  // Only import analytics if not in test environment
  let webAnalytics: any = null;
  if (process.env.NODE_ENV !== 'test') {
    webAnalytics = require('firebase/analytics');
  }
  
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
  
  storageFunctions = {
    ref: webStorage.ref,
    uploadBytes: webStorage.uploadBytes,
    getDownloadURL: webStorage.getDownloadURL,
    deleteObject: webStorage.deleteObject,
  };

  analyticsFunctions = {
    logEvent: webAnalytics?.logEvent || null,
    setUserId: webAnalytics?.setUserId || null,
    setUserProperties: webAnalytics?.setUserProperties || null,
    setCurrentScreen: webAnalytics?.setCurrentScreen || null,
  };
  
  Timestamp = webFirestore.Timestamp;
} else {
  // React Native Firebase SDK - modular imports for v22+
  const rnFirestore = require('@react-native-firebase/firestore');
  const rnAuth = require('@react-native-firebase/auth');
  const rnStorage = require('@react-native-firebase/storage');

  // Only import analytics if not in test environment
  let rnAnalytics: any = null;
  let rnAnalyticsModular: any = null;
  if (process.env.NODE_ENV !== 'test' && process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false') {
    rnAnalytics = require('@react-native-firebase/analytics');
    rnAnalyticsModular = require('@react-native-firebase/analytics/lib/modular');
  }
  
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
  
  storageFunctions = {
    ref: rnStorage.ref,
    putFile: rnStorage.putFile,
    getDownloadURL: rnStorage.getDownloadURL,
    deleteObject: rnStorage.deleteObject,
  };

  analyticsFunctions = {
    logEvent: rnAnalyticsModular?.logEvent || null,
    setUserId: rnAnalyticsModular?.setUserId || null,
    setUserProperties: rnAnalyticsModular?.setUserProperties || null,
  };
  
  Timestamp = rnFirestore.Timestamp;
}

// ============================================================================
// FIRESTORE UTILITIES
// ============================================================================

/**
 * Get a collection reference
 */
export const getCollection = (collectionName: string): CollectionReference => {
  return firestoreFunctions.collection(firestore, collectionName);
};

/**
 * Get a document reference
 */
export const getDocument = (collectionName: string, docId: string): DocumentReference => {
  return firestoreFunctions.doc(firestore, collectionName, docId);
};

/**
 * Get document data with retry logic
 */
export const getDocumentData = async (docRef: any): Promise<{ exists: boolean; data: any }> => {
  return withRetry(
    async () => {
      const docSnap = await firestoreFunctions.getDoc(docRef);
      return { exists: docSnap.exists(), data: docSnap.data() };
    },
    'getDocumentData'
  );
};

/**
 * Add a new document to a collection with retry logic
 */
export const addDocument = async (collectionRef: any, data: any): Promise<DocumentReference> => {
  return withRetry(
    () => firestoreFunctions.addDoc(collectionRef, data),
    'addDocument'
  );
};

/**
 * Update a document with retry logic
 */
export const updateDocument = async (docRef: any, data: any) => {
  return withRetry(
    () => firestoreFunctions.updateDoc(docRef, data),
    'updateDocument'
  );
};

/**
 * Set document data with retry logic
 */
export const setDocument = async (docRef: any, data: any) => {
  return withRetry(
    () => firestoreFunctions.setDoc(docRef, data),
    'setDocument'
  );
};

/**
 * Delete a document with retry logic
 */
export const deleteDocument = async (docRef: any) => {
  return withRetry(
    () => firestoreFunctions.deleteDoc(docRef),
    'deleteDocument'
  );
};

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Create a storage reference
 */
export const getStorageRef = (path: string) => {
  return storageFunctions.ref(storage, path);
};

/**
 * Upload file to storage with retry logic - platform-aware
 * @param storageRef Storage reference
 * @param data Blob for web, file path for React Native
 * @param metadata Optional metadata
 */
export const uploadFile = async (storageRef: any, data: Blob | string, metadata?: any) => {
  return withRetry(
    () => {
      if (isWeb()) {
        // Web: use uploadBytes with Blob
        return storageFunctions.uploadBytes(storageRef, data as Blob, metadata);
      } else {
        // React Native: use putFile with file path
        return storageFunctions.putFile(storageRef, data as string, metadata);
      }
    },
    'uploadFile'
  );
};

/**
 * @deprecated Use uploadFile instead for platform compatibility
 */
export const uploadBytes = uploadFile;

/**
 * Get download URL from storage reference with retry logic
 */
export const getDownloadURL = async (storageRef: any): Promise<string> => {
  return withRetry(
    () => storageFunctions.getDownloadURL(storageRef),
    'getDownloadURL'
  );
};

/**
 * Delete object from storage with retry logic
 */
export const deleteObject = async (storageRef: any) => {
  return withRetry(
    () => storageFunctions.deleteObject(storageRef),
    'deleteObject'
  );
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
 * Get documents from a query with retry logic
 */
export const getDocs = async (query: any): Promise<QuerySnapshot> => {
  return withRetry(
    () => firestoreFunctions.getDocs(query),
    'getDocs'
  );
};

/**
 * Get count from server with retry logic
 */
export const getCountFromServer = async (query: any) => {
  return withRetry(
    async () => {
      const snapshot = await firestoreFunctions.getCountFromServer(query);
      return { data: snapshot.data() };
    },
    'getCountFromServer'
  );
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
// RETRY UTILITIES
// ============================================================================

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Error codes that should trigger a retry
 */
const RETRYABLE_ERROR_CODES = [
  'unavailable',
  'deadline-exceeded',
  'internal',
  'resource-exhausted',
  'aborted',
  'timeout'
];

/**
 * Check if an error is retryable based on its code
 */
const isRetryableError = (error: any): boolean => {
  if (!error || typeof error !== 'object') return false;
  
  const errorCode = error.code || error.status || '';
  return RETRYABLE_ERROR_CODES.includes(errorCode.toLowerCase());
};

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const delayWithJitter = exponentialDelay + (Math.random() * 1000); // Add up to 1s jitter
  return Math.min(delayWithJitter, config.maxDelayMs);
};

/**
 * Generic retry wrapper for Firestore operations
 */
const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Log the error for debugging
      console.warn(`Firebase ${operationName} attempt ${attempt}/${config.maxAttempts} failed:`, error);
      
      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === config.maxAttempts || !isRetryableError(error)) {
        break;
      }
      
      // Calculate delay and wait before retrying
      const delayMs = calculateRetryDelay(attempt, config);
      console.log(`Retrying ${operationName} in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
  
  // If we get here, all retries failed
  console.error(`Firebase ${operationName} failed after ${config.maxAttempts} attempts:`, lastError);
  throw lastError;
};

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
 * Export retry utilities for advanced usage
 */
export const retryUtils = {
  withRetry,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
  RETRYABLE_ERROR_CODES
};

/**
 * Configure global retry behavior
 */
export const configureRetry = (config: Partial<RetryConfig>) => {
  Object.assign(DEFAULT_RETRY_CONFIG, config);
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

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

/**
 * Check if analytics is available and enabled
 */
export const isAnalyticsEnabled = (): boolean => {
  return analytics !== null && analytics !== undefined;
};

/**
 * Log a custom event to Firebase Analytics
 */
export const logAnalyticsEvent = async (eventName: string, eventParams?: { [key: string]: any }): Promise<void> => {
  if (!isAnalyticsEnabled()) {
    console.log(`[Analytics] Skipping event '${eventName}' - Analytics disabled or not available`);
    return;
  }

  try {
    if (isWeb()) {
      // Web Analytics
      if (analyticsFunctions.logEvent) {
        await analyticsFunctions.logEvent(analytics, eventName, eventParams);
      }
    } else {
      // React Native Analytics - Use modular functions for v22+ compatibility
      if (analyticsFunctions.logEvent) {
        await analyticsFunctions.logEvent(analytics, eventName, eventParams);
      }
    }
    console.log(`[Analytics] Event logged: ${eventName}`, eventParams);
  } catch (error) {
    console.warn(`[Analytics] Failed to log event '${eventName}':`, error);
  }
};

/**
 * Set user ID for analytics
 */
export const setAnalyticsUserId = async (userId: string | null): Promise<void> => {
  if (!isAnalyticsEnabled()) {
    console.log(`[Analytics] Skipping setUserId - Analytics disabled or not available`);
    return;
  }

  try {
    if (isWeb()) {
      // Web Analytics
      if (analyticsFunctions.setUserId) {
        await analyticsFunctions.setUserId(analytics, userId);
      }
    } else {
      // React Native Analytics - Use modular functions for v22+ compatibility
      if (analyticsFunctions.setUserId) {
        await analyticsFunctions.setUserId(analytics, userId);
      }
    }
    console.log(`[Analytics] User ID set:`, userId ? 'authenticated' : 'cleared');
  } catch (error) {
    console.warn(`[Analytics] Failed to set user ID:`, error);
  }
};

/**
 * Set user properties for analytics
 */
export const setAnalyticsUserProperties = async (properties: { [key: string]: string | null }): Promise<void> => {
  if (!isAnalyticsEnabled()) {
    console.log(`[Analytics] Skipping setUserProperties - Analytics disabled or not available`);
    return;
  }

  try {
    if (isWeb()) {
      // Web Analytics
      if (analyticsFunctions.setUserProperties) {
        await analyticsFunctions.setUserProperties(analytics, properties);
      }
    } else {
      // React Native Analytics - Use modular functions for v22+ compatibility
      if (analyticsFunctions.setUserProperties) {
        await analyticsFunctions.setUserProperties(analytics, properties);
      }
    }
    console.log(`[Analytics] User properties set:`, properties);
  } catch (error) {
    console.warn(`[Analytics] Failed to set user properties:`, error);
  }
};

/**
 * Set current screen for analytics
 */
export const setAnalyticsCurrentScreen = async (screenName: string, screenClass?: string): Promise<void> => {
  if (!isAnalyticsEnabled()) {
    console.log(`[Analytics] Skipping setCurrentScreen - Analytics disabled or not available`);
    return;
  }

  try {
    if (isWeb()) {
      // Web Analytics - use logEvent for page_view
      if (analyticsFunctions.logEvent) {
        await analyticsFunctions.logEvent(analytics, 'page_view', {
          page_title: screenName,
          page_location: screenClass || screenName,
        });
      }
    } else {
      // React Native Analytics - Use modular logEvent with screen_view for v22+ compatibility  
      if (analyticsFunctions.logEvent) {
        await analyticsFunctions.logEvent(analytics, 'screen_view', {
          firebase_screen: screenName,
          firebase_screen_class: screenClass || screenName,
        });
      }
    }
    console.log(`[Analytics] Current screen set: ${screenName}${screenClass ? ` (${screenClass})` : ''}`);
  } catch (error) {
    console.warn(`[Analytics] Failed to set current screen:`, error);
  }
};

/**
 * Analytics utility functions export
 */
export const analyticsUtils = {
  isEnabled: isAnalyticsEnabled,
  logEvent: logAnalyticsEvent,
  setUserId: setAnalyticsUserId,
  setUserProperties: setAnalyticsUserProperties,
  setCurrentScreen: setAnalyticsCurrentScreen,
};
