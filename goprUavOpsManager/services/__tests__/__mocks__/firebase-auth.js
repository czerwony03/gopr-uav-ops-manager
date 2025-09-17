const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  setPersistence: jest.fn(),
};

const getAuth = jest.fn(() => mockAuth);
const signInWithEmailAndPassword = jest.fn().mockResolvedValue({});
const signOut = jest.fn().mockResolvedValue(undefined);
const onAuthStateChanged = jest.fn();
const setPersistence = jest.fn().mockResolvedValue(undefined);
const browserLocalPersistence = {};

module.exports = {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
};