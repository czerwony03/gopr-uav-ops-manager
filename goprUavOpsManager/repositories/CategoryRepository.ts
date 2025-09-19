import { Category, DEFAULT_CATEGORY_ID, DEFAULT_CATEGORY } from '@/types/Category';
import { UserRole } from '@/types/UserRole';
import {
  getCollection,
  getDocument,
  getDocumentData,
  addDocument,
  updateDocument,
  setDocument,
  createQuery,
  where,
  orderBy,
  getDocs,
  getDocsArray,
  timestampNow
} from '@/utils/firebaseUtils';

export class CategoryRepository {
  private static readonly COLLECTION_NAME = 'categories';

  /**
   * Get all categories based on user role
   */
  static async getCategories(userRole: UserRole): Promise<Category[]> {
    try {
      const categoriesCollection = getCollection(this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin') {
        // Admin can see all categories including soft-deleted ones
        q = createQuery(categoriesCollection, orderBy('order', 'asc'), orderBy('name', 'asc'));
      } else {
        // Users and managers only see non-deleted categories
        q = createQuery(
          categoriesCollection,
          where('isDeleted', '==', false),
          orderBy('order', 'asc'),
          orderBy('name', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const categories = getDocsArray(snapshot).map((doc: any) => 
        this.convertFromFirestore(doc.id, doc.data)
      );

      // Ensure default category exists and is included
      const hasDefaultCategory = categories.some((cat: any) => cat.id === DEFAULT_CATEGORY_ID);
      if (!hasDefaultCategory) {
        // Create default category if it doesn't exist
        await this.ensureDefaultCategory();
        // Add it to the results
        categories.push({
          id: DEFAULT_CATEGORY_ID,
          ...DEFAULT_CATEGORY,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Get a single category by ID
   */
  static async getCategory(id: string): Promise<Category | null> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, id);
      const docSnap = await getDocumentData(docRef);
      
      if (docSnap.exists()) {
        return this.convertFromFirestore(id, docSnap.data());
      }

      // If requesting default category and it doesn't exist, create it
      if (id === DEFAULT_CATEGORY_ID) {
        await this.ensureDefaultCategory();
        return {
          id: DEFAULT_CATEGORY_ID,
          ...DEFAULT_CATEGORY,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw new Error('Failed to fetch category');
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(
    categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    try {
      const now = timestampNow();
      const dataWithTimestamps = {
        ...categoryData,
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      return await addDocument(this.COLLECTION_NAME, dataWithTimestamps);
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  /**
   * Update an existing category
   */
  static async updateCategory(
    id: string,
    categoryData: Partial<Category>,
    userId: string
  ): Promise<void> {
    try {
      const now = timestampNow();
      const updateData = {
        ...categoryData,
        updatedBy: userId,
        updatedAt: now,
      };

      const docRef = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(docRef, updateData);
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Failed to update category');
    }
  }

  /**
   * Soft delete a category
   */
  static async softDeleteCategory(id: string, userId: string): Promise<void> {
    try {
      const now = timestampNow();
      const docRef = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(docRef, {
        isDeleted: true,
        deletedAt: now,
        updatedBy: userId,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error soft deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  /**
   * Restore a soft-deleted category
   */
  static async restoreCategory(id: string, userId: string): Promise<void> {
    try {
      const now = timestampNow();
      const docRef = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(docRef, {
        isDeleted: false,
        deletedAt: null,
        updatedBy: userId,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error restoring category:', error);
      throw new Error('Failed to restore category');
    }
  }

  /**
   * Ensure the default category exists
   */
  static async ensureDefaultCategory(): Promise<void> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, DEFAULT_CATEGORY_ID);
      const now = timestampNow();
      
      await setDocument(docRef, {
        ...DEFAULT_CATEGORY,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error ensuring default category:', error);
      throw new Error('Failed to ensure default category');
    }
  }

  /**
   * Convert Firestore document data to Category domain object
   */
  private static convertFromFirestore(id: string, data: any): Category {
    return {
      id,
      name: data.name || '',
      description: data.description,
      color: data.color,
      order: data.order || 0,
      createdBy: data.createdBy || '',
      updatedBy: data.updatedBy,
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}
