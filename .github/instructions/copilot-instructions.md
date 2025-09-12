# GOPR UAV Ops Manager - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

Bootstrap, build, and test the repository:
- **CRITICAL**: All commands listed below have been validated and work. NEVER CANCEL any build or long-running commands.
- Install dependencies: `npm install` -- takes ~1 minute. NEVER CANCEL. Set timeout to 3+ minutes.
- Lint the codebase: `npm run lint` -- takes ~5 seconds. Fast command, no timeout concerns.
- Export web build: `npm run export:web` -- takes ~1-2 minutes, WILL FAIL without Firebase configuration. NEVER CANCEL. Set timeout to 5+ minutes.
- Start development server: `npm run start` -- starts Metro bundler on port 8081. Takes ~10 seconds to start.
- Start web development: `npm run web` -- starts web development server. Takes ~10 seconds to start.

## Firebase Configuration Requirements

**CRITICAL**: This application requires Firebase configuration to build and run successfully.

### Required Firebase Files
- `google-services.json` (Android) - place in project root
- `GoogleService-Info.plist` (iOS) - place in project root

### Commands That Require Firebase Configuration
- `npm run export:web` - WILL FAIL with "Firebase: Error (auth/invalid-api-key)" without proper config
- `npm run web` - Development server will return HTTP 500 errors without proper config
- `npx expo prebuild` - WILL FAIL without `google-services.json` file
- `npm run android` / `npm run ios` - Native builds require respective Firebase config files

## Build Commands and Timing

### Working Commands (Validated)
- `npm install` - **Time: ~55 seconds** - NEVER CANCEL. Set timeout to 3+ minutes.
- `npm run lint` - **Time: ~5 seconds** - No timeout concerns. Returns warnings (acceptable).
- `npm run start` - **Time: ~10 seconds to start** - Starts Metro bundler successfully.

### Commands That Require Additional Setup
- `npm run export:web` - **Time: ~1-2 minutes** - WILL FAIL at 99% without Firebase config. NEVER CANCEL.
- `npm run web` - **Time: ~10 seconds to start** - Starts but returns HTTP 500 without Firebase config.
- `npx expo prebuild --platform android` - **Time: ~3 seconds to fail** - Requires `google-services.json`. Creates android/ directory.
- `npm run android` - Requires Android SDK setup and Firebase configuration.

**Note**: `npx expo prebuild` generates native build directories (android/, ios/) which should not be committed to git unless specifically needed for CI/CD.

## Validation

### Manual Validation After Changes
- Always run `npm run lint` before committing - CI will fail if linting fails.
- Test development server startup with `npm run start` - should start successfully.
- For web functionality testing, ensure Firebase configuration is properly set up.
- **NEVER try to build native apps without proper Firebase and SDK setup.**

### CI/CD Validation
- GitHub Actions automatically build Android APK/AAB on version bumps and manual triggers.
- Web deployment to EAS Hosting happens automatically on version bumps.
- Version bumping occurs automatically on PR merges to main branch.

## Repository Structure

### Main Application Code
- `goprUavOpsManager/` - Main application directory
- `goprUavOpsManager/app/` - Expo Router file-based routing screens
- `goprUavOpsManager/components/` - Reusable React Native components
- `goprUavOpsManager/services/` - Business logic and API services
- `goprUavOpsManager/utils/` - Utility functions and helpers
- `goprUavOpsManager/types/` - TypeScript type definitions

### Key Configuration Files
- `goprUavOpsManager/package.json` - Dependencies and npm scripts
- `goprUavOpsManager/app.json` - Expo configuration
- `goprUavOpsManager/firebaseConfig.ts` - Firebase initialization (web/native)
- `goprUavOpsManager/eslint.config.js` - ESLint configuration
- `goprUavOpsManager/tsconfig.json` - TypeScript configuration

### Build and Deployment
- `.github/workflows/` - GitHub Actions for automated builds and deployments
- `goprUavOpsManager/eas.json` - EAS Build configuration
- `goprUavOpsManager/metro.config.js` - Metro bundler configuration

## Common Tasks

### Development Workflow
1. Run `npm install` to install dependencies
2. Run `npm run lint` to check code quality
3. Run `npm run start` to start development server
4. Use `w` in Metro console to start web development
5. Always lint before committing: `npm run lint`

### Working with Firebase
- The application uses different Firebase SDKs for web vs mobile platforms
- Web platform uses Firebase JS SDK with popup-based Google auth
- Mobile platforms use React Native Firebase with native Google Sign-In
- Domain restriction enforced server-side via Firebase Functions (@bieszczady.gopr.pl)

### Making Changes
- Always work in the `goprUavOpsManager/` directory - this is the main application
- Use file-based routing in `app/` directory (Expo Router)
- Follow existing patterns in `components/`, `services/`, `utils/` directories
- Maintain TypeScript types in `types/` directory
- Always run `npm run lint` before committing changes

### Version Management
- Version bumps happen automatically on PR merges to main
- Manual version bumps can be triggered via GitHub Actions
- Versions are synchronized between `package.json` and `app.json`

## Application Architecture

### Technology Stack
- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Authentication**: Firebase Auth with Google Workspace SSO
- **State Management**: React hooks and context
- **Internationalization**: i18next (Polish and English)
- **Error Reporting**: Sentry
- **Build System**: EAS Build

### Core Features
- UAV operations management (drones, flights, procedures, users)
- Role-based access control (admin, manager, user)
- Firebase authentication with Google Workspace integration
- Audit logging for all CRUD operations
- Soft-delete functionality with admin restore
- Image upload and management for procedures
- Real-time data synchronization
- Cross-platform support (web, iOS, Android)

### Development Environment Requirements
- Node.js 22 (as specified in GitHub Actions)
- npm (uses package-lock.json)
- For Android development: Android SDK
- Firebase project with proper configuration

### Troubleshooting Build Issues
- **"Firebase: Error (auth/invalid-api-key)"**: Missing or invalid Firebase environment variables
- **"ENOENT: no such file or directory, open 'google-services.json'"**: Missing Firebase configuration file for Android
- **HTTP 500 on development server**: Missing Firebase configuration preventing app initialization
- **ESLint warnings**: Expected and acceptable, no errors should be present
- **Metro bundler CI mode**: Normal behavior in CI environments, reloads disabled

## NEVER CANCEL Commands
- `npm install` - Package installation can take up to 1-2 minutes
- `npm run export:web` - Web build process takes 1-2 minutes even when failing
- Any build command in GitHub Actions can take 10+ minutes
- Set generous timeouts (5+ minutes) for any build-related commands
