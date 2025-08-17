import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword, signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Configure WebBrowser for better mobile OAuth experience
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Google OAuth configuration
const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
  redirectUri: AuthSession.makeRedirectUri({
    scheme: 'dev.redmed.gopruavopsmanager',
    path: 'auth',
  }),
  scopes: ['openid', 'profile', 'email'],
  additionalParameters: {
    hd: 'bieszczady.gopr.pl', // Restrict to Google Workspace domain
  },
  responseType: AuthSession.ResponseType.Code,
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web platform: Use Firebase signInWithPopup
        await handleWebGoogleLogin();
      } else {
        // Mobile platforms: Use Expo Auth Session
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
    console.log('Google sign-in successful:', result.user.email);
  };

  const handleMobileGoogleLogin = async () => {
    try {
      // Generate code verifier and challenge for PKCE
      const codeVerifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Build authorization URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_OAUTH_CONFIG.clientId}&` +
        `redirect_uri=${encodeURIComponent(GOOGLE_OAUTH_CONFIG.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(GOOGLE_OAUTH_CONFIG.scopes.join(' '))}&` +
        `hd=bieszczady.gopr.pl&` +
        `code_challenge=${codeVerifier}&` +
        `code_challenge_method=S256`;

      // Open OAuth flow
      const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_OAUTH_CONFIG.redirectUri);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GOOGLE_OAUTH_CONFIG.clientId!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
            code_verifier: codeVerifier,
          }).toString(),
        });

        const tokens = await tokenResponse.json();
        
        if (!tokens.id_token) {
          throw new Error('No ID token received');
        }

        // Verify domain restriction
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });
        
        const userData = await userInfo.json();
        
        if (!userData.email || !userData.email.endsWith('@bieszczady.gopr.pl')) {
          throw new Error('Only @bieszczady.gopr.pl users are allowed');
        }

        // Create Firebase credential and sign in
        const credential = GoogleAuthProvider.credential(tokens.id_token);
        const firebaseResult = await signInWithCredential(auth, credential);
        
        console.log('Mobile Google sign-in successful:', firebaseResult.user.email);
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled');
      } else {
        throw new Error('Authentication failed');
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
      if (error.message?.includes('cancelled')) {
        errorMessage = 'Google sign-in was cancelled.';
      } else if (error.message?.includes('@bieszczady.gopr.pl')) {
        errorMessage = 'Only @bieszczady.gopr.pl users are allowed to sign in.';
      } else if (error.message?.includes('No authorization code')) {
        errorMessage = 'Authentication failed. Please try again.';
      } else if (error.message?.includes('No ID token')) {
        errorMessage = 'Authentication failed. Please check your internet connection.';
      }
    }

    Alert.alert('Google Login Failed', errorMessage);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation will be handled by the auth state change in AuthContext
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>GOPR UAV Ops Manager</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
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
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

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

        <Text style={styles.infoText}>
          Contact your administrator for account access
        </Text>
        <Text style={styles.googleInfoText}>
          Google Workspace sign-in is restricted to @bieszczady.gopr.pl domain
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
