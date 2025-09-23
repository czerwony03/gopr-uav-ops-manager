import { Category, CategoryFormData, DEFAULT_CATEGORY_ID } from '@/types/Category';
import { UserRole } from '@/types/UserRole';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import { AuditLogService } from '@/services/auditLogService';
import { UserService } from '@/services/userService';
import { AppSettingsService } from './appSettingsService';

export class CategoryService {
  /**
   * Get all categories based on user role
   */
  static async getCategories(userRole: UserRole): Promise<Category[]> {
    try {
      return await CategoryRepository.getCategories(userRole);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Get a single category by ID
   */
  static async getCategory(id: string, userRole: UserRole): Promise<Category | null> {
    try {
      const category = await CategoryRepository.getCategory(id);
      
      if (!category) {
        return null;
      }

      // Check if user can view this category
      if (category.isDeleted && userRole !== 'admin') {
        return null;
      }

      return category;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw new Error('Failed to fetch category');
    }
  }

  /**
   * Create a new category (manager and admin only)
   */
  static async createCategory(
    formData: CategoryFormData,
    userRole: UserRole,
    userId: string
  ): Promise<string> {
    if (!this.canModifyCategories(userRole)) {
      throw new Error('Insufficient permissions to create category');
    }

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        color: formData.color,
        order: formData.order,
        createdBy: userId,
        updatedBy: userId,
      };

      // Create category in repository
      const docId = await CategoryRepository.createCategory(categoryData, userId);

      // Update categories timestamp in AppSettings
      await AppSettingsService.updateCategoriesLastUpdate();

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'category',
        entityId: docId,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'category'),
        newValues: { ...categoryData, isDeleted: false }
      });

      return docId;
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  /**
   * Update an existing category (manager and admin only)
   */
  static async updateCategory(
    id: string,
    formData: CategoryFormData,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyCategories(userRole)) {
      throw new Error('Insufficient permissions to update category');
    }

    // Don't allow updating the default category name/description
    if (id === DEFAULT_CATEGORY_ID && (formData.name !== 'Uncategorized' || formData.description !== 'Default category for procedures without specific categorization')) {
      throw new Error('Cannot modify the default category name or description');
    }

    try {
      const existingCategory = await CategoryRepository.getCategory(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        color: formData.color,
        order: formData.order,
        updatedBy: userId,
      };

      // Update category in repository
      await CategoryRepository.updateCategory(id, categoryData, userId);

      // Update categories timestamp in AppSettings
      await AppSettingsService.updateCategoriesLastUpdate();

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'category',
        entityId: id,
        action: 'edit',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'category'),
        previousValues: existingCategory,
        newValues: { ...existingCategory, ...categoryData }
      });
    } catch (error) {
      console.error('Error updating category:', error);
      // Re-throw specific errors or create a generic error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update category');
    }
  }

  /**
   * Soft delete a category (manager and admin only)
   */
  static async softDeleteCategory(id: string, userRole: UserRole, userId: string): Promise<void> {
    if (!this.canModifyCategories(userRole)) {
      throw new Error('Insufficient permissions to delete category');
    }

    // Don't allow deleting the default category
    if (id === DEFAULT_CATEGORY_ID) {
      throw new Error('Cannot delete the default category');
    }

    try {
      const existingCategory = await CategoryRepository.getCategory(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      await CategoryRepository.softDeleteCategory(id, userId);

      // Update categories timestamp in AppSettings
      await AppSettingsService.updateCategoriesLastUpdate();

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'category',
        entityId: id,
        action: 'delete',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('delete', 'category'),
        previousValues: existingCategory,
        newValues: { ...existingCategory, isDeleted: true }
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  /**
   * Restore a soft-deleted category (admin only)
   */
  static async restoreCategory(id: string, userRole: UserRole, userId: string): Promise<void> {
    if (userRole !== 'admin') {
      throw new Error('Insufficient permissions to restore category');
    }

    try {
      const existingCategory = await CategoryRepository.getCategory(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      await CategoryRepository.restoreCategory(id, userId);

      // Update categories timestamp in AppSettings
      await AppSettingsService.updateCategoriesLastUpdate();

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'category',
        entityId: id,
        action: 'restore',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('restore', 'category'),
        previousValues: existingCategory,
        newValues: { ...existingCategory, isDeleted: false }
      });
    } catch (error) {
      console.error('Error restoring category:', error);
      throw new Error('Failed to restore category');
    }
  }

  /**
   * Check if user can modify categories
   */
  private static canModifyCategories(userRole: UserRole): boolean {
    return userRole === 'manager' || userRole === 'admin';
  }
}