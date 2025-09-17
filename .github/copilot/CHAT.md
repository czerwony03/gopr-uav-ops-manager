# GitHub Copilot Chat Instructions - GOPR UAV Ops Manager

## Project Context for Chat Assistance

When providing chat-based help, understand that this is a **GOPR UAV Operations Manager** - a React Native + Expo application for managing drone operations, flights, procedures, and users with role-based access control.

## Key Chat Support Areas

### Development Workflow Help

**Build and Setup Questions**
- Always mention Firebase configuration requirements for any build/export operations
- Remind about `npm install` timeout requirements (3+ minutes, never cancel)
- For lint issues: `npm run lint` from `goprUavOpsManager/` directory
- Development server: `npm run start` (Metro bundler) or `npm run web` (web dev)

**Common Build Issues**
- Firebase config missing → Need `google-services.json` and `GoogleService-Info.plist`
- "Firebase: Error (auth/invalid-api-key)" → Missing or invalid Firebase environment variables
- HTTP 500 on dev server → Firebase configuration preventing app initialization
- ESLint errors → Run lint, fix errors (warnings acceptable)

### Architecture and Code Guidance

**Technology Stack Context**
- React Native with Expo SDK 53
- TypeScript (strict settings)
- Firebase (Auth, Firestore, Storage, Functions)
- Expo Router (file-based routing)
- Cross-platform: web, iOS, Android

**Project Structure Context**
```
goprUavOpsManager/
├── app/           # Expo Router screens (file-based routing)
├── components/    # Reusable React Native components
├── services/      # Business logic and API services
├── utils/         # Utility functions and helpers
├── types/         # TypeScript type definitions
└── contexts/      # React contexts for global state
```

### Security and Access Control Guidance

**Authentication Context**
- Firebase Auth with Google Workspace SSO
- Domain restriction: @bieszczady.gopr.pl (server-side enforced)
- Role-based access: admin, manager, user
- Always validate user permissions before operations

**Security Patterns to Recommend**
```typescript
// Role validation
if (user?.role !== 'admin') {
  throw new Error('Insufficient permissions');
}

// Audit logging
auditService.log('UPDATE', 'drone', droneId, userId);

// Soft delete pattern
await updateDoc(docRef, { 
  deleted: true, 
  deletedAt: serverTimestamp(),
  deletedBy: user.uid 
});
```

**Security Policy References**
- Direct users to `.github/instructions/` for latest security policies
- Reference OWASP Top 10 implementation guidelines
- Emphasize access control validation for all operations
- Mention audit logging requirements for CRUD operations

### Firebase Integration Support

**Web vs Mobile Differences**
- Web: Firebase JS SDK with popup-based Google auth
- Mobile: React Native Firebase with native Google Sign-In
- Different initialization patterns in `firebaseConfig.ts`

**Common Firebase Patterns**
```typescript
// Firestore operations
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Authentication checks
import { useAuth } from '../contexts/AuthContext';
const { user } = useAuth();
```

### Troubleshooting Assistance

**Build and Runtime Issues**
1. **Firebase Configuration Missing**
   - Symptoms: Auth errors, HTTP 500, build failures
   - Solution: Ensure Firebase config files are in place
   - Reference: Development requires proper Firebase setup

2. **Dependency Issues**
   - Run `npm install` from `goprUavOpsManager/` directory
   - Allow full timeout (3+ minutes)
   - Check for Node.js 22 compatibility

3. **Linting Problems**
   - Run `npm run lint` to identify issues
   - Fix errors (warnings are acceptable)
   - Common issue: React hooks dependency arrays

4. **Native Build Issues**
   - Android: Requires Android SDK + `google-services.json`
   - iOS: Requires `GoogleService-Info.plist`
   - Use `npx expo prebuild` for native directories

### Code Pattern Assistance

**React Native + Expo Patterns**
- File-based routing in `app/` directory
- Functional components with hooks
- Cross-platform alert utility: `crossPlatformAlert`
- Internationalization: `useTranslation` hook

**State Management**
- React hooks and context (no Redux)
- Auth context for user state
- Local state with useState/useReducer

**TypeScript Conventions**
- Strict TypeScript settings
- Type definitions in `types/` directory
- Interface over type aliases for objects
- Proper type guards for runtime checks

### Version and Deployment Context

**Automated Processes**
- Version bumps on PR merges to main branch
- GitHub Actions build Android APK/AAB
- EAS Hosting for web deployment
- Synchronized versions between `package.json` and `app.json`

**Manual Operations**
- Manual version bumps via GitHub Actions
- Firebase Functions deployment (separate directory: `firebaseFunctions/`)

## Chat Response Guidelines

### Always Include Context
- Mention project type (React Native + Expo UAV management app)
- Reference security requirements when applicable
- Point to `.github/instructions/` for detailed policies

### Build and Setup Responses
- Always mention Firebase configuration requirements
- Include timeout warnings for long-running commands
- Provide specific directory context (`goprUavOpsManager/`)

### Security-Related Responses
- Reference role-based access control
- Mention audit logging requirements
- Direct to security policy files for comprehensive guidance
- Emphasize input validation and access control

### Code Suggestions
- Follow existing patterns in codebase
- Include TypeScript types
- Reference appropriate utility functions
- Consider cross-platform compatibility

### Error Resolution
- Start with most common causes (Firebase config, dependencies)
- Provide step-by-step troubleshooting
- Reference relevant documentation in `.github/instructions/`
- Include context about expected behavior vs. errors

## Reference for Detailed Information

For comprehensive information, always direct users to:
- `.github/instructions/copilot-instructions.md` - Complete development workflow
- `.github/instructions/OWASP Top 10.md` - Security implementation guidelines  
- `.github/instructions/Broken Access Control.md` - Access control patterns
- Other security policy files in `.github/instructions/` - Latest security requirements and implementation details