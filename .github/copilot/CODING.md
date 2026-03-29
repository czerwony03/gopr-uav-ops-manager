# GitHub Copilot Coding Instructions - GOPR UAV Ops Manager

## Project Overview

React Native + Expo SDK 53 application for UAV operations management with Firebase backend, TypeScript, role-based access control, and cross-platform support (web, iOS, Android).

## Critical Build Rules

### Never Cancel Commands
- `npm install` - Takes ~55 seconds, set timeout 3+ minutes
- `npm run export:web` - Takes 1-2 minutes, will fail at 99% without Firebase config
- Any GitHub Actions build can take 10+ minutes
- **NEVER CANCEL** any build or long-running commands

### Required Dependencies Installation
```bash
cd goprUavOpsManager && npm install
```

### Essential Commands
- **Lint**: `npm run lint` (~5 seconds, warnings acceptable, no errors)
- **Dev server**: `npm run start` (Metro bundler, ~10 seconds)
- **Web dev**: `npm run web` (starts web server, requires Firebase config)

## Firebase Configuration Requirements

**CRITICAL**: Application requires Firebase configuration files to build/run successfully.

### Required Files
- `google-services.json` (Android) - place in project root
- `GoogleService-Info.plist` (iOS) - place in project root

### Commands That Fail Without Firebase Config
- `npm run export:web` - "Firebase: Error (auth/invalid-api-key)"
- `npm run web` - HTTP 500 errors
- `npx expo prebuild` - Missing google-services.json error

## Project Structure

### Main Directories
- `goprUavOpsManager/app/` - Expo Router file-based routing screens
- `goprUavOpsManager/components/` - Reusable React Native components
- `goprUavOpsManager/services/` - Business logic and API services
- `goprUavOpsManager/utils/` - Utility functions and helpers
- `goprUavOpsManager/types/` - TypeScript type definitions

### Key Files
- `package.json` - Dependencies and npm scripts
- `app.json` - Expo configuration
- `firebaseConfig.ts` - Firebase initialization
- `eslint.config.js` - ESLint configuration

## Technology Stack Conventions

### React Native + Expo Patterns
- Use Expo Router for navigation (file-based routing in `app/`)
- Prefer functional components with hooks
- Use TypeScript for all new code
- Follow existing component patterns in `components/`

### Firebase Integration
- Web: Firebase JS SDK with popup-based Google auth
- Mobile: React Native Firebase with native Google Sign-In
- Domain restriction: @bieszczady.gopr.pl (enforced server-side)
- Use Firebase Auth, Firestore, Storage, Functions

### State Management
- React hooks and context (no Redux)
- Prefer local state with useState/useReducer
- Use context for global state (auth, theme)

## Security Requirements

### Authentication & Access Control
- Firebase Auth with Google Workspace SSO
- Role-based access: admin, manager, user
- Domain-restricted authentication (@bieszczady.gopr.pl)
- Always validate user permissions before operations

### Data Security
- Implement audit logging for all CRUD operations
- Use soft-delete with admin restore capability
- Validate all user inputs
- Follow OWASP Top 10 guidelines (see `.github/instructions/`)

### Key Security Patterns
```typescript
// Always check user role
if (user?.role !== 'admin') {
  throw new Error('Insufficient permissions');
}

// Audit log all operations
auditService.log('UPDATE', 'drone', droneId, userId);

// Soft delete pattern
await updateDoc(docRef, { 
  deleted: true, 
  deletedAt: serverTimestamp(),
  deletedBy: user.uid 
});
```

## Code Quality Standards

### TypeScript
- Use strict TypeScript settings
- Define types in `types/` directory
- Prefer interfaces over type aliases for object types
- Use proper type guards for runtime checks

### Linting
- Always run `npm run lint` before committing
- Fix errors, warnings are acceptable
- Follow ESLint configuration in `eslint.config.js`

### Testing
- Jest configuration available (`jest.config.js`)
- Test files: `*.test.ts` or `*.spec.ts`
- Run tests: `npm run test`

## Common Patterns

### Error Handling
```typescript
import { crossPlatformAlert } from '../utils/crossPlatformAlert';

try {
  await operation();
} catch (error) {
  crossPlatformAlert('Error', error.message);
}
```

### Firebase Operations
```typescript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const docRef = await addDoc(collection(db, 'drones'), {
  ...data,
  createdAt: serverTimestamp(),
  createdBy: user.uid
});
```

### Internationalization
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const title = t('drones.title');
```

## Troubleshooting Common Issues

### Build Failures
- **"Firebase: Error (auth/invalid-api-key)"** - Missing Firebase config
- **"ENOENT: google-services.json"** - Missing Android Firebase config
- **HTTP 500 on dev server** - Missing Firebase configuration
- **ESLint errors** - Run `npm run lint` to identify issues

### Development Environment
- Node.js 22 required (as per GitHub Actions)
- Use npm (package-lock.json present)
- Android SDK required for Android development

## Version Management

- Automatic version bumps on PR merges to main
- Manual version bumps via GitHub Actions
- Versions synced between `package.json` and `app.json`

## Reference Documentation

For complete policies and detailed troubleshooting, see:
- `.github/instructions/copilot-instructions.md` - Complete development guide
- `.github/instructions/OWASP Top 10.md` - Security guidelines
- `.github/instructions/Broken Access Control.md` - Access control patterns
- Security policy files in `.github/instructions/` - Latest security requirements