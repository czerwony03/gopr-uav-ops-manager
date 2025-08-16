# GOPR UAV Ops Manager 🚁

This is an [Expo](https://expo.dev) project for managing UAV (drone) operations for GOPR (Volunteer Mountain Rescue Service).

## Features

- **Drones List**: View and manage the organization's drone fleet with detailed information stored in Firebase Firestore
- **Real-time Data**: Automatic synchronization with Firebase Firestore database
- **Mobile-first**: Built with React Native for iOS and Android support

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure Firebase (see [Firebase Setup](#firebase-setup) section below)

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Firebase Setup

To enable the drones list functionality, you need to set up Firebase Firestore:

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Follow the setup wizard to create your project

### 2. Enable Firestore Database

1. In your Firebase project console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (remember to configure security rules for production)
4. Select a location for your database

### 3. Configure the App

1. In the Firebase console, go to "Project Settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web platform (</>) 
4. Register your app with a nickname (e.g., "GOPR UAV Ops Manager")
5. Copy the Firebase configuration object

### 4. Update Firebase Configuration

Replace the placeholder values in `firebaseConfig.ts` with your actual Firebase project configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

### 5. Add Sample Drone Data

In your Firestore database, create a collection called `drones` and add documents with the following structure:

```json
{
  "name": "DJI Mavic 3",
  "location": "Base Station Alpha",
  "registrationNumber": "N12345",
  "totalFlightTime": 125.5,
  "equipmentRegistrationNumber": "EQ-001-2023",
  "yearOfCommissioning": 2023,
  "yearOfManufacture": 2023,
  "insurance": "Aerocasco",
  "callSign": "GOPR-01",
  "weight": 0.895,
  "maxTakeoffWeight": 0.895,
  "operatingTime": 46,
  "range": 15,
  "dimensions": {
    "length": 34.7,
    "width": 28.3,
    "height": 10.7
  },
  "battery": {
    "type": "LiPo 4S",
    "capacity": 5000,
    "voltage": 15.4
  },
  "maxSpeed": 75,
  "userManual": "https://example.com/mavic3-manual.pdf"
}
```

### 6. Security Rules (Production)

For production deployment, update your Firestore security rules to restrict access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add authentication and authorization rules here
    match /drones/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
