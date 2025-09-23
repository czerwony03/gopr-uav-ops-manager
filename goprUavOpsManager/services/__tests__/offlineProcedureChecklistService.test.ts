// Mock all external dependencies first
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

jest.mock('@/services/procedureChecklistService', () => ({
  ProcedureChecklistService: {
    getProcedureChecklists: jest.fn(),
  }
}));

jest.mock('@/services/appSettingsService', () => ({
  AppSettingsService: {
    getProceduresLastUpdate: jest.fn(),
    updateProceduresLastUpdate: jest.fn(),
    getCategoriesLastUpdate: jest.fn(),
    updateCategoriesLastUpdate: jest.fn(),
    getLastUpdateTimestamps: jest.fn(),
  }
}));

jest.mock('@/utils/imageCache', () => ({
  ImageCacheService: {
    initialize: jest.fn(),
    cacheImage: jest.fn(),
    getCachedImage: jest.fn(),
    getCachedImagePath: jest.fn(),
    preloadImage: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn(),
  }
}));

jest.mock('@/utils/networkConnectivity', () => ({
  NetworkConnectivity: {
    isConnected: jest.fn(),
    getConnectionStatus: jest.fn(),
    onConnectivityChange: jest.fn(),
  }
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineProcedureChecklistService } from '../offlineProcedureChecklistService';
import { ProcedureChecklistService } from '../procedureChecklistService';
import { AppSettingsService } from '../appSettingsService';
import { ImageCacheService } from '@/utils/imageCache';
import { NetworkConnectivity } from '@/utils/networkConnectivity';
import { UserRole } from '@/types/UserRole';

// Mock references
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockProcedureService = ProcedureChecklistService as jest.Mocked<typeof ProcedureChecklistService>;
const mockAppSettings = AppSettingsService as jest.Mocked<typeof AppSettingsService>;
const mockImageCache = ImageCacheService as jest.Mocked<typeof ImageCacheService>;

// Mock data
const mockProcedureChecklist = {
  id: 'procedure-123',
  title: 'Test Procedure',
  description: 'Test Description',
  items: [
    {
      id: 'item-1',
      text: 'Test step 1',
      topic: 'Step 1',
      content: 'Content 1',
      number: 1,
      type: 'text' as const,
      isRequired: true,
    }
  ],
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'admin-uid',
  updatedBy: 'admin-uid',
};

describe('OfflineProcedureChecklistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockProcedureService.getProcedureChecklists.mockResolvedValue([mockProcedureChecklist]);
    mockAppSettings.getProceduresLastUpdate.mockResolvedValue(new Date());
    mockImageCache.initialize.mockResolvedValue(undefined);
    mockImageCache.getCacheStats.mockResolvedValue({ size: 1024, count: 5 });
  });

  describe('Basic functionality', () => {
    it('should handle empty cache gracefully', async () => {
      const result = await OfflineProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN, { forceOffline: true });

      expect(result.procedures).toEqual([]);
      expect(result.isFromCache).toBe(true);
    });

    it('should use AppSettings for timestamp checking', async () => {
      // Mock stale cache
      const staleTimestamp = new Date('2023-01-01');
      const freshTimestamp = new Date('2024-01-01');
      
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'cached_procedures_metadata') {
          return Promise.resolve(JSON.stringify({
            version: 1,
            lastUpdated: Date.now(),
            userRole: UserRole.ADMIN,
            procedureCount: 0,
            firestoreTimestamp: staleTimestamp.getTime(),
          }));
        }
        return Promise.resolve(null);
      });

      mockAppSettings.getProceduresLastUpdate.mockResolvedValue(freshTimestamp);

      await OfflineProcedureChecklistService.preDownloadProcedures(UserRole.ADMIN);

      // Should fetch fresh data due to timestamp mismatch
      expect(mockProcedureService.getProcedureChecklists).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it('should skip download when timestamps match', async () => {
      const sameTimestamp = new Date('2024-01-01');
      
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'cached_procedures_metadata') {
          return Promise.resolve(JSON.stringify({
            version: 1,
            lastUpdated: Date.now(),
            userRole: UserRole.ADMIN,
            procedureCount: 1,
            firestoreTimestamp: sameTimestamp.getTime(),
          }));
        }
        return Promise.resolve(null);
      });

      mockAppSettings.getProceduresLastUpdate.mockResolvedValue(sameTimestamp);

      await OfflineProcedureChecklistService.preDownloadProcedures(UserRole.ADMIN);

      // Should not fetch new data when timestamps match
      expect(mockProcedureService.getProcedureChecklists).not.toHaveBeenCalled();
    });

    it('should handle forceRefresh option', async () => {
      await OfflineProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN, { forceRefresh: true });

      // Should fetch fresh data and cache it
      expect(mockProcedureService.getProcedureChecklists).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it('should return cache stats', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        version: 1,
        lastUpdated: Date.now(),
        userRole: 'admin',
        procedureCount: 1,
        firestoreTimestamp: Date.now(),
      }));

      const result = await OfflineProcedureChecklistService.getCacheStats();

      expect(result.procedureCount).toBe(1);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should clear cache', async () => {
      await OfflineProcedureChecklistService.clearCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_procedures');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cached_procedures_metadata');
      expect(mockImageCache.clearCache).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockProcedureService.getProcedureChecklists.mockRejectedValue(new Error('Network failed'));

      // Should not throw and should handle error gracefully
      await expect(
        OfflineProcedureChecklistService.preDownloadProcedures(UserRole.ADMIN)
      ).resolves.not.toThrow();
    });

    it('should handle missing AppSettings timestamp', async () => {
      mockAppSettings.getProceduresLastUpdate.mockResolvedValue(null);

      await OfflineProcedureChecklistService.preDownloadProcedures(UserRole.ADMIN);

      // Should still work when timestamp is null
      expect(mockProcedureService.getProcedureChecklists).toHaveBeenCalled();
    });
  });
});