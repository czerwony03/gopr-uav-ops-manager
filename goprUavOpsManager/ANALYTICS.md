# Firebase Analytics Integration

This document describes the Firebase Analytics integration implemented in the GOPR UAV Ops Manager application.

## Overview

Firebase Analytics has been integrated to track user actions and screen views across both Android (native Firebase) and web platforms. The implementation follows privacy best practices and is designed to be disabled by default in development and test environments.

## Features

### Screen Tracking
- **Automatic screen tracking**: Integrated with Expo Router to automatically track navigation between screens
- **Manual screen tracking**: Available for custom tracking scenarios
- **Sensitive screen tracking**: Special tracking for audit logs and user management screens

### User Authentication Tracking
- Login attempts (successful and failed) for both email and Google authentication
- Logout events
- User context initialization with anonymized user IDs

### CRUD Operations Tracking
- Create, edit, delete, and restore operations for:
  - Flights
  - Drones
  - Users
  - Procedures

### User Interaction Tracking
- Search operations
- Filter applications
- Data export operations
- Error occurrences

## Configuration

### Environment Variables

Analytics can be controlled via environment variables:

```bash
# Disable analytics (default in development/test)
EXPO_PUBLIC_ENABLE_ANALYTICS=false

# Enable analytics (for production)
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

### Automatic Disabling

Analytics is automatically disabled in the following scenarios:
- Test environment (`NODE_ENV=test`)
- Development environment (unless explicitly enabled)
- When `EXPO_PUBLIC_ENABLE_ANALYTICS=false`
- When Firebase Analytics is not supported (web browsers)

## Architecture

### Core Components

1. **firebaseConfig.ts**: Initializes Firebase Analytics based on platform and environment
2. **firebaseUtils.ts**: Provides platform-aware analytics utility functions
3. **analyticsService.ts**: High-level service for tracking specific events
4. **useAnalyticsScreenTracking.ts**: React hook for automatic screen tracking

### Platform Support

#### Web Platform
- Uses Firebase JS SDK (`firebase/analytics`)
- Screen tracking via `page_view` events
- Automatic browser compatibility checking

#### Android Platform
- Uses React Native Firebase SDK (`@react-native-firebase/analytics`)
- Native Firebase Analytics integration
- Automatic screen tracking via `setCurrentScreen`

## Usage Examples

### Automatic Screen Tracking

Screen tracking is automatically enabled in the main app layout:

```tsx
import { useAnalyticsScreenTracking } from '@/utils/useAnalyticsScreenTracking';

function RootLayoutNavigation() {
  useAnalyticsScreenTracking(); // Automatically tracks all screen changes
  // ... rest of component
}
```

### Manual Event Tracking

```tsx
import { AnalyticsService } from '@/services/analyticsService';

// Track user actions
await AnalyticsService.trackCreate('flight', flightId);
await AnalyticsService.trackLogin('google');
await AnalyticsService.trackSearch('drone search', 5);
```

### Sensitive Screen Tracking

```tsx
import { useAnalyticsSensitiveScreenTracking } from '@/utils/useAnalyticsScreenTracking';

function AuditLogsScreen() {
  useAnalyticsSensitiveScreenTracking('audit_logs');
  // ... rest of component
}
```

## Privacy and Security

### Data Anonymization
- User IDs are anonymized (first 4 characters only)
- Entity IDs are truncated for privacy
- No sensitive user data is logged

### User Properties
Only non-sensitive user properties are tracked:
- User role (admin, manager, user)
- Platform (web, mobile)
- Language preference

### Data Sanitization
All event parameters are sanitized to:
- Remove undefined values
- Convert complex objects to strings
- Ensure Firebase Analytics compatibility

## Event Catalog

### Authentication Events
- `login` - Successful login
- `login_failed` - Failed login attempt
- `logout` - User logout

### CRUD Events
- `create_flight`, `create_drone`, `create_user`, `create_procedure`
- `edit_flight`, `edit_drone`, `edit_user`, `edit_procedure`
- `delete_flight`, `delete_drone`, `delete_user`, `delete_procedure`
- `restore_flight`, `restore_drone`, `restore_user`, `restore_procedure`

### Navigation Events
- `screen_view` - Automatic screen tracking
- `view_audit_logs` - Audit logs access
- `view_user_management` - User management access

### Interaction Events
- `search` - Search operations
- `filter_applied` - Filter usage
- `export_data` - Data export
- `error_occurred` - Error tracking

## Testing

Analytics functionality is thoroughly tested with mock implementations:

```bash
npm test -- --testPathPatterns=analyticsService.test.ts
```

## Deployment Considerations

### Development Environment
- Analytics is disabled by default
- Console logging indicates analytics status
- No data is sent to Firebase Analytics

### Production Environment
- Set `EXPO_PUBLIC_ENABLE_ANALYTICS=true`
- Ensure Firebase project has Analytics enabled
- Verify measurement ID is correctly configured

### Firebase Console
Analytics events will appear in the Firebase Analytics dashboard:
- Events tab: View custom events
- Audiences: Create user segments
- Funnel Analysis: Track user flows

## Troubleshooting

### Common Issues

1. **Analytics not working in development**
   - Expected behavior - analytics disabled by default in development

2. **Tests failing with Firebase Analytics errors**
   - Fixed - analytics imports are conditional based on NODE_ENV

3. **Events not appearing in Firebase Console**
   - Check that analytics is enabled in production
   - Verify Firebase configuration
   - Allow 24-48 hours for data to appear

### Debug Logging

Analytics operations include detailed console logging:
```
[Analytics] Event logged: login {"method":"email","platform":"web"}
[Analytics] Screen view tracked: dashboard
[Analytics] User context initialized for analytics
```

## Future Enhancements

Potential improvements for the analytics system:
- Custom conversion tracking
- User journey analysis
- Performance monitoring integration
- Advanced segmentation
- Real-time analytics dashboard