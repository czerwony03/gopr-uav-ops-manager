# GOPR UAV Ops Manager

This is an [Expo](https://expo.dev) project for managing UAV operations with Firebase authentication and role-based access control.

## Features

### Authentication & Security
- **Firebase Authentication**: Secure email/password authentication and Google Workspace SSO using Firebase's built-in Google provider
- **Google Workspace Integration**: Server-side domain restriction for @bieszczady.gopr.pl users via Firebase Functions
- **Role-based Access Control**: Three user roles (user, manager, admin) with different capabilities and UI access
- **Cross-platform Support**: React Native/Expo app with platform-specific authentication flows

### Core Entities Management
- **Flight Management**: Comprehensive flight tracking with categories (A1-A3, NSTS01-06, STS01-02), operation types (IR, WIDE, CARGO, SARUAV, TERMO), and activity types (Individual training, Group training, Rescue)
- **Drone Registry**: Complete drone inventory management with detailed specifications, soft-delete, and role-based access control
- **User Management**: Admin-only user profile management with detailed information including qualifications, licenses, and operator data
- **Procedures & Checklists**: Create and manage operational procedures with image support, checklist items, and file attachments (manager/admin only)
- **Reports**: Comprehensive reporting module with flight and drone summaries, filtering, and export capabilities (XLSX/PDF)

### Advanced Features
- **Audit Logging**: Comprehensive audit trail for all CRUD operations across all entities with user tracking and change details
- **Soft-Delete Functionality**: Safe deletion with admin restore capability for drones and procedures
- **Real-time Data**: Firestore integration with real-time updates and role-based filtering
- **Image Upload**: Firebase Storage integration for procedure images
- **Form Validation**: Comprehensive client-side validation and error handling
- **Platform Detection**: Automatic detection of web/iOS/Android platforms for audit logging
- **Report Generation**: Generate detailed flight and drone summaries with filtering by time range, user, and drone
- **Export Functionality**: Export reports to XLSX (Excel) or PDF format with sharing capabilities

### User Interface
- **Role-based Navigation**: Dynamic drawer menu based on user permissions
- **Responsive Design**: Optimized for mobile devices with proper keyboard handling
- **Professional UI**: Clean interface with status indicators, badges, and intuitive navigation
- **Info & Contact Screen**: Application information and developer contact details

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
3. Create collections and set up the following structure:

#### Users Collection (`users`)
```
Collection: users
Document ID: [Firebase Auth UID]
{
  "email": "user@example.com",
  "role": "admin", // "admin", "manager", or "user"
  "firstname": "John",
  "surname": "Doe", 
  "phone": "+1234567890",
  "residentialAddress": "123 Main St",
  "operatorNumber": "OP123456",
  "operatorValidityDate": timestamp,
  "pilotNumber": "PI123456", 
  "pilotValidityDate": timestamp,
  "licenseConversionNumber": "LC123456",
  "qualifications": ["A1", "A2", "NSTS01"], // Array of qualification strings
  "insurance": timestamp,
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

#### Drones Collection (`drones`)
```
Collection: drones  
Document ID: [auto-generated]
{
  "name": "DJI Mavic 3",
  "inventoryCode": "INV001",
  "location": "Base Station A", 
  "registrationNumber": "REG123456",
  "totalFlightTime": 1440, // in minutes
  "equipmentRegistrationNumber": "EQ123456",
  "yearOfCommissioning": 2023,
  "yearOfManufacture": 2023,
  "insurance": "Policy ABC123",
  "callSign": "GOPR-01",
  "weight": 895, // in grams
  "maxTakeoffWeight": 900, // in grams
  "operatingTime": 46, // in minutes
  "range": 15000, // in meters
  "dimensions": {
    "length": 347, // in mm
    "width": 283, // in mm 
    "height": 107 // in mm
  },
  "battery": {
    "type": "LiPo 4S",
    "capacity": 5000, // in mAh
    "voltage": 15.4 // in V
  },
  "maxSpeed": 75, // in km/h
  "userManual": "https://example.com/manual.pdf", // optional
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": timestamp,
  "updatedAt": timestamp,
  "createdBy": "user_uid",
  "updatedBy": "user_uid"
}
```

#### Flights Collection (`flights`)
```
Collection: flights
Document ID: [auto-generated] 
{
  "userId": "user_uid", // Firebase Auth UID of flight owner
  "userEmail": "pilot@example.com", // snapshot for reference
  "date": "2024-01-15", // YYYY-MM-DD format
  "location": "Training Area Alpha", 
  "flightCategory": "A1", // A1|A2|A3|NSTS01-06|STS01-02
  "operationType": "IR", // IR|WIDE|CARGO|SARUAV|TERMO
  "activityType": "Individual training", // Individual training|Group training|Rescue
  "droneId": "drone_document_id", // reference to drones collection
  "droneName": "DJI Mavic 3 [INV001]", // snapshot for display
  "startTime": "2024-01-15T10:00:00Z", // ISO datetime string
  "endTime": "2024-01-15T11:30:00Z", // ISO datetime string
  "conditions": "Clear weather, 15km/h wind",
  "createdAt": timestamp,
  "updatedAt": timestamp,
  "createdBy": "user_uid",
  "updatedBy": "user_uid"
}
```

#### Procedures & Checklists Collection (`procedures_checklists`)
```
Collection: procedures_checklists
Document ID: [auto-generated]
{
  "title": "Pre-flight Safety Check",
  "description": "Standard pre-flight safety checklist",
  "items": [
    {
      "id": "item_1",
      "topic": "Battery Check",
      "image": "https://storage.googleapis.com/bucket/image.jpg", // optional
      "content": "Verify battery charge level is above 50%",
      "number": 1, // sequence order
      "link": "https://manual.com/battery", // optional
      "file": "https://storage.googleapis.com/bucket/file.pdf" // optional
    }
  ],
  "createdBy": "user_uid",
  "updatedBy": "user_uid",
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

#### Audit Logs Collection (`auditLogs`)
```
Collection: auditLogs
Document ID: [auto-generated]
{
  "entityType": "drone", // drone|flight|procedureChecklist|droneComment
  "entityId": "entity_document_id",
  "action": "edit", // create|edit|delete|restore|view
  "userId": "user_uid",
  "userEmail": "user@example.com",
  "timestamp": timestamp,
  "details": "Updated drone weight from 900g to 895g",
  "previousValues": { "weight": 900 }, // for edit operations
  "newValues": { "weight": 895 }, // for edit operations
  "applicationPlatform": "web", // web|ios|android
  "applicationVersion": "1.0.0",
  "commitHash": "abc123def" // optional git commit hash
}
```

#### Drone Comments Collection (`droneComments`)
```
Collection: droneComments
Document ID: [auto-generated]
{
  "droneId": "drone_document_id", // Reference to drone
  "userId": "user_uid", // Comment author's Firebase Auth UID
  "userEmail": "user@example.com", // Comment author's email
  "userName": "John Doe", // Comment author's display name
  "content": "This drone performed excellently during the mountain rescue operation.",
  "images": [ // Optional array of Firebase Storage URLs
    "https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/droneComments%2Fimages%2FcommentId%2Fimage1.jpg",
    "https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/droneComments%2Fimages%2FcommentId%2Fimage2.jpg"
  ],
  "visibility": "public", // "public" or "hidden" (hidden only visible to admin/manager)
  "isDeleted": false, // Soft-delete flag for admin/manager removal
  "deletedAt": null, // Timestamp when comment was deleted
  "deletedBy": null, // User ID who deleted the comment
  "createdAt": timestamp,
  "updatedAt": timestamp // Optional, for future edit functionality
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

## User Roles & Permissions

### User Role (Basic Access)
**Navigation Access:**
- ✅ Home dashboard
- ✅ View flights (own flights only)
- ✅ View drones (non-deleted only)  
- ✅ View procedures & checklists (non-deleted only)
- ✅ Info & Contact page

**Capabilities:**
- ✅ Create and edit own flights
- ✅ View drone details and specifications
- ✅ View procedure checklists and follow instructions
- ❌ Cannot create, edit, or delete drones
- ❌ Cannot create, edit, or delete procedures
- ❌ Cannot access user management
- ❌ Cannot view audit logs
- ❌ Cannot view other users' flights

### Manager Role (Operational Management)
**Navigation Access:**
- ✅ All User role access, plus:
- ✅ View all flights (from all users)
- ✅ User management capabilities (limited)

**Capabilities:**
- ✅ All User role capabilities, plus:
- ✅ Create, edit, and soft-delete drones
- ✅ Create, edit, and soft-delete procedures & checklists
- ✅ View and edit flights from all users
- ✅ Upload images for procedures
- ✅ Manage checklist items with images and links
- ❌ Cannot restore soft-deleted items
- ❌ Cannot view deleted drones/procedures  
- ❌ Cannot access full user management
- ❌ Cannot view audit logs

### Admin Role (Full System Access)
**Navigation Access:**
- ✅ All Manager role access, plus:
- ✅ Users management
- ✅ Audit logs

**Capabilities:**
- ✅ All Manager role capabilities, plus:
- ✅ View deleted drones and procedures with status indicators
- ✅ Restore soft-deleted drones and procedures
- ✅ Full user management (create, edit, view all user profiles)
- ✅ View comprehensive audit logs for all operations
- ✅ Edit deleted items before restoration
- ✅ Access to all system data and configurations

## Application Navigation Structure

### Main Navigation (Drawer Menu)
- **Home**: Dashboard with quick access to main features
- **Flights**: Flight management (all users)
- **Drones**: Drone registry (all users)
- **Procedures & Checklists**: Operational procedures (all users)
- **Reports**: Flight and drone summary reports with export (all users)
- **Info & Contact**: Application information (all users)
- **Users**: User management (admin and manager)
- **Audit Logs**: System audit trail (admin only)

### Screen Hierarchy
```
├── Home (index.tsx)
├── Flights
│   ├── index.tsx (flights list)
│   ├── flight-details.tsx
│   └── flight-form.tsx
├── Drones  
│   ├── drones-list.tsx
│   ├── drone-details.tsx
│   └── drone-form.tsx
├── Procedures & Checklists
│   ├── procedures-checklists-list.tsx
│   ├── procedures-checklist-details.tsx
│   └── procedures-checklist-form.tsx
├── Reports (all users)
│   └── index.tsx (reports dashboard)
├── Users (admin and manager)
│   ├── users-list.tsx
│   ├── user-details.tsx
│   └── user-form.tsx
├── Audit Logs (admin only)
│   └── audit-logs.tsx
└── Info & Contact
    └── info-contact.tsx
```

### Reports Module

The Reports module provides comprehensive flight and drone analytics with export capabilities:

**Flight Summary Reports:**
- Total flights, total duration, and average duration
- Breakdown by user (admin/manager only), drone, and month
- Filtering by time range (all time, month, year, custom range)
- Filtering by user, drone, flight category, and activity type

**Drone Summary Reports:**
- Total flights and flight hours per drone
- Last flight date and average flight duration
- Flight breakdown by category and activity type
- Sorting by total flight duration

**Export Options:**
- XLSX (Excel) format with multiple sheets for detailed breakdowns
- PDF format with formatted tables and summaries
- Cross-platform sharing (web, iOS, Android)

**Access Control:**
- Admin and Manager: View all reports with full filtering options
- Users: View only their own flight summaries

## Testing Accounts Setup

For comprehensive testing, create the following user accounts in Firestore:

### Test Admin Account
```
Document ID: [admin_user_firebase_uid]
{
  "email": "admin@bieszczady.gopr.pl",
  "role": "admin",
  "firstname": "Test",
  "surname": "Administrator",
  "phone": "+48123456789",
  "residentialAddress": "Admin Address 123",
  "operatorNumber": "OP-ADMIN-001",
  "pilotNumber": "PI-ADMIN-001",
  "qualifications": ["A1", "A2", "A3", "NSTS01", "NSTS02"],
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

### Test Manager Account  
```
Document ID: [manager_user_firebase_uid]
{
  "email": "manager@bieszczady.gopr.pl", 
  "role": "manager",
  "firstname": "Test",
  "surname": "Manager",
  "phone": "+48123456790",
  "residentialAddress": "Manager Address 456",
  "operatorNumber": "OP-MGR-001",
  "pilotNumber": "PI-MGR-001", 
  "qualifications": ["A1", "A2", "NSTS01"],
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

### Test User Account
```
Document ID: [basic_user_firebase_uid]  
{
  "email": "user@bieszczady.gopr.pl",
  "role": "user", 
  "firstname": "Test",
  "surname": "User",
  "phone": "+48123456791",
  "residentialAddress": "User Address 789",
  "operatorNumber": "OP-USER-001",
  "pilotNumber": "PI-USER-001",
  "qualifications": ["A1"],
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Testing Workflow:**
1. Create Firebase Authentication accounts for each test email
2. Add corresponding Firestore documents with the UIDs from Firebase Auth
3. Test role-based navigation and feature access
4. Verify audit logging functionality
5. Test soft-delete and restore operations (admin)

## Development

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Automatic Version Bumping

This project includes an automatic version bump workflow that triggers after every pull request merge to the main branch.

**How it works:**
- When a pull request is merged to the `main` branch, the GitHub Actions workflow automatically increments the patch version
- Updates both `package.json` and `app.json` with the new version
- Commits the version changes back to the repository with a `[version bump]` commit message
- Uses semantic patch versioning (e.g., 1.0.0 → 1.0.1 → 1.0.2)

**Loop prevention:**
The workflow automatically skips execution if the PR title contains `[version bump]` to prevent infinite loops.

**Workflow file:** `.github/workflows/version-bump.yml`

**Example version progression:**
```
1.0.0 → 1.0.1 → 1.0.2 → 1.0.3 ...
```

The version is automatically available throughout the application via the `ApplicationMetadata.getVersion()` utility, which reads from Expo Constants and falls back to the app.json version.

## Testing

The application includes comprehensive test coverage using Jest and React Testing Library.

### Test Structure

- **Service tests**: Located in `services/__tests__/` - Test business logic and Firebase operations
- **App tests**: Located in `app/__tests__/` - Test UI components and user interactions using jest-expo

### Test Configuration

The project uses a dual-configuration setup:
- **Services**: Node.js environment for service layer testing
- **App**: jsdom environment with jest-expo for React Native component testing

### Running Tests

```bash
# Run all tests
npm test

# Run only app tests (UI/component tests)
npx jest --selectProjects app

# Run only service tests (business logic tests)
npx jest --selectProjects services

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Accounts

The following test accounts are available for development and testing:

**Admin Account:**
- Email: `admin@example.com`
- Password: `admin123`
- Access: Full access to all features including user management and audit logs

**Manager Account:**
- Email: `manager@example.com`
- Password: `manager123`
- Access: Can manage users but cannot access audit logs

**User Account:**
- Email: `user@example.com`
- Password: `user123`
- Access: Basic access to flights, drones, procedures, and profile

### Test Coverage

The test suite covers:
- **Authentication flows**: Login with test accounts, role-based access
- **Dashboard functionality**: Role-based navigation visibility
- **Navigation behavior**: Route handling and role permissions
- **Form validation**: Input validation and error handling
- **Firebase integration**: Mocked Firebase operations
- **Service layer**: Business logic for all major entities

### Mocking Strategy

Tests use comprehensive mocking for:
- Firebase Authentication and Firestore
- React Native components and APIs
- Expo Router navigation
- Google Sign-In integration
- Sentry error tracking

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
