/**
 * Analytics Screen Tracking Hook
 * 
 * Provides automatic screen tracking for Expo Router navigation with Firebase Analytics.
 * Handles both initial screen loads and navigation changes.
 */

import { useEffect, useRef } from 'react';
import { useSegments, usePathname, useLocalSearchParams } from 'expo-router';
import { AnalyticsService } from '@/services/analyticsService';

/**
 * Hook to automatically track screen views with Firebase Analytics
 */
export function useAnalyticsScreenTracking() {
  const segments = useSegments();
  const pathname = usePathname();
  const searchParams = useLocalSearchParams();
  const previousScreenRef = useRef<string | null>(null);

  useEffect(() => {
    // Generate screen name from segments or pathname
    const screenName = generateScreenName(segments, pathname);
    
    // Only track if screen name changed to avoid duplicate events
    if (screenName && screenName !== previousScreenRef.current) {
      previousScreenRef.current = screenName;
      
      // Track screen view with analytics
      AnalyticsService.trackScreenView(screenName, searchParams).catch(error => {
        console.warn('[useAnalyticsScreenTracking] Failed to track screen view:', error);
      });
      
      console.log(`[Analytics] Screen view tracked: ${screenName}`);
    }
  }, [segments, pathname, searchParams]);
}

/**
 * Generate a consistent screen name from Expo Router segments or pathname
 */
function generateScreenName(segments: string[], pathname: string): string {
  if (segments.length === 0) {
    return 'unknown';
  }

  // Use segments to create a structured screen name
  let screenName = segments.join('/');
  
  // Handle special cases and clean up screen names
  screenName = screenName
    .replace(/^\(tabs\)\//, '') // Remove tab group prefix
    .replace(/^\(drawer\)\//, '') // Remove drawer group prefix
    .replace(/^app\//, '') // Remove app prefix
    .replace(/\/index$/, '') // Remove trailing /index
    .replace(/\/\[([^\]]+)\]/, '/:$1') // Convert [id] to :id
    .replace(/^\/$/, 'home') // Convert root to home
    || 'home';

  // Fallback to pathname if segments don't provide good name
  if (screenName === 'unknown' || screenName === '') {
    screenName = pathname
      .replace(/^\//, '') // Remove leading slash
      .replace(/\/\[([^\]]+)\]/g, '/:$1') // Convert [id] to :id
      .replace(/\/$/, '') // Remove trailing slash
      || 'home';
  }

  return screenName;
}

/**
 * Hook to manually track sensitive screen views
 */
export function useAnalyticsSensitiveScreenTracking(screenType: 'audit_logs' | 'user_management') {
  useEffect(() => {
    AnalyticsService.trackSensitiveScreenView(screenType).catch(error => {
      console.warn('[useAnalyticsSensitiveScreenTracking] Failed to track sensitive screen view:', error);
    });
  }, [screenType]);
}

/**
 * Manual screen tracking function for custom use cases
 */
export function trackScreenView(screenName: string, routeParams?: any) {
  AnalyticsService.trackScreenView(screenName, routeParams).catch(error => {
    console.warn('[trackScreenView] Failed to track screen view:', error);
  });
}