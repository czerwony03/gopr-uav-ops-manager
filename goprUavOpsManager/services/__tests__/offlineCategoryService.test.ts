// Mock all external dependencies first
const mockAsyncStorageImpl = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorageImpl);

import AsyncStorage from '@react-native-async-storage/async-storage';

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

jest.mock('@/utils/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

import { OfflineCategoryService } from '../offlineCategoryService';
import { CategoryService } from '../categoryService';
import { AppSettingsService } from '../appSettingsService';
import { UserRole } from '@/types/UserRole';
import { Category } from '@/types/Category';

// Get references to mocked functions
const mockAsyncStorage = mockAsyncStorageImpl;
const mockCategoryService = CategoryService as jest.Mocked<typeof CategoryService>;
const mockAppSettingsService = AppSettingsService as jest.Mocked<typeof AppSettingsService>;

// Mock category data
const mockCategory: Category = {
  id: 'category-123',
  name: 'Test Category',
  description: 'Test Description',
  color: '#FF5733',
  order: 1,
  isDeleted: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  createdBy: 'admin-uid',
  updatedBy: 'admin-uid',
};

describe('OfflineCategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined as any);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined as any);
    mockCategoryService.getCategories.mockResolvedValue([mockCategory]);
    mockAppSettingsService.getCategoriesLastUpdate.mockResolvedValue(new Date('2024-01-01T00:00:00Z'));
    mockAppSettingsService.updateCategoriesLastUpdate.mockResolvedValue(undefined);
  });

  describe('preDownloadCategories', () => {
    it('should download and cache categories for admin role', async () => {
      await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_categories',
        expect.stringContaining('category-123')
      );
    });

    it('should skip download if cache is up to date', async () => {
      // Mock existing cache metadata with same timestamp
      const metadata = {
        version: 1,
        lastUpdated: Date.now(),
        userRole: UserRole.ADMIN,
        categoryCount: 1,
        firestoreTimestamp: new Date('2024-01-01T00:00:00Z').getTime(),
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(metadata)) // metadata call
        .mockResolvedValueOnce(null); // cache data call

      await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

      // Should not fetch from CategoryService since cache is up to date
      expect(mockCategoryService.getCategories).not.toHaveBeenCalled();
    });

    it('should download when Firestore timestamp is newer', async () => {
      // Mock existing cache with older timestamp
      const metadata = {
        version: 1,
        lastUpdated: Date.now(),
        userRole: UserRole.ADMIN,
        categoryCount: 1,
        firestoreTimestamp: new Date('2023-12-01T00:00:00Z').getTime(), // older
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));
      // Mock newer Firestore timestamp
      mockAppSettingsService.getCategoriesLastUpdate.mockResolvedValue(new Date('2024-01-01T00:00:00Z'));

      await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
    });
  });

  describe('getCategories', () => {
    it('should return cached categories when available (cache-first)', async () => {
      // Mock cache data
      const cachedCategories = [
        {
          ...mockCategory,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }
      ];

      const metadata = {
        version: 1,
        lastUpdated: Date.now(),
        userRole: UserRole.ADMIN,
        categoryCount: 1,
        firestoreTimestamp: new Date().getTime(),
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(metadata))
        .mockResolvedValueOnce(JSON.stringify(cachedCategories));

      const result = await OfflineCategoryService.getCategories(UserRole.ADMIN);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('category-123');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(mockCategoryService.getCategories).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when forceRefresh is true', async () => {
      const result = await OfflineCategoryService.getCategories(UserRole.ADMIN, true);

      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
      expect(result).toEqual([mockCategory]);
      // Should also update cache with fresh data
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fallback to cached data on error', async () => {
      mockCategoryService.getCategories.mockRejectedValue(new Error('Network error'));

      const cachedCategories = [
        {
          ...mockCategory,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }
      ];

      const metadata = {
        version: 1,
        lastUpdated: Date.now(),
        userRole: UserRole.ADMIN,
        categoryCount: 1,
        firestoreTimestamp: new Date().getTime(),
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(metadata))
        .mockResolvedValueOnce(JSON.stringify(cachedCategories));

      const result = await OfflineCategoryService.getCategories(UserRole.ADMIN);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('category-123');
    });
  });

  describe('clearCache', () => {
    it('should remove all cached data', async () => {
      await OfflineCategoryService.clearCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_categories');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_categories_metadata');
    });
  });

  describe('invalidateCache', () => {
    it('should remove cache metadata', async () => {
      await OfflineCategoryService.invalidateCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_categories_metadata');
    });
  });

  describe('cache metadata handling', () => {
    it('should handle invalid cache version', async () => {
      const invalidMetadata = {
        version: 0, // old version
        lastUpdated: Date.now(),
        userRole: UserRole.ADMIN,
        categoryCount: 1,
        firestoreTimestamp: new Date().getTime(),
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidMetadata));

      const result = await OfflineCategoryService.getCategories(UserRole.ADMIN);

      // Should fetch from network since cache version is invalid
      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it('should handle different user roles', async () => {
      const managerMetadata = {
        version: 1,
        lastUpdated: Date.now(),
        userRole: UserRole.MANAGER, // different role
        categoryCount: 1,
        firestoreTimestamp: new Date().getTime(),
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(managerMetadata));

      const result = await OfflineCategoryService.getCategories(UserRole.ADMIN);

      // Should fetch from network since user role doesn't match
      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(UserRole.ADMIN);
    });
  });
});