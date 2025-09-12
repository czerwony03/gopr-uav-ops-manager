import { useNetworkStatus } from './useNetworkStatus';

/**
 * Hook for managing button disabled states based on network connectivity
 * Returns helper functions to determine if buttons should be disabled when offline
 */
export function useOfflineButtons() {
  const { isOffline } = useNetworkStatus();

  /**
   * Check if a button should be disabled when offline
   * @param allowOffline - Whether this button is allowed to work offline (default: false)
   * @returns true if button should be disabled
   */
  const isButtonDisabled = (allowOffline: boolean = false): boolean => {
    return isOffline && !allowOffline;
  };

  /**
   * Check if navigation to a route should be disabled when offline
   * @param route - The route to navigate to
   * @returns true if navigation should be disabled
   */
  const isNavigationDisabled = (route: string): boolean => {
    // Only procedures routes are allowed offline
    const offlineRoutes = ['/procedures', '/info-contact'];
    const isOfflineRoute = offlineRoutes.some(allowedRoute =>
      route.startsWith(allowedRoute) || route === '/'
    );
    
    return isOffline && !isOfflineRoute;
  };

  /**
   * Get disabled style for buttons when they should be disabled
   * @param allowOffline - Whether this button is allowed to work offline
   * @returns style object or empty object
   */
  const getDisabledStyle = (allowOffline: boolean = false) => {
    if (isButtonDisabled(allowOffline)) {
      return {
        backgroundColor: '#ccc',
        opacity: 0.6,
      };
    }
    return {};
  };

  return {
    isOffline,
    isButtonDisabled,
    isNavigationDisabled,
    getDisabledStyle,
  };
}
