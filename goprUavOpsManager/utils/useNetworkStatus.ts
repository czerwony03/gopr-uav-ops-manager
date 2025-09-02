import { useState, useEffect } from 'react';
import { NetworkConnectivity } from '@/utils/networkConnectivity';

/**
 * Hook for monitoring network connectivity status
 * Returns current online/offline status and updates when it changes
 */
export function useNetworkStatus(): {
  isConnected: boolean;
  isOnline: boolean;
  isOffline: boolean;
} {
  const [isConnected, setIsConnected] = useState(() => NetworkConnectivity.getCurrentStatus());

  useEffect(() => {
    // Initialize network monitoring if not already done
    NetworkConnectivity.initialize();

    // Add listener for connection changes
    const unsubscribe = NetworkConnectivity.addListener(setIsConnected);

    // Get current status
    NetworkConnectivity.getConnectionStatus().then(setIsConnected);

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    isOnline: isConnected,
    isOffline: !isConnected,
  };
}