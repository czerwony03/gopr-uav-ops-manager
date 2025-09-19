// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/CategoryRepository', () => ({
  CategoryRepository: {
    getCategory: jest.fn(),
    ensureDefaultCategory: jest.fn(),
  }
}));

jest.mock('@/repositories/ProcedureChecklistRepository', () => ({
  ProcedureChecklistRepository: {
    migrateProceduresToDefaultCategory: jest.fn(),
  }
}));

import { MigrationService } from '../migrationService';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import { ProcedureChecklistRepository } from '@/repositories/ProcedureChecklistRepository';

// Get references to mocked functions
const mockCategoryRepository = CategoryRepository as jest.Mocked<typeof CategoryRepository>;
const mockProcedureChecklistRepository = ProcedureChecklistRepository as jest.Mocked<typeof ProcedureChecklistRepository>;

describe('MigrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('needsMigration', () => {
    it('should return true if default category does not exist', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(null);

      const result = await MigrationService.needsMigration();

      expect(mockCategoryRepository.getCategory).toHaveBeenCalledWith('uncategorized');
      expect(result).toBe(true);
    });

    it('should return false if default category exists', async () => {
      const mockCategory = {
        id: 'uncategorized',
        name: 'Uncategorized',
        description: 'Default category',
        color: '#6B7280',
        order: 9999,
        createdBy: 'system',
        updatedBy: 'system',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCategoryRepository.getCategory.mockResolvedValue(mockCategory);

      const result = await MigrationService.needsMigration();

      expect(result).toBe(false);
    });

    it('should return true if error occurs during check', async () => {
      mockCategoryRepository.getCategory.mockRejectedValue(new Error('Database error'));

      const result = await MigrationService.needsMigration();

      expect(result).toBe(true);
    });
  });

  describe('runMigrations', () => {
    it('should run all migrations successfully', async () => {
      mockCategoryRepository.ensureDefaultCategory.mockResolvedValue();
      mockProcedureChecklistRepository.migrateProceduresToDefaultCategory.mockResolvedValue(5);

      await MigrationService.runMigrations();

      expect(mockCategoryRepository.ensureDefaultCategory).toHaveBeenCalled();
      expect(mockProcedureChecklistRepository.migrateProceduresToDefaultCategory).toHaveBeenCalled();
    });

    it('should throw error if default category creation fails', async () => {
      mockCategoryRepository.ensureDefaultCategory.mockRejectedValue(new Error('Category creation failed'));

      await expect(MigrationService.runMigrations()).rejects.toThrow('Category creation failed');
    });

    it('should throw error if procedure migration fails', async () => {
      mockCategoryRepository.ensureDefaultCategory.mockResolvedValue();
      mockProcedureChecklistRepository.migrateProceduresToDefaultCategory.mockRejectedValue(new Error('Migration failed'));

      await expect(MigrationService.runMigrations()).rejects.toThrow('Migration failed');
    });

    it('should log progress during migration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockCategoryRepository.ensureDefaultCategory.mockResolvedValue();
      mockProcedureChecklistRepository.migrateProceduresToDefaultCategory.mockResolvedValue(3);

      await MigrationService.runMigrations();

      expect(consoleSpy).toHaveBeenCalledWith('Starting migrations...');
      expect(consoleSpy).toHaveBeenCalledWith('Default category ensured');
      expect(consoleSpy).toHaveBeenCalledWith('Migrated 3 procedures to default category');
      expect(consoleSpy).toHaveBeenCalledWith('All migrations completed successfully');

      consoleSpy.mockRestore();
    });
  });
});