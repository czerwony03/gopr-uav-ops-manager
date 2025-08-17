# GOPR UAV Ops Manager

This is an [Expo](https://expo.dev) project for managing UAV operations with Firebase authentication and role-based access control.

## Features

- **Firebase Authentication**: Secure email/password authentication and Google Workspace SSO using Firebase's built-in Google provider
- **Google Workspace Integration**: Server-side domain restriction for @bieszczady.gopr.pl users via Firebase Functions
- **Role-based Access Control**: Three user roles (user, manager, admin) with different capabilities
- **Firestore Integration**: User roles stored and retrieved from Firestore
- **React Native/Expo**: Cross-platform mobile application
- **Flight Management**: Track and manage UAV flights with comprehensive data
- **Drone Registry**: Manage drone inventory with detailed specifications
- **User Management**: Admin tools for managing system users (admin only)
- **Procedures & Checklists**: Create and manage operational procedures with image support (manager/admin only)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure Firebase

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Email/Password provider
   - Create a Firestore database
   - Copy your Firebase configuration and update `firebaseConfig.ts`

3. Set up Firestore for user roles

   Create a `users` collection in Firestore with documents structured as:
   ```
   Collection: users
   Document ID: [user_uid]
   Fields:
     - email: string
     - role: string (values: "user", "manager", or "admin")
   ```

4. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Firebase Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Add your app to the project (iOS/Android/Web)

### 2. Authentication Setup

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Enable "Google" provider for Google Workspace authentication:
   - Click on "Google" in the sign-in providers list
   - Enable the provider
   - Add your OAuth client ID (see Google Workspace configuration below)
   - Save the configuration
4. Optionally enable "Email link (passwordless sign-in)" for additional security

### 3. Firestore Setup

1. In Firebase Console, go to Firestore Database
2. Create database (start in test mode for development)
3. Create a collection called `users`
4. Add documents with the following structure:
   ```
   Document ID: [Firebase Auth UID]
   {
     "email": "user@example.com",
     "role": "admin" // or "manager" or "user"
   }
   ```

### 4. Firebase Configuration

Update the `firebaseConfig.ts` file with your project's configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 5. Security Rules (Production)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only admins can write user documents
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 6. Google Workspace Authentication Setup

The app supports Google Workspace authentication restricted to the @bieszczady.gopr.pl domain using Firebase's built-in Google provider.

#### 6.1. Firebase Console Configuration

1. In Firebase Console, go to Authentication > Sign-in method
2. Click on "Google" provider and enable it
3. Add your Web SDK configuration (Client ID) from Google Cloud Console
4. Configure authorized domains if needed
5. Save the configuration

#### 6.2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing project
3. Enable the Google Identity Services API:
   - Go to APIs & Services > Library
   - Search for "Google Identity Services API" and enable it
4. Create OAuth 2.0 credentials for web platform:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Select "Web application" as application type
   - Add authorized JavaScript origins (your domain)
   - Add authorized redirect URIs (your Firebase auth domain)
   - Copy the Client ID for Firebase configuration
5. Create OAuth 2.0 credentials for mobile platforms:
   - Click "Create Credentials" > "OAuth 2.0 Client IDs" again
   - Select "iOS" or "Android" as application type (create one for each platform you need)
   - For iOS: Enter your bundle identifier (e.g., `dev.redmed.gopruavopsmanager`)
   - For Android: Enter your package name and SHA-1 certificate fingerprint
   - **IMPORTANT**: Add the following redirect URI to your OAuth client configuration:
     - `dev.redmed.gopruavopsmanager://`
   - Copy the Client ID and add it to your `.env` file as `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`

**Critical Configuration Note**: 
- The redirect URI `dev.redmed.gopruavopsmanager://` must be exactly configured in your Google Cloud Console OAuth client
- This URI format follows Google's requirements for mobile app deep linking
- Without this exact configuration, you'll get "invalid_request" error 400 with "redirect_uri" details

**Note**: The mobile OAuth Client ID is different from the web Client ID used in Firebase configuration.

#### 6.3. Domain Restriction via Firebase Functions

Domain restriction to @bieszczady.gopr.pl is handled server-side using Firebase Functions with a `beforeCreate` trigger. This ensures that only users from the authorized workspace domain can create accounts, providing better security than client-side validation.

Example Firebase Function:
```javascript
// functions/index.js
const functions = require('firebase-functions');

exports.beforeCreate = functions.auth.user().beforeCreate((user, context) => {
  const email = user.email;
  if (!email || !email.endsWith('@bieszczady.gopr.pl')) {
    throw new functions.auth.HttpsError(
      'invalid-argument',
      'Only @bieszczady.gopr.pl users are allowed.'
    );
  }
});
```

#### 6.4. Platform-Specific Implementation

The app now uses different Google authentication approaches for different platforms:

**Web Platform:**
- **Firebase signInWithPopup**: Uses Firebase's built-in popup-based OAuth flow
- **Automatic Domain Handling**: Firebase SDK handles OAuth popup flow seamlessly
- **Direct Firebase Integration**: No additional dependencies required

**Mobile Platforms (Android/iOS):**
- **React Native Google Sign-In**: Uses `@react-native-google-signin/google-signin` for native authentication
- **Firebase Auth Integration**: Direct credential exchange with Firebase using `@react-native-firebase/auth`
- **Built-in Security**: Leverages Google's native SDK security features
- **Domain Restriction**: Configured via `hostedDomain` parameter and server-side validation
- **Native UI**: Uses platform-native Google Sign-In buttons and flows

#### 6.5. Benefits of Hybrid Approach

- **Platform Optimization**: Each platform uses the most appropriate OAuth method
- **Better Security**: Server-side domain validation via Firebase Functions
- **Mobile Native Experience**: Proper mobile OAuth flow without popup limitations
- **Consistent UX**: Same user experience across all platforms
- **Firebase Integration**: All platforms ultimately authenticate through Firebase

#### 6.6. Mobile Setup Instructions

For mobile platforms (Android/iOS), the app now uses React Native Firebase with Google Sign-In:

1. **Dependencies**: The following packages are required (already included):
   ```bash
   npm install @react-native-google-signin/google-signin @react-native-firebase/app @react-native-firebase/auth
   ```

2. **Environment Variables**: Add the Google OAuth Web Client ID to your `.env` file:
   ```
   EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_web_oauth_client_id_here
   ```
   Note: Use the **Web** Client ID from Google Cloud Console, not the mobile-specific one.

3. **Google Cloud Console Setup**: 
   - Create OAuth 2.0 credentials for **Android** and **iOS** platforms (separate from web)
   - Configure bundle identifiers and package names to match your app
   - No need to add redirect URIs for native mobile authentication

4. **Bundle Identifier/Package Name**: Ensure your app's configuration matches Google Cloud:
   - iOS: `dev.redmed.gopruavopsmanager` (configured in `app.json`)
   - Android: `dev.redmed.gopruavopsmanager` (configured in `app.json`)

5. **Firebase Project Files**: 
   - Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from Firebase Console
   - Place them in the root of your project directory
   - These files are automatically handled by the React Native Firebase plugin

6. **Testing**: 
   - Native Google Sign-In requires development builds or production builds
   - OAuth will **not** work in Expo Go due to native dependency requirements
   - Use `npx expo run:android` or `npx expo run:ios` for testing

**Benefits of React Native Firebase Approach:**
- **Simpler Implementation**: 3 lines of code vs 140+ lines
- **Native Experience**: Uses platform-native Google Sign-In UI
- **Better Security**: Leverages Google's native SDK security
- **No Deep Linking**: No custom URL schemes required
- **Automatic Configuration**: Firebase handles OAuth flow complexity

## User Roles

- **User**: Basic operations, view assigned tasks, update status
- **Manager**: Operation management, team oversight, reports viewing, limited user management  
- **Admin**: Full system access, user management, all operations, system configuration

## Development

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
