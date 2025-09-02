import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { UserRole } from '@/types/UserRole';
import {
  getCollection,
  getDocument,
  getDocumentData,
  addDocument,
  updateDocument,
  createQuery,
  where,
  orderBy,
  getDocs,
  getDocsArray,
  timestampNow
} from '@/utils/firebaseUtils';

export class ProcedureChecklistRepository {
  private static readonly COLLECTION_NAME = 'procedures_checklists';

  /**
   * Get all procedures/checklists based on user role
   */
  static async getProcedureChecklists(userRole: UserRole): Promise<ProcedureChecklist[]> {
    try {
      const checklistsCollection = getCollection(this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin') {
        // Admin can see all procedures including soft-deleted ones
        q = createQuery(checklistsCollection, orderBy('createdAt', 'desc'));
      } else {
        // Users and managers only see non-deleted procedures
        q = createQuery(
          checklistsCollection, 
          where('isDeleted', '==', false),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map((doc: any) => this.convertFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching procedures/checklists:', error);
      throw new Error('Failed to fetch procedures/checklists');
    }
  }

  /**
   * Get a single procedure/checklist by ID
   */
  static async getProcedureChecklist(id: string): Promise<ProcedureChecklist | null> {
    try {
      const checklistRef = getDocument(this.COLLECTION_NAME, id);
      const checklistDoc = await getDocumentData(checklistRef);
      
      if (!checklistDoc.exists) {
        return null;
      }

      return this.convertFromFirestore(id, checklistDoc.data);
    } catch (error) {
      console.error('Error fetching procedure/checklist:', error);
      throw new Error('Failed to fetch procedure/checklist');
    }
  }

  /**
   * Create a new procedure/checklist
   */
  static async createProcedureChecklist(
    checklistData: Omit<ProcedureChecklist, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    try {
      const now = timestampNow();
      const docRef = await addDocument(getCollection(this.COLLECTION_NAME), {
        ...checklistData,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating procedure/checklist:', error);
      throw new Error('Failed to create procedure/checklist');
    }
  }

  /**
   * Update an existing procedure/checklist
   */
  static async updateProcedureChecklist(
    id: string, 
    checklistData: Partial<ProcedureChecklist>, 
    userId: string
  ): Promise<void> {
    try {
      const checklistRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(checklistRef, {
        ...checklistData,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating procedure/checklist:', error);
      throw new Error('Failed to update procedure/checklist');
    }
  }

  /**
   * Soft delete a procedure/checklist
   */
  static async softDeleteProcedureChecklist(id: string, userId: string): Promise<void> {
    try {
      const checklistRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(checklistRef, {
        isDeleted: true,
        deletedAt: timestampNow(),
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error deleting procedure/checklist:', error);
      throw new Error('Failed to delete procedure/checklist');
    }
  }

  /**
   * Restore a soft-deleted procedure/checklist
   */
  static async restoreProcedureChecklist(id: string, userId: string): Promise<void> {
    try {
      const checklistRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(checklistRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      throw new Error('Failed to restore procedure/checklist');
    }
  }

  /**
   * Convert Firestore document data to ProcedureChecklist domain object
   */
  private static convertFromFirestore(id: string, data: any): ProcedureChecklist {
    return {
      id: id,
      ...data,
      // Convert Firestore Timestamps to Dates
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      deletedAt: data.deletedAt?.toDate(),
    } as ProcedureChecklist;
  }
}