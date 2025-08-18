import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebaseConfig';
import { User as FullUser } from '../types/User';
import { UserService } from '../services/userService';
import { AuditLogService } from '../services/auditLogService';

export type UserRole = 'user' | 'manager' | 'admin';

// Extended interface that includes all user profile data
export interface UserData extends FullUser {
  uid: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
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

  const loadFullUserData = async (firebaseUser: User): Promise<UserData | null> => {
    try {
      // First, get or create the basic user document
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let role: UserRole = 'user';
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

      // Update last login timestamp
      try {
        await UserService.updateLastLogin(firebaseUser.uid);
      } catch (error) {
        console.warn('Could not update last login timestamp:', error);
      }

      // Create audit log for successful login
      try {
        await AuditLogService.createAuditLog({
          entityType: 'user',
          entityId: firebaseUser.uid,
          action: 'login',
          userId: firebaseUser.uid,
          userEmail: firebaseUser.email || undefined,
          details: 'Successful login',
        });
      } catch (error) {
        console.warn('Could not create login audit log:', error);
      }

      // Now fetch the full user data using UserService
      try {
        const fullUserData = await UserService.getUser(firebaseUser.uid, role, firebaseUser.uid);
        if (fullUserData) {
          return fullUserData as UserData;
        }
      } catch (error) {
        console.warn('Could not fetch full user data, using basic data:', error);
      }

      // Fallback to basic user data if full data is not available
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role,
      } as UserData;
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set user with default role if Firestore fails
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: 'user',
      } as UserData;
    }
  };

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (currentUser && user) {
      setLoading(true);
      try {
        const updatedUserData = await loadFullUserData(currentUser);
        setUser(updatedUserData);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const userData = await loadFullUserData(firebaseUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
