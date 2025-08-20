# i18n Implementation Documentation

## Overview

This document describes the internationalization (i18n) implementation for the GOPR UAV Ops Manager application, which provides support for Polish (default) and English languages.

## Architecture

### Core Components

1. **i18n Configuration** (`src/i18n/index.ts`)
   - Initializes i18next with react-i18next
   - Manages language detection and persistence using AsyncStorage
   - Sets Polish as the default and fallback language
   - Provides utility functions for language management

2. **Translation Files**
   - `src/i18n/locales/pl/common.json` - Polish translations
   - `src/i18n/locales/en/common.json` - English translations

3. **Language Selector Component** (`src/components/LanguageSelector.tsx`)
   - User-friendly language switching interface
   - Displays current language in native script
   - Integrated into the Info & Contact screen

## Features

### Language Support
- **Polish (pl)**: Default and fallback language
- **English (en)**: Secondary language
- Automatic device language detection with Polish fallback
- User preference persistence using AsyncStorage

### Translation Categories

#### Navigation (`nav`)
- home, flights, drones, users, procedures, info, auditLogs

#### Flight Management (`flights`)
- title, newFlight, logbook, flightDetails, add, edit, delete

#### Drone Management (`drones`)
- title, registry, add, edit, details

#### Mission Management (`missions`)
- title, newMission, details

#### Authentication (`auth`)
- signIn, signOut, email, password, login, loginWithGoogle

#### Settings (`settings`)
- title, language, theme, profile

#### Common Elements (`common`)
- ok, yes, no, cancel, save, edit, delete, back
- loading, error, success, warning, info
- welcome, profile, lastLogin, accountActivity, capabilities
- contactAdmin

#### User Management (`user`)
- details, role, admin, manager, user, email, firstName, lastName

## Implementation Details

### Integration Points

1. **App Entry Point** (`app/_layout.tsx`)
   - i18n initialization import
   - Translation integration in navigation drawer
   - Dynamic screen titles based on selected language

2. **Key Screens Updated**
   - Home screen (`app/index.tsx`): Welcome message, loading text, capabilities
   - Login screen (`screens/LoginScreen.tsx`): Sign in labels, placeholders, contact admin text
   - Flight details (`app/flight-details.tsx`): Error messages, loading states
   - Info & Contact (`app/info-contact.tsx`): Title, language selector integration

### Usage Pattern

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <Text>{t('common.welcome')}</Text>
  );
}
```

### Language Switching

```typescript
import { changeLanguage } from '../src/i18n';

// Switch language
await changeLanguage('en'); // or 'pl'
```

## Benefits

1. **User Experience**
   - Native Polish support for GOPR team members
   - English support for international collaboration
   - Persistent language preferences
   - Seamless language switching

2. **Maintainability**
   - Centralized translation management
   - Type-safe translation keys
   - Consistent UI text across the application

3. **Extensibility**
   - Easy to add new languages
   - Structured translation keys for organization
   - Namespace support for different application areas

## Best Practices

1. **Translation Keys**
   - Use descriptive, hierarchical keys (e.g., `auth.signIn`, `common.ok`)
   - Group related translations in namespaces
   - Keep keys consistent between languages

2. **Component Integration**
   - Always use `useTranslation` hook for reactive updates
   - Prefer translation keys over hardcoded strings
   - Handle pluralization when needed

3. **Testing**
   - Test language switching functionality
   - Verify text fits in UI elements for both languages
   - Ensure proper fallback behavior

## Files Modified/Added

### New Files
- `src/i18n/index.ts` - Core i18n configuration
- `src/i18n/locales/pl/common.json` - Polish translations
- `src/i18n/locales/en/common.json` - English translations
- `src/components/LanguageSelector.tsx` - Language switching component

### Modified Files
- `package.json` - Added i18n dependencies
- `app/_layout.tsx` - i18n initialization and navigation translations
- `app/index.tsx` - Home screen translations
- `app/info-contact.tsx` - Title and language selector
- `screens/LoginScreen.tsx` - Login form translations
- `app/flight-details.tsx` - Error and loading message translations

## Dependencies Added

```json
{
  "i18next": "latest",
  "react-i18next": "latest", 
  "react-native-localize": "latest"
}
```

## Future Enhancements

1. **Additional Languages**
   - Easy to add more languages by creating new translation files
   - Update language selector to support additional options

2. **Advanced Features**
   - Pluralization support for complex grammar rules
   - Date and number formatting based on locale
   - RTL language support if needed

3. **Content Management**
   - External translation management system integration
   - Dynamic translation loading
   - Translation validation and completeness checking

## Conclusion

The i18n implementation provides a solid foundation for multilingual support in the GOPR UAV Ops Manager application. With Polish as the primary language and English as a secondary option, the application now serves both local GOPR teams and international collaborators effectively.