// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/CategoryRepository', () => ({
  CategoryRepository: {
    getCategories: jest.fn(),
    getCategory: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    softDeleteCategory: jest.fn(),
    restoreCategory: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
    createChangeDetails: jest.fn().mockReturnValue('Category created'),
  }
}));

jest.mock('../userService', () => ({
  UserService: {
    getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
  }
}));

import { CategoryService } from '../categoryService';
import { UserRole } from '@/types/UserRole';
import { DEFAULT_CATEGORY_ID } from '@/types/Category';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';

// Get references to mocked functions
const mockCategoryRepository = CategoryRepository as jest.Mocked<typeof CategoryRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('CategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCategory = {
    id: 'test-category',
    name: 'Test Category',
    description: 'A test category',
    color: '#FF0000',
    order: 1,
    createdBy: 'user-123',
    updatedBy: 'user-123',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFormData = {
    name: 'Test Category',
    description: 'A test category',
    color: '#FF0000',
    order: 1,
  };

  describe('getCategories', () => {
    it('should return categories for user role', async () => {
      mockCategoryRepository.getCategories.mockResolvedValue([mockCategory]);

      const result = await CategoryService.getCategories(UserRole.USER);

      expect(mockCategoryRepository.getCategories).toHaveBeenCalledWith(UserRole.USER);
      expect(result).toEqual([mockCategory]);
    });

    it('should handle errors', async () => {
      mockCategoryRepository.getCategories.mockRejectedValue(new Error('Database error'));

      await expect(CategoryService.getCategories(UserRole.USER)).rejects.toThrow('Failed to fetch categories');
    });
  });

  describe('getCategory', () => {
    it('should return category by ID for non-deleted category', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(mockCategory);

      const result = await CategoryService.getCategory('test-category', UserRole.USER);

      expect(mockCategoryRepository.getCategory).toHaveBeenCalledWith('test-category');
      expect(result).toEqual(mockCategory);
    });

    it('should return null for deleted category when user is not admin', async () => {
      const deletedCategory = { ...mockCategory, isDeleted: true };
      mockCategoryRepository.getCategory.mockResolvedValue(deletedCategory);

      const result = await CategoryService.getCategory('test-category', UserRole.USER);

      expect(result).toBeNull();
    });

    it('should return deleted category when user is admin', async () => {
      const deletedCategory = { ...mockCategory, isDeleted: true };
      mockCategoryRepository.getCategory.mockResolvedValue(deletedCategory);

      const result = await CategoryService.getCategory('test-category', UserRole.ADMIN);

      expect(result).toEqual(deletedCategory);
    });

    it('should return null when category does not exist', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(null);

      const result = await CategoryService.getCategory('non-existent', UserRole.USER);

      expect(result).toBeNull();
    });
  });

  describe('createCategory', () => {
    it('should create category for manager', async () => {
      mockCategoryRepository.createCategory.mockResolvedValue('new-category-id');

      const result = await CategoryService.createCategory(mockFormData, UserRole.MANAGER, 'user-123');

      expect(mockCategoryRepository.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Category',
          description: 'A test category',
          color: '#FF0000',
          order: 1,
          createdBy: 'user-123',
          updatedBy: 'user-123',
        }),
        'user-123'
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
      expect(result).toBe('new-category-id');
    });

    it('should create category for admin', async () => {
      mockCategoryRepository.createCategory.mockResolvedValue('new-category-id');

      await CategoryService.createCategory(mockFormData, UserRole.ADMIN, 'user-123');

      expect(mockCategoryRepository.createCategory).toHaveBeenCalled();
    });

    it('should throw error for user role', async () => {
      await expect(
        CategoryService.createCategory(mockFormData, UserRole.USER, 'user-123')
      ).rejects.toThrow('Insufficient permissions to create category');

      expect(mockCategoryRepository.createCategory).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should update category for manager', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(mockCategory);

      await CategoryService.updateCategory('test-category', mockFormData, UserRole.MANAGER, 'user-123');

      expect(mockCategoryRepository.updateCategory).toHaveBeenCalledWith(
        'test-category',
        expect.objectContaining({
          name: 'Test Category',
          description: 'A test category',
          color: '#FF0000',
          order: 1,
          updatedBy: 'user-123',
        }),
        'user-123'
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should prevent updating default category name/description', async () => {
      const defaultCategory = { ...mockCategory, id: DEFAULT_CATEGORY_ID };
      mockCategoryRepository.getCategory.mockResolvedValue(defaultCategory);

      const invalidFormData = { ...mockFormData, name: 'New Name' };

      await expect(
        CategoryService.updateCategory(DEFAULT_CATEGORY_ID, invalidFormData, UserRole.ADMIN, 'user-123')
      ).rejects.toThrow('Cannot modify the default category name or description');

      expect(mockCategoryRepository.updateCategory).not.toHaveBeenCalled();
    });

    it('should throw error for user role', async () => {
      await expect(
        CategoryService.updateCategory('test-category', mockFormData, UserRole.USER, 'user-123')
      ).rejects.toThrow('Insufficient permissions to update category');
    });

    it('should throw error when category not found', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(null);

      await expect(
        CategoryService.updateCategory('non-existent', mockFormData, UserRole.ADMIN, 'user-123')
      ).rejects.toThrow('Category not found');
    });
  });

  describe('softDeleteCategory', () => {
    it('should soft delete category for manager', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(mockCategory);

      await CategoryService.softDeleteCategory('test-category', UserRole.MANAGER, 'user-123');

      expect(mockCategoryRepository.softDeleteCategory).toHaveBeenCalledWith('test-category', 'user-123');
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should prevent deleting default category', async () => {
      await expect(
        CategoryService.softDeleteCategory(DEFAULT_CATEGORY_ID, UserRole.ADMIN, 'user-123')
      ).rejects.toThrow('Cannot delete the default category');

      expect(mockCategoryRepository.softDeleteCategory).not.toHaveBeenCalled();
    });

    it('should throw error for user role', async () => {
      await expect(
        CategoryService.softDeleteCategory('test-category', UserRole.USER, 'user-123')
      ).rejects.toThrow('Insufficient permissions to delete category');
    });
  });

  describe('restoreCategory', () => {
    it('should restore category for admin', async () => {
      mockCategoryRepository.getCategory.mockResolvedValue(mockCategory);

      await CategoryService.restoreCategory('test-category', UserRole.ADMIN, 'user-123');

      expect(mockCategoryRepository.restoreCategory).toHaveBeenCalledWith('test-category', 'user-123');
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should throw error for non-admin roles', async () => {
      await expect(
        CategoryService.restoreCategory('test-category', UserRole.MANAGER, 'user-123')
      ).rejects.toThrow('Insufficient permissions to restore category');

      await expect(
        CategoryService.restoreCategory('test-category', UserRole.USER, 'user-123')
      ).rejects.toThrow('Insufficient permissions to restore category');

      expect(mockCategoryRepository.restoreCategory).not.toHaveBeenCalled();
    });
  });
});