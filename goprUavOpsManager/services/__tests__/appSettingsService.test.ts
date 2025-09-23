// Mock firebaseUtils first
jest.mock('@/utils/firebaseUtils', () => ({
  getCollection: jest.fn(),
  getDocument: jest.fn(),
  getDocumentData: jest.fn(),
  updateDocument: jest.fn(),
  setDocument: jest.fn(),
  timestampNow: jest.fn(),
}));

jest.mock('@/firebaseConfig', () => ({
  firestore: {},
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

import { AppSettingsService } from '../appSettingsService';
import * as firebaseUtils from '@/utils/firebaseUtils';

describe('AppSettingsService', () => {
  const mockGetDocument = firebaseUtils.getDocument as jest.Mock;
  const mockGetDocumentData = firebaseUtils.getDocumentData as jest.Mock;
  const mockSetDocument = firebaseUtils.setDocument as jest.Mock;
  const mockTimestampNow = firebaseUtils.timestampNow as jest.Mock;

  const mockTimestamp = {
    toDate: () => new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimestampNow.mockReturnValue(mockTimestamp);
    mockGetDocument.mockReturnValue('mockDocRef');
  });

  describe('getCategoriesLastUpdate', () => {
    it('should return timestamp when document exists', async () => {
      mockGetDocumentData.mockResolvedValue({
        exists: true,
        data: {
          timestamp: mockTimestamp,
        },
      });

      const result = await AppSettingsService.getCategoriesLastUpdate();

      expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(mockGetDocument).toHaveBeenCalledWith('appsettings', 'categoriesLastUpdate');
    });

    it('should return null when document does not exist', async () => {
      mockGetDocumentData.mockResolvedValue({
        exists: false,
        data: null,
      });

      const result = await AppSettingsService.getCategoriesLastUpdate();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetDocumentData.mockRejectedValue(new Error('Firestore error'));

      const result = await AppSettingsService.getCategoriesLastUpdate();

      expect(result).toBeNull();
    });
  });

  describe('getProceduresLastUpdate', () => {
    it('should return timestamp when document exists', async () => {
      mockGetDocumentData.mockResolvedValue({
        exists: true,
        data: {
          timestamp: mockTimestamp,
        },
      });

      const result = await AppSettingsService.getProceduresLastUpdate();

      expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(mockGetDocument).toHaveBeenCalledWith('appsettings', 'proceduresLastUpdate');
    });

    it('should return null when document does not exist', async () => {
      mockGetDocumentData.mockResolvedValue({
        exists: false,
        data: null,
      });

      const result = await AppSettingsService.getProceduresLastUpdate();

      expect(result).toBeNull();
    });
  });

  describe('updateCategoriesLastUpdate', () => {
    it('should update categories timestamp', async () => {
      mockSetDocument.mockResolvedValue(undefined);

      await AppSettingsService.updateCategoriesLastUpdate();

      expect(mockGetDocument).toHaveBeenCalledWith('appsettings', 'categoriesLastUpdate');
      expect(mockSetDocument).toHaveBeenCalledWith('mockDocRef', {
        timestamp: mockTimestamp,
        updatedAt: mockTimestamp,
      });
    });

    it('should throw error on failure', async () => {
      mockSetDocument.mockRejectedValue(new Error('Update failed'));

      await expect(AppSettingsService.updateCategoriesLastUpdate()).rejects.toThrow('Update failed');
    });
  });

  describe('updateProceduresLastUpdate', () => {
    it('should update procedures timestamp', async () => {
      mockSetDocument.mockResolvedValue(undefined);

      await AppSettingsService.updateProceduresLastUpdate();

      expect(mockGetDocument).toHaveBeenCalledWith('appsettings', 'proceduresLastUpdate');
      expect(mockSetDocument).toHaveBeenCalledWith('mockDocRef', {
        timestamp: mockTimestamp,
        updatedAt: mockTimestamp,
      });
    });
  });

  describe('getLastUpdateTimestamps', () => {
    it('should return both timestamps', async () => {
      const categoriesTimestamp = new Date('2024-01-01T00:00:00Z');
      const proceduresTimestamp = new Date('2024-01-02T00:00:00Z');

      // Mock getCategoriesLastUpdate and getProceduresLastUpdate
      jest.spyOn(AppSettingsService, 'getCategoriesLastUpdate').mockResolvedValue(categoriesTimestamp);
      jest.spyOn(AppSettingsService, 'getProceduresLastUpdate').mockResolvedValue(proceduresTimestamp);

      const result = await AppSettingsService.getLastUpdateTimestamps();

      expect(result).toEqual({
        categoriesLastUpdate: categoriesTimestamp,
        proceduresLastUpdate: proceduresTimestamp,
      });
    });

    it('should return null timestamps on error', async () => {
      jest.spyOn(AppSettingsService, 'getCategoriesLastUpdate').mockRejectedValue(new Error('Error'));
      jest.spyOn(AppSettingsService, 'getProceduresLastUpdate').mockRejectedValue(new Error('Error'));

      const result = await AppSettingsService.getLastUpdateTimestamps();

      expect(result).toEqual({
        categoriesLastUpdate: null,
        proceduresLastUpdate: null,
      });
    });
  });

  describe('initializeAppSettings', () => {
    it('should initialize missing timestamps', async () => {
      // Mock that timestamps don't exist
      jest.spyOn(AppSettingsService, 'getLastUpdateTimestamps').mockResolvedValue({
        categoriesLastUpdate: null,
        proceduresLastUpdate: null,
      });

      const updateCategoriesSpy = jest.spyOn(AppSettingsService, 'updateCategoriesLastUpdate').mockResolvedValue(undefined);
      const updateProceduresSpy = jest.spyOn(AppSettingsService, 'updateProceduresLastUpdate').mockResolvedValue(undefined);

      await AppSettingsService.initializeAppSettings();

      expect(updateCategoriesSpy).toHaveBeenCalled();
      expect(updateProceduresSpy).toHaveBeenCalled();
    });

    it('should not update existing timestamps', async () => {
      // Mock that timestamps exist
      jest.spyOn(AppSettingsService, 'getLastUpdateTimestamps').mockResolvedValue({
        categoriesLastUpdate: new Date(),
        proceduresLastUpdate: new Date(),
      });

      const updateCategoriesSpy = jest.spyOn(AppSettingsService, 'updateCategoriesLastUpdate').mockResolvedValue(undefined);
      const updateProceduresSpy = jest.spyOn(AppSettingsService, 'updateProceduresLastUpdate').mockResolvedValue(undefined);

      await AppSettingsService.initializeAppSettings();

      expect(updateCategoriesSpy).not.toHaveBeenCalled();
      expect(updateProceduresSpy).not.toHaveBeenCalled();
    });
  });
});