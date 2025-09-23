// Mock all external dependencies first
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

jest.mock('@/services/categoryService', () => ({
  CategoryService: {
    getCategories: jest.fn(),
  }
}));

jest.mock('@/services/appSettingsService', () => ({
  AppSettingsService: {
    getCategoriesLastUpdate: jest.fn(),
    updateCategoriesLastUpdate: jest.fn(),
  }
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineCategoryService } from '../offlineCategoryService';
import { CategoryService } from '../categoryService';
import { AppSettingsService } from '../appSettingsService';
import { UserRole } from '@/types/UserRole';
import { Category } from '@/types/Category';

// Mock references
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockCategoryService = CategoryService as jest.Mocked<typeof CategoryService>;
const mockAppSettings = AppSettingsService as jest.Mocked<typeof AppSettingsService>;

// Mock data
const mockCategory: Category = {
  id: 'category-123',
  name: 'Test Category',
  description: 'Test Description',
  color: '#FF5733',
  order: 1,
  createdBy: 'admin-uid',
  updatedBy: 'admin-uid',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('OfflineCategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockCategoryService.getCategories.mockResolvedValue([mockCategory]);
    mockAppSettings.getCategoriesLastUpdate.mockResolvedValue(new Date());
  });

  describe('Basic functionality', () => {
    it('should handle empty cache gracefully', async () => {
      const result = await OfflineCategoryService.getCategories(UserRole.ADMIN);

      expect(result).toEqual([]);
    });

    it('should use AppSettings for timestamp checking', async () => {
      // Mock stale cache
      const staleTimestamp = new Date('2023-01-01');
      const freshTimestamp = new Date('2024-01-01');
      
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'cached_categories_metadata') {
          return Promise.resolve(JSON.stringify({
            version: 1,
            lastUpdated: Date.now(),
            userRole: UserRole.ADMIN,
            categoryCount: 0,
            firestoreTimestamp: staleTimestamp.getTime(),
          }));
        }
        return Promise.resolve(null);
      });

      mockAppSettings.getCategoriesLastUpdate.mockResolvedValue(freshTimestamp);

      await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

      // Should fetch fresh data due to timestamp mismatch
      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it('should skip download when timestamps match', async () => {
      const sameTimestamp = new Date('2024-01-01');
      
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'cached_categories_metadata') {
          return Promise.resolve(JSON.stringify({
            version: 1,
            lastUpdated: Date.now(),
            userRole: UserRole.ADMIN,
            categoryCount: 1,
            firestoreTimestamp: sameTimestamp.getTime(),
          }));
        }
        return Promise.resolve(null);
      });

      mockAppSettings.getCategoriesLastUpdate.mockResolvedValue(sameTimestamp);

      await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

      // Should not fetch new data when timestamps match
      expect(mockCategoryService.getCategories).not.toHaveBeenCalled();
    });

    it('should handle forceRefresh option', async () => {
      await OfflineCategoryService.getCategories(UserRole.ADMIN, true);

      // Should fetch fresh data and cache it
      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it('should clear cache', async () => {
      await OfflineCategoryService.clearCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_categories');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_categories_metadata');
    });

    it('should invalidate cache', async () => {
      await OfflineCategoryService.invalidateCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_categories_metadata');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockCategoryService.getCategories.mockRejectedValue(new Error('Network failed'));

      // Should not throw and should handle error gracefully
      await expect(
        OfflineCategoryService.preDownloadCategories(UserRole.ADMIN)
      ).resolves.not.toThrow();
    });

    it('should handle missing AppSettings timestamp', async () => {
      mockAppSettings.getCategoriesLastUpdate.mockResolvedValue(null);

      await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

      // Should still work when timestamp is null
      expect(mockCategoryService.getCategories).toHaveBeenCalled();
    });

    it('should handle invalid cache version', async () => {
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'cached_categories_metadata') {
          return Promise.resolve(JSON.stringify({
            version: 0, // Old version
            lastUpdated: Date.now(),
            userRole: UserRole.ADMIN,
            categoryCount: 1,
            firestoreTimestamp: Date.now(),
          }));
        }
        return Promise.resolve(null);
      });

      await OfflineCategoryService.getCategories(UserRole.ADMIN);

      // Should fetch fresh data due to version mismatch
      expect(mockCategoryService.getCategories).toHaveBeenCalled();
    });

    it('should handle different user roles', async () => {
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'cached_categories_metadata') {
          return Promise.resolve(JSON.stringify({
            version: 1,
            lastUpdated: Date.now(),
            userRole: UserRole.MANAGER, // Different role
            categoryCount: 1,
            firestoreTimestamp: Date.now(),
          }));
        }
        return Promise.resolve(null);
      });

      await OfflineCategoryService.getCategories(UserRole.ADMIN);

      // Should fetch fresh data due to role mismatch
      expect(mockCategoryService.getCategories).toHaveBeenCalled();
    });
  });
});