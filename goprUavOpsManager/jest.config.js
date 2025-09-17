// Use different test environments based on the test location
const testEnvironments = {
  services: 'node',
  app: 'jsdom',
};

module.exports = {
  preset: 'jest-expo',
  projects: [
    // Services tests with Node environment
    {
      displayName: 'services',
      testEnvironment: 'node',
      roots: ['<rootDir>/services'],
      testMatch: ['<rootDir>/services/**/__tests__/**/*.test.ts'],
      collectCoverageFrom: [
        'services/**/*.ts',
        '!services/**/__tests__/**',
        '!services/**/*.d.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        'react-native': '<rootDir>/services/__tests__/__mocks__/react-native.js',
        'expo-constants': '<rootDir>/services/__tests__/__mocks__/expo-constants.js',
        'expo-file-system': '<rootDir>/services/__tests__/__mocks__/expo-file-system.js',
        'expo-location': '<rootDir>/services/__tests__/__mocks__/expo-location.js',
        'expo-image-manipulator': '<rootDir>/services/__tests__/__mocks__/expo-image-manipulator.js',
        'firebase/firestore': '<rootDir>/services/__tests__/__mocks__/firebase-firestore.js',
        'firebase/app': '<rootDir>/services/__tests__/__mocks__/firebase-app.js',
        'firebase/auth': '<rootDir>/services/__tests__/__mocks__/firebase-auth.js',
        'firebase/storage': '<rootDir>/services/__tests__/__mocks__/firebase-storage.js',
      },
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/services/__tests__/setup.ts'],
    },
    // App tests with jsdom environment
    {
      displayName: 'app',
      testEnvironment: 'jsdom',  
      roots: ['<rootDir>/app'],
      testMatch: ['<rootDir>/app/**/__tests__/**/*.test.(ts|tsx|js|jsx)'],
      collectCoverageFrom: [
        'app/**/*.{ts,tsx}',
        '!app/**/__tests__/**',
        '!app/**/*.d.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        // React Native core modules
        'react-native$': '<rootDir>/services/__tests__/__mocks__/react-native.js',
        'react-native/Libraries/Utilities/Platform': '<rootDir>/services/__tests__/__mocks__/react-native.js',
        'react-native/Libraries/StyleSheet/StyleSheet': '<rootDir>/services/__tests__/__mocks__/react-native.js',
        // Expo Router mocks
        'expo-router': '<rootDir>/app/__tests__/__mocks__/expo-router.js',
        // Firebase mocks
        'firebase/firestore': '<rootDir>/services/__tests__/__mocks__/firebase-firestore.js',
        'firebase/app': '<rootDir>/services/__tests__/__mocks__/firebase-app.js',
        'firebase/auth': '<rootDir>/services/__tests__/__mocks__/firebase-auth.js',
        'firebase/storage': '<rootDir>/services/__tests__/__mocks__/firebase-storage.js',
        // Firebase utils mock
        '@/utils/firebaseUtils': '<rootDir>/app/__tests__/__mocks__/firebaseUtils.js',
        // Google Sign-In mock
        '@react-native-google-signin/google-signin': '<rootDir>/app/__tests__/__mocks__/google-signin.js',
        // Sentry mock
        '@sentry/react-native': '<rootDir>/app/__tests__/__mocks__/sentry.js',
        // Other Expo mocks
        'expo-constants': '<rootDir>/services/__tests__/__mocks__/expo-constants.js',
        'expo-file-system': '<rootDir>/services/__tests__/__mocks__/expo-file-system.js',
        'expo-location': '<rootDir>/services/__tests__/__mocks__/expo-location.js',
        'expo-image-manipulator': '<rootDir>/services/__tests__/__mocks__/expo-image-manipulator.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-clone-referenced-element|@react-native-community|expo-router|@expo/vector-icons)'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    }
  ],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
};