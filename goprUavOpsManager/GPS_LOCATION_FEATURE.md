# GPS Location Button Feature

## Overview

This feature adds a GPS location button to the flight creation and edit forms, allowing users to automatically retrieve and fill their current location using device GPS capabilities.

## Implementation Details

### Components Added

1. **LocationButton** (`components/LocationButton.tsx`)
   - Cross-platform GPS location component
   - Works on Web, Android, and iOS
   - Includes loading states and error handling
   - Supports internationalization

2. **Updated FlightForm** (`components/FlightForm.tsx`)
   - Added location container with input field and GPS button
   - Responsive layout design
   - Maintains existing functionality

### Dependencies Added

- `expo-location` - Cross-platform location services

### Translation Support

Added location-related translations in:
- `src/i18n/locales/en/common.json` - English translations
- `src/i18n/locales/pl/common.json` - Polish translations

## Features

### GPS Location Retrieval
- Automatically requests location permissions
- Gets current GPS coordinates with balanced accuracy
- Handles permission denials gracefully

### Reverse Geocoding
- Converts GPS coordinates to readable addresses
- Formats addresses using available components (name, street, city, region, country)
- Falls back to raw coordinates if geocoding fails

### Error Handling
- Permission denied scenarios
- Network errors
- Timeout conditions
- Generic location errors

### Cross-Platform Support

#### Web Platform
- Uses browser's Geolocation API through expo-location
- Shows browser permission prompts
- Handles HTTPS requirements for location access

#### Android Platform
- Uses native Android location services
- Requests runtime permissions
- Follows Android location best practices

#### iOS Platform
- Uses Core Location services
- Handles iOS-specific permission flows
- Follows iOS privacy guidelines

## Usage

The GPS button appears to the right of the location input field in:
- Flight creation form (`/flights/create`)
- Flight edit form (`/flights/[id]/edit`)

### User Interaction
1. User taps the location (🎯) button
2. System requests location permissions if needed
3. Button shows loading spinner while retrieving location
4. Location field is automatically filled with address or coordinates
5. Success feedback or error message is displayed

## Technical Details

### Location Button Component API

```typescript
interface LocationButtonProps {
  onLocationReceived: (location: string) => void;
  disabled?: boolean;
  style?: any;
}
```

### Error Messages

The component provides user-friendly error messages for:
- Permission denied
- Timeout errors
- Network errors
- Generic location errors

### Performance Considerations

- Uses balanced accuracy setting for good performance/accuracy trade-off
- Implements proper loading states to prevent multiple simultaneous requests
- Caches permission status to avoid repeated requests

## Testing

The feature can be tested by:
1. Opening flight creation/edit form
2. Clicking the GPS location button
3. Granting location permissions when prompted
4. Verifying location field is populated with current address

## Security & Privacy

- Requests location permissions explicitly
- Only accesses location when user initiates action
- Follows platform-specific privacy guidelines
- Does not store or transmit location data beyond form usage

## Browser Compatibility

Web platform requirements:
- HTTPS required for location access (except localhost)
- Modern browsers with Geolocation API support
- User must grant location permissions

## Future Enhancements

Potential improvements:
- Location history/favorites
- Manual coordinate entry
- Location validation
- Offline cached locations
- Custom accuracy settings