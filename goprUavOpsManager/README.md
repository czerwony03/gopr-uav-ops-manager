# GOPR UAV Ops Manager

This is an [Expo](https://expo.dev) project for managing UAV operations with Firebase authentication and role-based access control.

## Features

- **Firebase Authentication**: Secure email/password authentication and Google Workspace SSO
- **Google Workspace Integration**: Domain-restricted authentication for @bieszczady.gopr.pl users
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

The app supports Google Workspace authentication restricted to the @bieszczady.gopr.pl domain.

#### 6.1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing project
3. Enable the Google+ API:
   - Go to APIs & Services > Library
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Select "Mobile app" as application type
   - Add your app's bundle identifier (e.g., `dev.redmed.gopruavopsmanager`)
   - For iOS: Add your iOS bundle ID
   - For Android: Add your package name and SHA-1 certificate fingerprint

#### 6.2. Firebase Console Configuration

1. In Firebase Console, go to Authentication > Sign-in method
2. Click on "Google" provider
3. Enable the provider
4. Add the OAuth client ID from Google Cloud Console
5. Configure the authorized domains if needed
6. Save the configuration

#### 6.3. Client ID Configuration

Update the `GOOGLE_CLIENT_ID` constant in `screens/LoginScreen.tsx` with your actual OAuth client ID:

```typescript
const GOOGLE_CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
```

#### 6.4. Domain Restriction

The app automatically restricts Google sign-in to users with @bieszczady.gopr.pl email addresses:
- The OAuth request includes `hd: 'bieszczady.gopr.pl'` parameter
- Client-side validation ensures only the correct domain can authenticate
- Users from other domains will see an access denied message

#### 6.5. Testing

For testing purposes, you can:
- Create test Google Workspace accounts in the bieszczady.gopr.pl domain
- Test with existing @bieszczady.gopr.pl accounts
- Verify domain validation by attempting login with non-domain accounts

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
