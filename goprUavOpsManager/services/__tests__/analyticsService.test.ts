/**
 * @jest-environment node
 */

import { AnalyticsService } from '../analyticsService';

// Mock the firebaseUtils analytics functions
jest.mock('@/utils/firebaseUtils', () => ({
  analyticsUtils: {
    isEnabled: jest.fn(() => false), // Analytics disabled in test environment
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
    setCurrentScreen: jest.fn(),
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeUser', () => {
    it('should handle user initialization gracefully when analytics is disabled', async () => {
      await expect(AnalyticsService.initializeUser('user123', 'admin', 'en')).resolves.not.toThrow();
    });

    it('should handle null user ID', async () => {
      await expect(AnalyticsService.initializeUser(null)).resolves.not.toThrow();
    });
  });

  describe('clearUser', () => {
    it('should handle user clearing gracefully when analytics is disabled', async () => {
      await expect(AnalyticsService.clearUser()).resolves.not.toThrow();
    });
  });

  describe('trackScreenView', () => {
    it('should handle screen view tracking gracefully when analytics is disabled', async () => {
      await expect(AnalyticsService.trackScreenView('dashboard')).resolves.not.toThrow();
    });

    it('should handle screen view with route params', async () => {
      await expect(
        AnalyticsService.trackScreenView('flight-details', { id: '123' })
      ).resolves.not.toThrow();
    });
  });

  describe('trackLogin', () => {
    it('should handle login tracking gracefully', async () => {
      await expect(AnalyticsService.trackLogin('email')).resolves.not.toThrow();
    });

    it('should handle login tracking with default method', async () => {
      await expect(AnalyticsService.trackLogin()).resolves.not.toThrow();
    });
  });

  describe('trackLoginFailed', () => {
    it('should handle failed login tracking gracefully', async () => {
      await expect(
        AnalyticsService.trackLoginFailed('email', 'auth/invalid-credentials')
      ).resolves.not.toThrow();
    });
  });

  describe('trackLogout', () => {
    it('should handle logout tracking gracefully', async () => {
      await expect(AnalyticsService.trackLogout()).resolves.not.toThrow();
    });
  });

  describe('CRUD operations', () => {
    it('should handle create tracking gracefully', async () => {
      await expect(AnalyticsService.trackCreate('flight', 'flight123')).resolves.not.toThrow();
    });

    it('should handle edit tracking gracefully', async () => {
      await expect(AnalyticsService.trackEdit('drone', 'drone456')).resolves.not.toThrow();
    });

    it('should handle delete tracking gracefully', async () => {
      await expect(AnalyticsService.trackDelete('user', 'user789')).resolves.not.toThrow();
    });

    it('should handle restore tracking gracefully', async () => {
      await expect(AnalyticsService.trackRestore('procedure', 'proc101')).resolves.not.toThrow();
    });
  });

  describe('trackSensitiveScreenView', () => {
    it('should handle audit logs screen tracking gracefully', async () => {
      await expect(
        AnalyticsService.trackSensitiveScreenView('audit_logs')
      ).resolves.not.toThrow();
    });

    it('should handle user management screen tracking gracefully', async () => {
      await expect(
        AnalyticsService.trackSensitiveScreenView('user_management')
      ).resolves.not.toThrow();
    });
  });

  describe('user interactions', () => {
    it('should handle search tracking gracefully', async () => {
      await expect(AnalyticsService.trackSearch('test query', 5)).resolves.not.toThrow();
    });

    it('should handle filter tracking gracefully', async () => {
      await expect(AnalyticsService.trackFilter('status', 'active')).resolves.not.toThrow();
    });

    it('should handle export tracking gracefully', async () => {
      await expect(AnalyticsService.trackExport('flights', 'pdf')).resolves.not.toThrow();
    });
  });

  describe('trackError', () => {
    it('should handle error tracking gracefully', async () => {
      await expect(
        AnalyticsService.trackError('network_error', 'TIMEOUT', 'flights')
      ).resolves.not.toThrow();
    });
  });
});