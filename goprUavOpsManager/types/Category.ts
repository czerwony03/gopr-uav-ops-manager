export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string; // Hex color for UI display
  order: number; // Display order
  createdBy: string; // user ID who created it
  updatedBy?: string; // user ID who last updated it
  isDeleted?: boolean; // soft-delete flag
  deletedAt?: Date; // timestamp when deleted
  createdAt?: Date; // timestamp when created
  updatedAt?: Date; // timestamp when last updated
}

// Form data interface for easier form handling
export interface CategoryFormData {
  name: string;
  description: string;
  color?: string;
  order: number;
}

// Default category IDs
export const DEFAULT_CATEGORY_ID = 'uncategorized';
export const DEFAULT_CATEGORY: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Uncategorized',
  description: 'Default category for procedures without specific categorization',
  color: '#6B7280', // Gray color
  order: 9999, // Show at the end
  createdBy: 'system',
  updatedBy: 'system',
  isDeleted: false,
  deletedAt: undefined,
};