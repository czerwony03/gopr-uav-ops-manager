import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebaseConfig';

export type UserRole = 'user' | 'manager' | 'admin';

// Legacy interface for backward compatibility
export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          // Fetch user role from Firestore
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role: UserRole = 'user'; // Default role
          if (userDoc.exists()) {
            const userData = userDoc.data();
            role = userData.role as UserRole || 'user';
          } else {
              // Create user document if it doesn't exist
              await setDoc(userDocRef, {
                  email: firebaseUser.email || '',
                  role: role,
              });
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role,
          });
        } catch (error) {
          console.error('Error fetching user role:', error);
          // Set user with default role if Firestore fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'user',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
