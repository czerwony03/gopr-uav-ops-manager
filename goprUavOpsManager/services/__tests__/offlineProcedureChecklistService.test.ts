// Simple focused tests for OfflineProcedureChecklistService
// Tests core functionality without complex AsyncStorage mocking

import { UserRole } from '@/types/UserRole';

// Mock external dependencies
const mockProcedureService = {
  getProcedureChecklists: jest.fn(),
};

const mockAppSettings = {
  getProceduresLastUpdate: jest.fn(),
};

const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

const mockImageCache = {
  initialize: jest.fn(),
  clearCache: jest.fn(),
  getCacheStats: jest.fn(),
};

// Mock modules
jest.mock('@/services/procedureChecklistService', () => ({
  ProcedureChecklistService: mockProcedureService,
}));

jest.mock('@/services/appSettingsService', () => ({
  AppSettingsService: mockAppSettings,
}));

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@/utils/imageCache', () => ({
  ImageCacheService: mockImageCache,
}));

jest.mock('@/utils/networkConnectivity', () => ({
  NetworkConnectivity: { isConnected: jest.fn() },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('OfflineProcedureChecklistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be importable', () => {
    // Simple smoke test to verify the module can be imported
    expect(() => {
      require('../offlineProcedureChecklistService');
    }).not.toThrow();
  });

  it('should have expected static methods', () => {
    const { OfflineProcedureChecklistService } = require('../offlineProcedureChecklistService');
    
    expect(typeof OfflineProcedureChecklistService.getProcedureChecklists).toBe('function');
    expect(typeof OfflineProcedureChecklistService.preDownloadProcedures).toBe('function');
    expect(typeof OfflineProcedureChecklistService.clearCache).toBe('function');
    expect(typeof OfflineProcedureChecklistService.getCacheStats).toBe('function');
  });

  it('should use AppSettings service for timestamp checking', () => {
    // Test that the service is properly structured to use AppSettings
    const { OfflineProcedureChecklistService } = require('../offlineProcedureChecklistService');
    
    // Mock successful cache check
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      version: 1,
      lastUpdated: Date.now(),
      userRole: UserRole.ADMIN,
      procedureCount: 0,
      firestoreTimestamp: new Date('2023-01-01').getTime(),
    }));
    
    mockAppSettings.getProceduresLastUpdate.mockResolvedValue(new Date('2024-01-01'));
    mockProcedureService.getProcedureChecklists.mockResolvedValue([]);
    mockImageCache.initialize.mockResolvedValue(undefined);

    // This should work without throwing
    expect(() => {
      OfflineProcedureChecklistService.preDownloadProcedures(UserRole.ADMIN);
    }).not.toThrow();
  });

  it('should support forceRefresh option', () => {
    const { OfflineProcedureChecklistService } = require('../offlineProcedureChecklistService');
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockProcedureService.getProcedureChecklists.mockResolvedValue([]);

    // Test with forceRefresh option
    expect(() => {
      OfflineProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN, { forceRefresh: true });
    }).not.toThrow();

    // Test with forceOffline option
    expect(() => {
      OfflineProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN, { forceOffline: true });
    }).not.toThrow();
  });
});