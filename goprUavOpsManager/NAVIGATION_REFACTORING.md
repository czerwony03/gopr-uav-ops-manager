# Nested Navigation Structure Implementation

This document describes the changes made to implement nested navigation for flights and provides instructions for replicating the same pattern for other entities (drones, users, procedures).

## Overview

The navigation refactoring addresses the Android back button behavior issue by creating a proper nested navigation stack. Previously, all screens were siblings at the top level, causing the back button to always return to the index screen. The new structure creates a logical navigation hierarchy.

## Changes Made for Flights

### 1. Directory Structure Changes
```
Before:
app/
├── flights-list.tsx
├── flight-details.tsx
├── flight-form.tsx
└── _layout.tsx

After:
app/
├── flights/
│   ├── index.tsx (renamed from flights-list.tsx)
│   ├── flight-details.tsx
│   ├── flight-form.tsx
│   └── _layout.tsx (new nested layout)
└── _layout.tsx (updated main layout)
```

### 2. Created Nested Layout (`app/flights/_layout.tsx`)
```tsx
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function FlightsLayout() {
  const { t } = useTranslation('common');

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066CC',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('flights.title'),
        }}
      />
      <Stack.Screen
        name="flight-details"
        options={{
          title: t('flights.flightDetails'),
        }}
      />
      <Stack.Screen
        name="flight-form"
        options={{
          title: t('flights.title'),
        }}
      />
    </Stack>
  );
}
```

### 3. Updated Main Layout (`app/_layout.tsx`)
- Removed individual flight screen definitions:
  - `flights-list` screen
  - `flight-details` screen  
  - `flight-form` screen
- Added single `flights` screen that references the folder

### 4. Updated Navigation Paths
- Changed from `/flight-details?id=${id}` to `/flights/flight-details?id=${id}`
- Changed from `/flight-form` to `/flights/flight-form`
- Changed from `/flight-form?id=${id}` to `/flights/flight-form?id=${id}`

### 5. Updated External References
- Updated `CustomDrawerContent.tsx` from `/flights-list` to `/flights`
- Updated `README.md` documentation

## Instructions for Other Entities

Follow these steps to implement the same nested navigation pattern for other entities:

### For Drones Entity

1. **Create nested directory structure:**
   ```bash
   mkdir app/drones
   mv app/drones-list.tsx app/drones/index.tsx
   mv app/drone-details.tsx app/drones/
   mv app/drone-form.tsx app/drones/
   ```

2. **Create `app/drones/_layout.tsx`:**
   ```tsx
   import { Stack } from 'expo-router';
   import { useTranslation } from 'react-i18next';

   export default function DronesLayout() {
     const { t } = useTranslation('common');

     return (
       <Stack
         screenOptions={{
           headerStyle: {
             backgroundColor: '#0066CC',
           },
           headerTintColor: '#fff',
           headerTitleStyle: {
             fontWeight: 'bold',
           },
         }}
       >
         <Stack.Screen
           name="index"
           options={{
             title: t('drones.title'),
           }}
         />
         <Stack.Screen
           name="drone-details"
           options={{
             title: t('drones.details'),
           }}
         />
         <Stack.Screen
           name="drone-form"
           options={{
             title: t('drones.title'),
           }}
         />
       </Stack>
     );
   }
   ```

3. **Update main `_layout.tsx`:**
   - Change `drones-list` to `drones`
   - Remove `drone-details` and `drone-form` screens

4. **Update navigation paths in drone screens:**
   - `/drone-details?id=${id}` → `/drones/drone-details?id=${id}`
   - `/drone-form` → `/drones/drone-form`

5. **Update `CustomDrawerContent.tsx`:**
   - `/drones-list` → `/drones`

### For Users Entity

Follow the same pattern as drones:
- Create `app/users/` directory
- Move `users-list.tsx` → `users/index.tsx`
- Move `user-details.tsx` → `users/`
- Move `user-form.tsx` → `users/`
- Create `users/_layout.tsx`
- Update navigation paths from `/user-*` to `/users/user-*`

### For Procedures Entity

Follow the same pattern:
- Create `app/procedures/` directory  
- Move `procedures-checklists-list.tsx` → `procedures/index.tsx`
- Move other procedure screens to `procedures/`
- Create `procedures/_layout.tsx`
- Update navigation paths accordingly

## Benefits

1. **Proper Navigation Stack:** Back button now navigates to the logical previous screen
2. **Better Organization:** Related screens are grouped together in folders
3. **Consistent Pattern:** All entity types follow the same navigation structure
4. **Maintainability:** Easier to manage and extend individual entity navigation

## Navigation Flow Examples

### Before (Flat Structure)
```
Index → Flights List → [Back] → Index (❌ Wrong!)
Index → Flight Details → [Back] → Index (❌ Wrong!)
```

### After (Nested Structure)  
```
Index → Flights List → Flight Details → [Back] → Flights List (✅ Correct!)
Index → Flights List → Flight Form → [Back] → Flights List (✅ Correct!)
Index → Flights List → Flight Details → Flight Form → [Back] → Flight Details (✅ Correct!)
```

## Testing

After implementing the changes:

1. **Verify TypeScript compilation:** `npx tsc --noEmit`
2. **Test navigation flow:** 
   - Navigate to flights list
   - Open a flight detail
   - Edit the flight  
   - Verify back navigation works correctly at each step
3. **Test drawer navigation:** Ensure flights entry in drawer still works
4. **Test deep linking:** Verify direct URLs still work with new paths

## Notes

- Import paths may need updating if files are moved to subdirectories
- Ensure all external references to old paths are updated
- The pattern is consistent across all entity types for maintainability
- Back navigation is handled automatically by Expo Router's Stack navigator