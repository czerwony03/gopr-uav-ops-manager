// Service Worker Registration for PWA functionality
// This should be called early in the app lifecycle on web platform

import { Platform } from 'react-native';

/**
 * Register the service worker for PWA functionality
 * Only works on web platform with HTTPS (or localhost)
 */
export const registerServiceWorker = async (): Promise<void> => {
  if (Platform.OS !== 'web') {
    console.log('[PWA] Service worker registration skipped - not web platform');
    return;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }

  try {
    console.log('[PWA] Registering service worker...');
    
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('[PWA] Service worker registered successfully:', registration.scope);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      console.log('[PWA] Service worker update found');
      
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New service worker installed, app will update on next load');
            
            // Optionally notify user about the update
            showUpdateAvailableNotification();
          }
        });
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
      console.log('[PWA] Message from service worker:', event.data);
    });

  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
  }
};

/**
 * Unregister the service worker (for development/debugging)
 */
export const unregisterServiceWorker = async (): Promise<void> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[PWA] Service worker unregistered');
    }
  } catch (error) {
    console.error('[PWA] Service worker unregistration failed:', error);
  }
};

/**
 * Check if the app is running as an installed PWA
 */
export const isPWAInstalled = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Check if running in standalone mode (installed PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true || // iOS Safari
         document.referrer.includes('android-app://'); // Android Chrome
};

/**
 * Check if PWA installation is available
 */
export const isPWAInstallable = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Check if beforeinstallprompt is supported
  return 'BeforeInstallPromptEvent' in window;
};

/**
 * Show notification about app update availability
 */
const showUpdateAvailableNotification = (): void => {
  // This would integrate with your app's notification system
  console.log('[PWA] App update available - will be applied on next app start');
  
  // You could dispatch a custom event here that your app listens to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }
};

/**
 * Handle PWA installation prompt
 */
export const handlePWAInstallPrompt = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      resolve(false);
      return;
    }

    let deferredPrompt: any = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Install prompt triggered');
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show your custom install button or UI
      showInstallButton();
    };

    const showInstallButton = () => {
      // You could dispatch a custom event here that your app listens to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pwa-install-available', {
          detail: { 
            prompt: () => triggerInstall()
          }
        }));
      }
    };

    const triggerInstall = async () => {
      if (!deferredPrompt) {
        resolve(false);
        return;
      }

      // Show the prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User response to install prompt:', outcome);

      // Clear the prompt
      deferredPrompt = null;
      
      resolve(outcome === 'accepted');
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Clean up listener after 30 seconds if no prompt appears
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      resolve(false);
    }, 30000);
  });
};

/**
 * Check if the app is currently offline
 */
export const isOffline = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return !navigator.onLine;
};

/**
 * Listen for online/offline status changes
 */
export const setupOfflineListener = (callback: (isOffline: boolean) => void): (() => void) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(false);
  const handleOffline = () => callback(true);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};