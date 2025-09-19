/**
 * Firebase Analytics Service
 * 
 * Provides centralized analytics tracking for user actions and screen views.
 * Handles both web and mobile platforms with privacy-aware event logging.
 */

import { analyticsUtils } from '@/utils/firebaseUtils';

/**
 * Standard event names following Firebase Analytics conventions
 */
export const AnalyticsEvents = {
  // Authentication events
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  
  // CRUD operations
  CREATE_FLIGHT: 'create_flight',
  EDIT_FLIGHT: 'edit_flight',
  DELETE_FLIGHT: 'delete_flight',
  RESTORE_FLIGHT: 'restore_flight',
  
  CREATE_DRONE: 'create_drone',
  EDIT_DRONE: 'edit_drone',
  DELETE_DRONE: 'delete_drone',
  RESTORE_DRONE: 'restore_drone',
  
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  RESTORE_USER: 'restore_user',
  
  CREATE_PROCEDURE: 'create_procedure',
  EDIT_PROCEDURE: 'edit_procedure',
  DELETE_PROCEDURE: 'delete_procedure',
  RESTORE_PROCEDURE: 'restore_procedure',
  
  // Navigation events
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  VIEW_USER_MANAGEMENT: 'view_user_management',
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_FLIGHTS: 'view_flights',
  VIEW_DRONES: 'view_drones',
  VIEW_PROCEDURES: 'view_procedures',
  
  // User interactions
  SEARCH: 'search',
  FILTER_APPLIED: 'filter_applied',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
} as const;

/**
 * User property keys for analytics segmentation
 */
export const AnalyticsUserProperties = {
  USER_ROLE: 'user_role',
  PLATFORM: 'platform',
  LANGUAGE: 'language',
} as const;

/**
 * Analytics Service Class
 */
export class AnalyticsService {
  /**
   * Initialize analytics with user context
   */
  static async initializeUser(userId: string | null, userRole?: string, language?: string): Promise<void> {
    if (!analyticsUtils.isEnabled()) {
      console.log('[AnalyticsService] Analytics disabled, skipping user initialization');
      return;
    }

    try {
      // Set user ID (anonymized for privacy)
      const anonymizedUserId = userId ? `user_${userId.substring(0, 8)}` : null;
      await analyticsUtils.setUserId(anonymizedUserId);

      // Set user properties for segmentation
      const properties: { [key: string]: string | null } = {
        [AnalyticsUserProperties.PLATFORM]: this.getPlatform(),
      };

      if (userRole) {
        properties[AnalyticsUserProperties.USER_ROLE] = userRole;
      }

      if (language) {
        properties[AnalyticsUserProperties.LANGUAGE] = language;
      }

      await analyticsUtils.setUserProperties(properties);
      
      console.log('[AnalyticsService] User context initialized for analytics');
    } catch (error) {
      console.warn('[AnalyticsService] Failed to initialize user context:', error);
    }
  }

  /**
   * Clear user context (on logout)
   */
  static async clearUser(): Promise<void> {
    if (!analyticsUtils.isEnabled()) {
      return;
    }

    try {
      await analyticsUtils.setUserId(null);
      await analyticsUtils.setUserProperties({
        [AnalyticsUserProperties.USER_ROLE]: null,
      });
      
      console.log('[AnalyticsService] User context cleared');
    } catch (error) {
      console.warn('[AnalyticsService] Failed to clear user context:', error);
    }
  }

  /**
   * Track screen view
   */
  static async trackScreenView(screenName: string, routeParams?: any): Promise<void> {
    if (!analyticsUtils.isEnabled()) {
      return;
    }

    try {
      await analyticsUtils.setCurrentScreen(screenName);
      
      // Also log as an event with additional context
      await analyticsUtils.logEvent('screen_view', {
        screen_name: screenName,
        has_params: !!routeParams,
        platform: this.getPlatform(),
      });
    } catch (error) {
      console.warn('[AnalyticsService] Failed to track screen view:', error);
    }
  }

