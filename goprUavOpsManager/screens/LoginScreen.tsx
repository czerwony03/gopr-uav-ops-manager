import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth configuration
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  // Note: These credentials should be configured in Google Cloud Console and Firebase Console
  // For production, these should be moved to environment variables
  const GOOGLE_CLIENT_ID = '23394650584-kgfq1hfb5n7j8k2l3m4n5o6p7q8r9s0t.apps.googleusercontent.com';
  // Client secret is required for web applications using Authorization Code flow
  // In production, this should be stored securely (not in client code) or use a backend service
  // WARNING: Replace this placeholder with the actual client secret from Google Cloud Console
  const GOOGLE_CLIENT_SECRET = 'GOCSPX-placeholder_client_secret_replace_with_actual';

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'com.gopr.uavopsmanager'
      }),
      extraParams: {
        hd: 'bieszczady.gopr.pl', // Restrict to Google Workspace domain
      },
    },
    discovery
  );

  const validateDomain = (email: string): boolean => {
    return email.endsWith('@bieszczady.gopr.pl');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      
      if (result?.type === 'success') {
        const { code } = result.params;
        
        // Exchange authorization code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            code,
            extraParams: {
              code_verifier: request?.codeVerifier || '',
            },
            redirectUri: AuthSession.makeRedirectUri({
              scheme: 'com.gopr.uavopsmanager'
            }),
          },
          discovery
        );

        const { accessToken, idToken } = tokenResponse;
        
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }
        
        // Decode the ID token to get user info (basic JWT decode)
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const userEmail = payload.email;
        
        // Validate domain
        if (!validateDomain(userEmail)) {
          Alert.alert(
            'Access Denied',
            'Only users with @bieszczady.gopr.pl email addresses can sign in with Google Workspace.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Create Firebase credential and sign in
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(auth, credential);
        
        // Navigation will be handled by the auth state change in AuthContext
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      let errorMessage = error.message || 'An error occurred during Google login';
      
      // Provide helpful error messages for common configuration issues
      if (error.message && error.message.includes('client_secret')) {
        errorMessage = 'Google OAuth configuration error. Please ensure the client ID and client secret are properly configured in Google Cloud Console.';
      } else if (error.message && error.message.includes('redirect_uri')) {
        errorMessage = 'OAuth redirect URI mismatch. Please check the redirect URI configuration in Google Cloud Console.';
      }
      
      Alert.alert('Google Login Failed', errorMessage);
    } finally {
      setGoogleLoading(false);
    }
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
          disabled={googleLoading || !request}
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
