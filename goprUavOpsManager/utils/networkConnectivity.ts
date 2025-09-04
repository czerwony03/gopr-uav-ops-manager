import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Network connectivity utility for detecting online/offline status
 * Works across web and mobile platforms
 */
export class NetworkConnectivity {
  private static listeners: ((isConnected: boolean) => void)[] = [];
  private static currentState: boolean = true; // Assume online by default

  /**
   * Initialize network monitoring
   */
  static initialize(): void {
    if (Platform.OS === 'web') {
      // Web platform: Use browser APIs
      this.currentState = navigator.onLine;
      
      window.addEventListener('online', this.handleWebOnline);
      window.addEventListener('offline', this.handleWebOffline);
    } else {
      // Mobile platforms: Use NetInfo
      NetInfo.addEventListener(this.handleNetInfoChange);
      
      // Get initial state
      NetInfo.fetch().then((state) => {
        this.currentState = state.isConnected ?? true;
        this.notifyListeners(this.currentState);
      });
    }
  }

  /**
   * Clean up network monitoring
   */
  static cleanup(): void {
    if (Platform.OS === 'web') {
      window.removeEventListener('online', this.handleWebOnline);
      window.removeEventListener('offline', this.handleWebOffline);
    } else {
      // NetInfo automatically cleans up when the component unmounts
    }
    this.listeners = [];
  }

  /**
   * Get current connection status
   */
  static async getConnectionStatus(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    } else {
      const state = await NetInfo.fetch();
      return state.isConnected ?? true;
    }
  }

  /**
   * Add a listener for connection status changes
   */
  static addListener(callback: (isConnected: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Handle web online event
   */
  private static handleWebOnline = (): void => {
    this.currentState = true;
    this.notifyListeners(true);
  };

  /**
   * Handle web offline event
   */
  private static handleWebOffline = (): void => {
    this.currentState = false;
    this.notifyListeners(false);
  };

  /**
   * Handle NetInfo state change (mobile)
   */
  private static handleNetInfoChange = (state: NetInfoState): void => {
    const isConnected = state.isConnected ?? true;
    if (isConnected !== this.currentState) {
      this.currentState = isConnected;
      this.notifyListeners(isConnected);
    }
  };

  /**
   * Notify all listeners of connection status change
   */
  private static notifyListeners(isConnected: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('Error in network connectivity listener:', error);
      }
    });
  }

  /**
   * Get current cached connection status (synchronous)
   */
  static getCurrentStatus(): boolean {
    return this.currentState;
  }
}