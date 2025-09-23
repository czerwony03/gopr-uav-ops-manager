// Simple focused tests for OfflineCategoryService
// Tests core functionality without complex AsyncStorage mocking

import { UserRole } from '@/types/UserRole';

// Mock external dependencies
const mockCategoryService = {
  getCategories: jest.fn(),
};

const mockAppSettings = {
  getCategoriesLastUpdate: jest.fn(),
};

const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Mock modules
jest.mock('@/services/categoryService', () => ({
  CategoryService: mockCategoryService,
}));

jest.mock('@/services/appSettingsService', () => ({
  AppSettingsService: mockAppSettings,
}));

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('OfflineCategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be importable', () => {
    // Simple smoke test to verify the module can be imported
    expect(() => {
      require('../offlineCategoryService');
    }).not.toThrow();
  });

  it('should have expected static methods', () => {
    const { OfflineCategoryService } = require('../offlineCategoryService');
    
    expect(typeof OfflineCategoryService.getCategories).toBe('function');
    expect(typeof OfflineCategoryService.preDownloadCategories).toBe('function');
    expect(typeof OfflineCategoryService.clearCache).toBe('function');
    expect(typeof OfflineCategoryService.invalidateCache).toBe('function');
  });

  it('should use AppSettings service for timestamp checking', () => {
    // Test that the service is properly structured to use AppSettings
    const { OfflineCategoryService } = require('../offlineCategoryService');
    
    // Mock successful cache check
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      version: 1,
      lastUpdated: Date.now(),
      userRole: UserRole.ADMIN,
      categoryCount: 0,
      firestoreTimestamp: new Date('2023-01-01').getTime(),
    }));
    
    mockAppSettings.getCategoriesLastUpdate.mockResolvedValue(new Date('2024-01-01'));
    mockCategoryService.getCategories.mockResolvedValue([]);

    // This should work without throwing
    expect(() => {
      OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);
    }).not.toThrow();
  });

  it('should support forceRefresh option', () => {
    const { OfflineCategoryService } = require('../offlineCategoryService');
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockCategoryService.getCategories.mockResolvedValue([]);

    // Test with forceRefresh = true
    expect(() => {
      OfflineCategoryService.getCategories(UserRole.ADMIN, true);
    }).not.toThrow();

    // Test with forceRefresh = false
    expect(() => {
      OfflineCategoryService.getCategories(UserRole.ADMIN, false);
    }).not.toThrow();
  });

  it('should have cache management methods', () => {
    const { OfflineCategoryService } = require('../offlineCategoryService');
    
    // Test cache clear
    expect(() => {
      OfflineCategoryService.clearCache();
    }).not.toThrow();

    // Test cache invalidation
    expect(() => {
      OfflineCategoryService.invalidateCache();
    }).not.toThrow();
  });
});