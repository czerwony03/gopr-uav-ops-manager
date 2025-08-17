import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCjOcNPEYj3PSOA4VFY1wakalJmEYBdFlY",
  authDomain: "gopr-uav-ops-manager.firebaseapp.com",
  projectId: "gopr-uav-ops-manager",
  storageBucket: "gopr-uav-ops-manager.firebasestorage.app",
  messagingSenderId: "23394650584",
  appId: "1:23394650584:web:53c833aa191391734a4aad",
  measurementId: "G-RMHQ02Q0KX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const firestore = getFirestore(app);
export const db = firestore; // Alias for compatibility with existing code

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
