const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
};

// Mock Firebase Auth functions
const signInWithEmailAndPassword = jest.fn();
const signOut = jest.fn();
const getCurrentUser = jest.fn();
const onAuthStateChanged = jest.fn();

// Mock Google Auth functions
const signInWithPopup = jest.fn();
const signInWithCredential = jest.fn();
const GoogleAuthProvider = {
  credential: jest.fn(),
};
const createGoogleAuthProvider = jest.fn(() => ({
  setCustomParameters: jest.fn(),
}));

// Mock Firestore functions
const getDocument = jest.fn();
const getDocumentData = jest.fn();
const setDocument = jest.fn();

module.exports = {
  signInWithEmailAndPassword,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  createGoogleAuthProvider,
  getDocument,
  getDocumentData,
  setDocument,
  mockAuth,
};