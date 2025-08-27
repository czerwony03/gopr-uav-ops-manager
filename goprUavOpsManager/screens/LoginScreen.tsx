import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { auth } from '@/firebaseConfig';

// Platform-aware Firebase imports
let signInWithEmailAndPassword: any;
let signInWithPopup: any;
let signInWithCredential: any;
let GoogleAuthProvider: any;

if (Platform.OS === 'web') {
  // Web Firebase SDK
  const firebaseAuth = require('firebase/auth');
  signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword;
  signInWithPopup = firebaseAuth.signInWithPopup;
  signInWithCredential = firebaseAuth.signInWithCredential;
  GoogleAuthProvider = firebaseAuth.GoogleAuthProvider;
} else {
  // React Native Firebase SDK - auth is already an instance
  const authModule = require('@react-native-firebase/auth');
  // For React Native Firebase, these are methods on the auth instance
  signInWithEmailAndPassword = (email: string, password: string) => auth.signInWithEmailAndPassword(email, password);
  signInWithCredential = (credential: any) => auth.signInWithCredential(credential);
  // GoogleAuthProvider is a static class on the auth module
  GoogleAuthProvider = authModule.default.GoogleAuthProvider;
}
import {AuditLogService} from "@/services/auditLogService";
import {User} from "@/types/User";
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

// Configure Google Sign-In for mobile platforms
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_WEB_GOOGLE_OAUTH_CLIENT_ID!, // From Firebase Console
    hostedDomain: 'bieszczady.gopr.pl', // Restrict to Google Workspace domain
  });
}

export default function LoginScreen() {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const crossPlatformAlert = useCrossPlatformAlert();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web platform: Use Firebase signInWithPopup
        await handleWebGoogleLogin();
      } else {
        // Mobile platforms: Use React Native Google Sign-In
        await handleMobileGoogleLogin();
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      handleGoogleLoginError(error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleWebGoogleLogin = async () => {
    // Create Google Auth Provider with domain restriction
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'bieszczady.gopr.pl' // Restrict to Google Workspace domain
    });
    
    // Firebase will handle the OAuth flow and domain restriction is managed server-side
    const result = await signInWithPopup(auth, provider);
    await addLoginAuditLog();
    console.log('Google sign-in successful:', result.user.email);
  };

  const handleMobileGoogleLogin = async () => {
    try {
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get the user's ID token
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      // Create a Google credential with the token (React Native Firebase API)
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Sign in the user with the credential using React Native Firebase
      const firebaseResult = await signInWithCredential(googleCredential);
      
      console.log('Mobile Google sign-in successful:', firebaseResult.user.email);
      await addLoginAuditLog();
      
      // Verify domain restriction (additional check for security)
      if (!firebaseResult.user.email?.endsWith('@bieszczady.gopr.pl')) {
        await auth.signOut();
        throw new Error('Only @bieszczady.gopr.pl users are allowed');
      }
    } catch (error: any) {
      console.error('Mobile Google login error:', error);
      throw error;
    }
  };

  const handleGoogleLoginError = (error: any) => {
    let errorMessage = error.message || 'An error occurred during Google login';

    // Provide helpful error messages for common issues
    if (Platform.OS === 'web') {
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Google sign-in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by the browser. Please allow popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in. Contact your administrator.';
      }
    } else {
      // Mobile-specific error handling
      if (error.code === 'SIGN_IN_CANCELLED' || error.message?.includes('cancelled')) {
        errorMessage = 'Google sign-in was cancelled.';
      } else if (error.message?.includes('@bieszczady.gopr.pl')) {
        errorMessage = 'Only @bieszczady.gopr.pl users are allowed to sign in.';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services is not available on this device.';
      } else if (error.code === 'SIGN_IN_REQUIRED') {
        errorMessage = 'Google sign-in is required. Please try again.';
      }
    }

    crossPlatformAlert.showAlert({ title: 'Google Login Failed', message: errorMessage });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      crossPlatformAlert.showAlert({ title: 'Error', message: 'Please enter both email and password' });
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(email, password);
      }
      await addLoginAuditLog();
      // Navigation will be handled by the auth state change in AuthContext
    } catch (error: any) {
      console.error('Login error:', error);
      crossPlatformAlert.showAlert({ title: 'Login Failed', message: error.message || 'An error occurred during login' });
    } finally {
      setLoading(false);
    }
  };

  const addLoginAuditLog = async () => {
      // Create audit log for successful login
      try {
          if (auth.currentUser) {
              await AuditLogService.createAuditLog({
                  entityType: 'user',
                  entityId: auth.currentUser.uid,
                  action: 'login',
                  userId: auth.currentUser.uid,
                  userEmail: auth.currentUser.email as string,
                  details: 'Successful login',
              });
          }
      } catch (error) {
          console.warn('Could not create login audit log:', error);
      }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>GOPR UAV Ops Manager</Text>
          <Text style={styles.subtitle}>{t('auth.signIn')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === 'web' ? (
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.disabledButton]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333333" />
              ) : (
                <Text style={styles.googleButtonText}>Sign in with Google Workspace</Text>
              )}
            </TouchableOpacity>
          ) : (
            <GoogleSigninButton
              style={styles.googleSigninButton}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Light}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            />
          )}

          <Text style={styles.infoText}>
            {t('common.contactAdmin')}
          </Text>
          <Text style={styles.googleInfoText}>
            Google Workspace sign-in is restricted to @bieszczady.gopr.pl domain
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000000',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleSigninButton: {
    width: '100%',
    height: 48,
    marginBottom: 10,
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleInfoText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
