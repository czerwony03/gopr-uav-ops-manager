import React, {createContext, useContext, useEffect, useState} from 'react';
import {onAuthStateChanged, User} from 'firebase/auth';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {auth, firestore} from '@/firebaseConfig';
import {User as FullUser} from '../types/User';
import {UserService} from '@/services/userService';
import {UserRole} from "@/types/UserRole";
import {changeLanguage} from '@/src/i18n';

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
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  const loadFullUserData = async (firebaseUser: User): Promise<UserData | null> => {
    if (isLoadingUserData) {
      console.log('[AuthContext] Already loading user data, skipping duplicate request');
      return null;
    }
    
    setIsLoadingUserData(true);
    console.log('[AuthContext] Loading full user data for:', firebaseUser.uid, firebaseUser.email);
    try {
      // First, get or create the basic user document
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      console.log('[AuthContext] User document exists:', userDoc.exists());
      
      let role: UserRole = UserRole.USER;
      if (userDoc.exists()) {
        const userData = userDoc.data();
        role = userData.role as UserRole || UserRole.USER;
        console.log('[AuthContext] Found existing user with role:', role);
      } else {
        console.log('[AuthContext] Creating new user document with default role');
        // Create user document if it doesn't exist
        await setDoc(userDocRef, {
          email: firebaseUser.email || '',
          role: role,
        });
      }

      // Update last login timestamp
      try {
        await UserService.updateLastLogin(firebaseUser.uid);
        console.log('[AuthContext] Successfully updated last login timestamp');
      } catch (error) {
        console.warn('Could not update last login timestamp:', error);
      }

      // Now fetch the full user data using UserService
      try {
        console.log('[AuthContext] Fetching full user data from UserService');
        const fullUserData = await UserService.getUser(firebaseUser.uid, role, firebaseUser.uid);
        if (fullUserData) {
          console.log('[AuthContext] Successfully loaded full user data');
          
          // Apply user's language preference if set
          if (fullUserData.language && (fullUserData.language === 'pl' || fullUserData.language === 'en')) {
            console.log('[AuthContext] Applying user language preference:', fullUserData.language);
            try {
              await changeLanguage(fullUserData.language);
            } catch (languageError) {
              console.warn('[AuthContext] Failed to change language:', languageError);
            }
          }
          
          return fullUserData as UserData;
        }
        console.log('[AuthContext] No full user data returned from UserService');
      } catch (error) {
        console.warn('Could not fetch full user data, using basic data:', error);
      }

      // Fallback to basic user data if full data is not available
      console.log('[AuthContext] Using fallback basic user data');
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role,
      } as UserData;
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set user with default role if Firestore fails
      console.log('[AuthContext] Using error fallback user data');
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: 'user',
      } as UserData;
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    console.log('[AuthContext] refreshUser called, currentUser:', currentUser?.uid, 'existing user:', user?.uid);
    if (currentUser && user) {
      setLoading(true);
      try {
        const updatedUserData = await loadFullUserData(currentUser);
        console.log('[AuthContext] refreshUser: setting updated user data');
        setUser(updatedUserData);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener');
    
    // Check if Firebase is properly configured
    if (!auth) {
      console.error('[AuthContext] Firebase auth is not initialized properly');
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      console.log('[AuthContext] Auth state changed, firebaseUser:', firebaseUser?.uid, firebaseUser?.email);

      if (firebaseUser) {
        console.log('[AuthContext] User is authenticated, loading user data');
        try {
          const userData = await loadFullUserData(firebaseUser);
          if (userData) {
            console.log('[AuthContext] Setting user data:', userData?.uid);
            setUser(userData);
          }
        } catch (error) {
          console.error('[AuthContext] Error loading user data in auth state change:', error);
          // Set basic user data if full loading fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'user',
          } as UserData);
        }
      } else {
        console.log('[AuthContext] User is not authenticated, clearing user data');
        setUser(null);
      }
      console.log('[AuthContext] Setting loading to false');
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
