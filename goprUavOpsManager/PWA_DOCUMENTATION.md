# Progressive Web App (PWA) Implementation

This document describes the Progressive Web App (PWA) implementation for the GOPR UAV Ops Manager.

## Overview

The GOPR UAV Ops Manager has been converted to a Progressive Web App (PWA) to provide enhanced user experience including:

- **Installability**: Users can install the app on their devices like a native app
- **Offline functionality**: Core app features work without internet connection
- **App-like experience**: Runs in standalone mode without browser UI
- **Background sync**: Supports background synchronization when connectivity is restored
- **Push notifications**: Ready for push notification implementation

## PWA Implementation Details

### Files Added/Modified

#### Core PWA Files:
- `public/manifest.json` - Web app manifest defining app metadata
- `public/service-worker.js` - Service worker for offline functionality and caching
- `public/browserconfig.xml` - Windows-specific PWA configuration
- `public/index.html` - HTML template with PWA meta tags (template for reference)

#### App Integration:
- `utils/pwaUtils.ts` - Service worker registration and PWA utilities
- `utils/pwaMetaInjection.ts` - Dynamic meta tag injection for PWA compliance
- `components/PWAHead.tsx` - React component for PWA meta tags (Expo Router approach)
- `app/_layout.tsx` - Modified to register service worker and include PWA components
- `app.json` - Updated web configuration to reference manifest and service worker

### Features Implemented

#### 1. Web App Manifest (`manifest.json`)
```json
{
  "name": "GOPR UAV Ops Manager",
  "short_name": "GOPR UAV Ops",
  "description": "Comprehensive UAV operations management system for GOPR Bieszczady",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#009688",
  "background_color": "#ffffff",
  "categories": ["business", "productivity", "utilities"],
  "icons": [...]
}
```

#### 2. Service Worker Functionality
- **Cache Management**: Implements separate caches for static and dynamic content
- **Cache Strategies**:
  - Cache-first for static assets (CSS, JS, images)
  - Network-first for dynamic content and API calls
- **Offline Support**: Serves cached content when offline
- **Background Sync**: Ready for offline action synchronization
- **Update Management**: Handles service worker updates gracefully

#### 3. PWA Meta Tags
Meta tags are dynamically injected to ensure PWA compliance:
- `theme-color` for Android status bar theming
- Apple-specific meta tags for iOS PWA support
- Microsoft-specific tags for Windows PWA support
- Open Graph and Twitter tags for social sharing

#### 4. Installation Support
- Install prompt handling utilities
- Detection of PWA installation status
- Custom install button integration ready

## Usage Instructions

### Building the PWA

1. **Development Build**:
   ```bash
   npm run web
   ```

2. **Production Build**:
   ```bash
   npm run export:web
   ```

3. **Serve Static Build**:
   ```bash
   # Using Python
   cd dist && python3 -m http.server 8080
   
   # Using serve
   npx serve dist -p 8080
   ```

### Testing PWA Features

#### 1. Using Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section to verify manifest.json
4. Check **Service Workers** section to verify service worker registration
5. Use **Lighthouse** tab to run PWA audit

#### 2. Using Lighthouse
```bash
# Install Lighthouse
npm install -g lighthouse

# Run PWA audit
lighthouse http://localhost:8080 --only-categories=pwa --output=html --output-path=pwa-audit.html
```

#### 3. Testing Offline Mode
1. Open the app in Chrome
2. Go to DevTools > Network tab
3. Check "Offline" checkbox
4. Refresh the page - app should still work
5. Navigate between cached pages

#### 4. Testing Install Prompt
1. Open the app in Chrome (desktop)
2. Look for install icon in address bar
3. Or use DevTools > Application > Manifest > Install

### PWA Compliance Checklist

- ✅ **HTTPS**: Required for PWA (development works on localhost)
- ✅ **Web App Manifest**: Present with required fields
- ✅ **Service Worker**: Registered and functional
- ✅ **Responsive Design**: App works on mobile and desktop
- ✅ **Offline Functionality**: Core features work offline
- ✅ **Install Prompt**: Ready for installation
- ✅ **Lighthouse Score**: Should score 100% in PWA category

## Configuration

### Environment Variables
No additional environment variables needed for PWA functionality. Existing Firebase configuration is used.

### Test Accounts
Use the following test accounts to test the PWA:
- **Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123  
- **User**: user@example.com / user123

### Customization

#### Updating App Icons
1. Replace icons in `assets/images/`:
   - `icon.png` (1024x1024) - Main app icon
   - `favicon.png` (16x16) - Browser favicon
   - `splash-icon.png` (1024x1024) - Splash screen

2. Update `manifest.json` icon references if needed

#### Updating Theme Colors
1. Update `theme_color` in `manifest.json`
2. Update theme color in meta tag injection (`pwaMetaInjection.ts`)
3. Update `TileColor` in `browserconfig.xml`

#### Cache Strategy Customization
Edit `service-worker.js` to modify:
- Cache names and versions
- Files to cache
- Cache strategies for different content types
- Cache expiration policies

## Browser Support

### PWA Features Support:
- **Chrome/Edge**: Full PWA support
- **Firefox**: Service worker and manifest support
- **Safari**: Limited PWA support (no install prompt on macOS)
- **Mobile browsers**: Good PWA support on modern versions

### Fallback Behavior:
- On unsupported browsers, app runs as regular web app
- Service worker registration fails gracefully
- Meta tags still provide enhanced mobile experience

## Troubleshooting

### Common Issues:

1. **Service Worker Not Registering**
   - Check console for errors
   - Ensure serving over HTTPS (or localhost)
   - Verify service-worker.js is accessible

2. **Manifest Not Loading**
   - Check manifest.json syntax
   - Verify manifest path in HTML
   - Check MIME type (should be application/json)

3. **Install Prompt Not Showing**
   - Ensure PWA criteria are met
   - Check Lighthouse audit
   - Install prompt may be suppressed after dismissal

4. **Offline Mode Not Working**
   - Check service worker cache logs
   - Verify files are being cached
   - Test cache strategies in DevTools

### Debug Commands:
```bash
# Check manifest
curl http://localhost:8080/manifest.json

# Check service worker
curl http://localhost:8080/service-worker.js

# Run PWA audit
lighthouse http://localhost:8080 --only-categories=pwa
```

## Security Considerations

1. **HTTPS Required**: PWA features require secure context
2. **CSP Headers**: Consider Content Security Policy for enhanced security
3. **Cache Poisoning**: Service worker cache is isolated per origin
4. **Update Mechanism**: Service worker updates automatically on code changes

## Performance

### Optimization Features:
- Static asset caching reduces load times
- Offline-first approach improves perceived performance
- Background sync prevents data loss
- Preloading of critical resources

### Monitoring:
- Use Chrome DevTools Performance tab
- Monitor cache hit rates in Network tab
- Use Lighthouse for performance audits

## Future Enhancements

### Planned Features:
1. **Push Notifications**: Real-time notifications for important events
2. **Background Sync**: Sync offline actions when connectivity restored
3. **Advanced Caching**: Implement more sophisticated cache strategies
4. **App Shortcuts**: Add app shortcuts for quick access to key features
5. **Share Target**: Allow sharing content to the app

### Integration Opportunities:
- Integrate with existing offline functionality (`OfflineProcedureChecklistService`)
- Enhanced Firebase offline support
- Web Share API integration
- Credential Management API