  /**
   * Track authentication events
   */
  static async trackLogin(method: string = 'email'): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGIN, {
      method,
      platform: this.getPlatform(),
    });
  }

  static async trackLoginFailed(method: string = 'email', errorCode?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGIN_FAILED, {
      method,
      error_code: errorCode || 'unknown',
      platform: this.getPlatform(),
    });
  }

  static async trackLogout(): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGOUT, {
      platform: this.getPlatform(),
    });
  }

  /**
   * Track CRUD operations
   */
  static async trackCreate(entityType: 'flight' | 'drone' | 'user' | 'procedure', entityId?: string): Promise<void> {
    const eventName = `create_${entityType}` as keyof typeof AnalyticsEvents;
    await this.logEvent(AnalyticsEvents[eventName.toUpperCase() as keyof typeof AnalyticsEvents], {
      entity_type: entityType,
      entity_id: this.anonymizeId(entityId),
      platform: this.getPlatform(),
    });
  }

  static async trackEdit(entityType: 'flight' | 'drone' | 'user' | 'procedure', entityId?: string): Promise<void> {
    const eventName = `edit_${entityType}` as keyof typeof AnalyticsEvents;
    await this.logEvent(AnalyticsEvents[eventName.toUpperCase() as keyof typeof AnalyticsEvents], {
      entity_type: entityType,
      entity_id: this.anonymizeId(entityId),
      platform: this.getPlatform(),
    });
  }

  static async trackDelete(entityType: 'flight' | 'drone' | 'user' | 'procedure', entityId?: string): Promise<void> {
    const eventName = `delete_${entityType}` as keyof typeof AnalyticsEvents;
    await this.logEvent(AnalyticsEvents[eventName.toUpperCase() as keyof typeof AnalyticsEvents], {
      entity_type: entityType,
      entity_id: this.anonymizeId(entityId),
      platform: this.getPlatform(),
    });
  }

  static async trackRestore(entityType: 'flight' | 'drone' | 'user' | 'procedure', entityId?: string): Promise<void> {
    const eventName = `restore_${entityType}` as keyof typeof AnalyticsEvents;
    await this.logEvent(AnalyticsEvents[eventName.toUpperCase() as keyof typeof AnalyticsEvents], {
      entity_type: entityType,
      entity_id: this.anonymizeId(entityId),
      platform: this.getPlatform(),
    });
  }

  /**
   * Track navigation to sensitive screens
   */
  static async trackSensitiveScreenView(screenType: 'audit_logs' | 'user_management'): Promise<void> {
    const eventName = `view_${screenType}` as keyof typeof AnalyticsEvents;
    await this.logEvent(AnalyticsEvents[eventName.toUpperCase() as keyof typeof AnalyticsEvents], {
      screen_type: screenType,
      platform: this.getPlatform(),
    });
  }

  /**
   * Track user interactions
   */
  static async trackSearch(searchTerm?: string, resultCount?: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.SEARCH, {
      has_term: !!searchTerm,
      result_count: resultCount,
      platform: this.getPlatform(),
    });
  }

  static async trackFilter(filterType: string, filterValue?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.FILTER_APPLIED, {
      filter_type: filterType,
      has_value: !!filterValue,
      platform: this.getPlatform(),
    });
  }

  static async trackExport(dataType: string, format?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.EXPORT_DATA, {
      data_type: dataType,
      format: format || 'unknown',
      platform: this.getPlatform(),
    });
  }

  /**
   * Track errors (for analytics purposes, not debugging)
   */
  static async trackError(errorType: string, errorCode?: string, screenName?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.ERROR_OCCURRED, {
      error_type: errorType,
      error_code: errorCode || 'unknown',
      screen_name: screenName,
      platform: this.getPlatform(),
    });
  }

  /**
   * Generic event logging with consistent parameters
   */
  private static async logEvent(eventName: string, parameters?: { [key: string]: any }): Promise<void> {
    if (!analyticsUtils.isEnabled()) {
      return;
    }

    const eventParams = {
      ...parameters,
      timestamp: new Date().toISOString(),
    };

    // Remove any undefined values and ensure privacy
    const cleanParams = this.sanitizeParameters(eventParams);
    
    await analyticsUtils.logEvent(eventName, cleanParams);
  }

  /**
   * Get current platform identifier
   */
  private static getPlatform(): string {
    if (typeof window !== 'undefined') {
      return 'web';
    }
    return 'mobile';
  }

  /**
   * Anonymize sensitive IDs for privacy
   */
  private static anonymizeId(id?: string): string | undefined {
    if (!id) return undefined;
    return `${id.substring(0, 4)}***`;
  }

  /**
   * Sanitize parameters to ensure privacy and compatibility
   */
  private static sanitizeParameters(params: { [key: string]: any }): { [key: string]: any } {
    const sanitized: { [key: string]: any } = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Skip undefined values
      if (value === undefined) continue;
      
      // Convert values to appropriate types for Firebase Analytics
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null) {
        sanitized[key] = null;
      } else {
        // Convert complex objects to strings, but avoid logging sensitive data
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }
}