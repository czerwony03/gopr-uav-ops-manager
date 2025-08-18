import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ApplicationPlatform } from '../types/AuditLog';

/**
 * Utility class to get application metadata for audit logging
 */
export class ApplicationMetadata {
  /**
   * Get the current application platform
   */
  static getPlatform(): ApplicationPlatform {
    switch (Platform.OS) {
      case 'ios':
        return 'ios';
      case 'android':
        return 'android';
      case 'web':
      default:
        return 'web';
    }
  }

  /**
   * Get the application version from Expo Constants or app.json
   */
  static getVersion(): string {
    // Try to get version from Expo Constants first (more reliable in runtime)
    if (Constants.expoConfig?.version) {
      return Constants.expoConfig.version;
    }

    // Final fallback to hardcoded version (should match app.json)
    return 'unknown';
  }

  /**
   * Get the git commit hash if available
   * This will be available if the app is built with the commit hash in environment variables
   */
  static getCommitHash(): string | undefined {
    // Check if commit hash is available in environment variables
    if (process.env.EXPO_PUBLIC_COMMIT_HASH) {
      return process.env.EXPO_PUBLIC_COMMIT_HASH;
    }

    // Check if it's available in Expo Constants (for EAS builds)
    if (Constants.expoConfig?.extra?.commitHash) {
      return Constants.expoConfig.extra.commitHash;
    }

    return undefined;
  }

  /**
   * Get complete application metadata for audit logging
   */
  static getMetadata() {
    return {
      applicationPlatform: this.getPlatform(),
      applicationVersion: this.getVersion(),
      commitHash: this.getCommitHash(),
    };
  }
}
