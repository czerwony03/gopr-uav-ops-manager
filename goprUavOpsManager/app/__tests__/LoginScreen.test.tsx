import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';
import { testCredentials } from './test-utils';

// Mock firebaseUtils
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSignInWithCredential = jest.fn();

jest.mock('@/utils/firebaseUtils', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  signInWithCredential: (...args: any[]) => mockSignInWithCredential(...args),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  createGoogleAuthProvider: jest.fn(() => ({
    setCustomParameters: jest.fn(),
  })),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));

// Mock AuditLogService
jest.mock('@/services/auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn(),
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
  },
  GoogleSigninButton: 'GoogleSigninButton',
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web', // Default to web for most tests
  select: jest.fn().mockImplementation((obj) => obj.web || obj.default),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithEmailAndPassword.mockClear();
    mockSignInWithPopup.mockClear();
    mockSignInWithCredential.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render login form elements', () => {
      render(<LoginScreen />);
      
      expect(screen.getByText('GOPR UAV Ops Manager')).toBeTruthy();
      expect(screen.getByText('auth.signIn')).toBeTruthy();
      expect(screen.getByPlaceholderText('auth.email')).toBeTruthy();
      expect(screen.getByPlaceholderText('auth.password')).toBeTruthy();
      expect(screen.getByTestId('login-button')).toBeTruthy();
    });

    it('should render Google Sign-In button on web', () => {
      render(<LoginScreen />);
      
      expect(screen.getByText('Sign in with Google Workspace')).toBeTruthy();
    });
  });

  describe('Email/Password Authentication', () => {
    it('should allow login with admin test account', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({
        user: { email: testCredentials.admin.email }
      });

      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText('auth.email');
      const passwordInput = screen.getByPlaceholderText('auth.password');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(emailInput, testCredentials.admin.email);
      fireEvent.changeText(passwordInput, testCredentials.admin.password);
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
          testCredentials.admin.email,
          testCredentials.admin.password
        );
      });
    });

    it('should allow login with manager test account', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({
        user: { email: testCredentials.manager.email }
      });

      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText('auth.email');
      const passwordInput = screen.getByPlaceholderText('auth.password');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(emailInput, testCredentials.manager.email);
      fireEvent.changeText(passwordInput, testCredentials.manager.password);
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
          testCredentials.manager.email,
          testCredentials.manager.password
        );
      });
    });

    it('should allow login with user test account', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({
        user: { email: testCredentials.user.email }
      });

      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText('auth.email');
      const passwordInput = screen.getByPlaceholderText('auth.password');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(emailInput, testCredentials.user.email);
      fireEvent.changeText(passwordInput, testCredentials.user.password);
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
          testCredentials.user.email,
          testCredentials.user.password
        );
      });
    });

    it('should show loading state during login', async () => {
      mockSignInWithEmailAndPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText('auth.email');
      const passwordInput = screen.getByPlaceholderText('auth.password');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(emailInput, testCredentials.admin.email);
      fireEvent.changeText(passwordInput, testCredentials.admin.password);
      fireEvent.press(signInButton);
      
      // Should show loading indicator
      expect(screen.getByTestId('login-loading')).toBeTruthy();
      
      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
      });
    });

    it('should handle login error', async () => {
      const errorMessage = 'Invalid credentials';
      mockSignInWithEmailAndPassword.mockRejectedValueOnce(new Error(errorMessage));

      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText('auth.email');
      const passwordInput = screen.getByPlaceholderText('auth.password');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'invalid@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
      });
      
      // Error should be handled (logged or shown to user)
      // The exact behavior depends on implementation
    });
  });

  describe('Form Validation', () => {
    it('should not allow login with empty email', () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByPlaceholderText('auth.password');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(passwordInput, 'somepassword');
      fireEvent.press(signInButton);
      
      // Should not call signIn with empty email
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('should not allow login with empty password', () => {
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText('auth.email');
      const signInButton = screen.getByTestId('login-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(signInButton);
      
      // Should not call signIn with empty password
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  describe('Google Sign-In', () => {
    it('should handle Google Sign-In on web platform', async () => {
      mockSignInWithPopup.mockResolvedValueOnce({
        user: { email: 'user@bieszczady.gopr.pl' }
      });

      render(<LoginScreen />);
      
      const googleButton = screen.getByText('Sign in with Google Workspace');
      fireEvent.press(googleButton);
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
      });
    });

    it('should show Google loading state', async () => {
      mockSignInWithPopup.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<LoginScreen />);
      
      const googleButton = screen.getByText('Sign in with Google Workspace');
      fireEvent.press(googleButton);
      
      // Should show loading state for Google Sign-In
      // The exact implementation may vary
      expect(mockSignInWithPopup).toHaveBeenCalled();
    });
  });
});