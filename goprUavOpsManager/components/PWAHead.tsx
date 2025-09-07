import { Platform } from 'react-native';
import Head from 'expo-router/head';

/**
 * PWA Head component that adds necessary meta tags for Progressive Web App functionality
 * Only renders on web platform
 */
export function PWAHead() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Head>
      {/* Basic PWA meta tags */}
      <meta name="theme-color" content="#009688" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="GOPR UAV Ops" />
      <meta name="description" content="Comprehensive UAV operations management system for GOPR Bieszczady" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#009688" />
      <meta name="msapplication-tap-highlight" content="no" />
      
      {/* Viewport for mobile devices */}
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
      
      {/* PWA Manifest */}
      <link rel="manifest" href="/manifest.json" />
      
      {/* Icons */}
      <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/assets/images/icon.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/assets/images/icon.png" />
      <link rel="apple-touch-icon" href="/assets/images/icon.png" />
      
      {/* Splash Screen for iOS */}
      <link rel="apple-touch-startup-image" href="/assets/images/splash-icon.png" />
      
      {/* Additional meta tags for SEO and social sharing */}
      <meta property="og:title" content="GOPR UAV Ops Manager" />
      <meta property="og:description" content="Comprehensive UAV operations management system for GOPR Bieszczady" />
      <meta property="og:image" content="/assets/images/icon.png" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="GOPR UAV Ops Manager" />
      <meta name="twitter:description" content="Comprehensive UAV operations management system for GOPR Bieszczady" />
      <meta name="twitter:image" content="/assets/images/icon.png" />
      
      {/* Keywords for search engines */}
      <meta name="keywords" content="UAV, drone, operations, management, GOPR, Bieszczady, search, rescue" />
      <meta name="author" content="GOPR Bieszczady" />
      
      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
    </Head>
  );
}
