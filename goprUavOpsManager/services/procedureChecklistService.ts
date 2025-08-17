import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { ProcedureChecklist, ProcedureChecklistFormData, ChecklistItemFormData } from '../types/ProcedureChecklist';
import { UserRole } from '../contexts/AuthContext';

export class ProcedureChecklistService {
  private static readonly COLLECTION_NAME = 'procedures_checklists';

  // Get all procedures/checklists based on user role
  static async getProcedureChecklists(userRole: UserRole): Promise<ProcedureChecklist[]> {
    try {
      const checklistsCollection = collection(db, this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin') {
        // Admin can see all procedures including soft-deleted ones
        q = query(checklistsCollection, orderBy('createdAt', 'desc'));
      } else {
        // Users and managers only see non-deleted procedures
        q = query(
          checklistsCollection, 
          where('isDeleted', '==', false),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to Dates
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        deletedAt: doc.data().deletedAt?.toDate(),
      } as ProcedureChecklist));
    } catch (error) {
      console.error('Error fetching procedures/checklists:', error);
      throw new Error('Failed to fetch procedures/checklists');
    }
  }

  // Get a single procedure/checklist by ID
  static async getProcedureChecklist(id: string, userRole: UserRole): Promise<ProcedureChecklist | null> {
    try {
      const checklistRef = doc(db, this.COLLECTION_NAME, id);
      const checklistDoc = await getDoc(checklistRef);
      
      if (!checklistDoc.exists()) {
        return null;
      }

      const data = checklistDoc.data();
      
      // Check if non-admin users can access deleted items
      if (userRole !== 'admin' && data.isDeleted) {
        return null;
      }

      return {
        id: checklistDoc.id,
        ...data,
        // Convert Firestore Timestamps to Dates
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        deletedAt: data.deletedAt?.toDate(),
      } as ProcedureChecklist;
    } catch (error) {
      console.error('Error fetching procedure/checklist:', error);
      throw new Error('Failed to fetch procedure/checklist');
    }
  }

  // Create a new procedure/checklist (manager and admin only)
  static async createProcedureChecklist(
    formData: ProcedureChecklistFormData, 
    userRole: UserRole, 
    userId: string
  ): Promise<string> {
    if (!this.canModifyProcedures(userRole)) {
      throw new Error('Insufficient permissions to create procedure/checklist');
    }

    try {
      // Process items and upload images
      const processedItems = await this.processChecklistItems(formData.items);

      const checklistData = {
        title: formData.title,
        description: formData.description,
        items: processedItems,
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const checklistsCollection = collection(db, this.COLLECTION_NAME);
      const docRef = await addDoc(checklistsCollection, checklistData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating procedure/checklist:', error);
      throw new Error('Failed to create procedure/checklist');
    }
  }

  // Update an existing procedure/checklist (manager and admin only)
  static async updateProcedureChecklist(
    id: string, 
    formData: ProcedureChecklistFormData, 
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyProcedures(userRole)) {
      throw new Error('Insufficient permissions to update procedure/checklist');
    }

    try {
      const checklistRef = doc(db, this.COLLECTION_NAME, id);
      const checklistDoc = await getDoc(checklistRef);
      
      if (!checklistDoc.exists()) {
        throw new Error('Procedure/checklist not found');
      }

      // Process items and upload images
      const processedItems = await this.processChecklistItems(formData.items);

      const updateData = {
        title: formData.title,
        description: formData.description,
        items: processedItems,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      await updateDoc(checklistRef, updateData);
    } catch (error) {
      console.error('Error updating procedure/checklist:', error);
      throw new Error('Failed to update procedure/checklist');
    }
  }

  // Soft delete a procedure/checklist (manager and admin only)
  static async softDeleteProcedureChecklist(id: string, userRole: UserRole, userId: string): Promise<void> {
    if (!this.canModifyProcedures(userRole)) {
      throw new Error('Insufficient permissions to delete procedure/checklist');
    }

    try {
      const checklistRef = doc(db, this.COLLECTION_NAME, id);
      const checklistDoc = await getDoc(checklistRef);
      
      if (!checklistDoc.exists()) {
        throw new Error('Procedure/checklist not found');
      }

      await updateDoc(checklistRef, {
        isDeleted: true,
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error deleting procedure/checklist:', error);
      throw new Error('Failed to delete procedure/checklist');
    }
  }

  // Restore a soft-deleted procedure/checklist (admin only)
  static async restoreProcedureChecklist(id: string, userRole: UserRole, userId: string): Promise<void> {
    if (userRole !== 'admin') {
      throw new Error('Insufficient permissions to restore procedure/checklist');
    }

    try {
      const checklistRef = doc(db, this.COLLECTION_NAME, id);
      const checklistDoc = await getDoc(checklistRef);
      
      if (!checklistDoc.exists()) {
        throw new Error('Procedure/checklist not found');
      }

      await updateDoc(checklistRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      throw new Error('Failed to restore procedure/checklist');
    }
  }

  // Upload image to Firebase Storage
  static async uploadImage(imageUri: string, fileName: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const imageRef = ref(storage, `procedures_checklists/images/${fileName}`);
      await uploadBytes(imageRef, blob);
      
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Delete image from Firebase Storage
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw error for image deletion failures
    }
  }

  // Process checklist items, handling image uploads
  private static async processChecklistItems(items: ChecklistItemFormData[]): Promise<any[]> {
    const processedItems = [];

    for (const item of items) {
      const processedItem: any = {
        id: item.id,
        topic: item.topic,
        content: item.content,
        number: item.number,
      };

      // Only include link if it has a value
      if (item.link && item.link.trim()) {
        processedItem.link = item.link;
      }

      // Only include file if it has a value
      if (item.file && item.file.trim()) {
        processedItem.file = item.file;
      }

      // Handle image upload if it's a new image (base64 or local file)
      if (item.image && (item.image.startsWith('data:') || item.image.startsWith('file:'))) {
        try {
          const fileName = `${Date.now()}_${item.id}.jpg`;
          const imageUrl = await this.uploadImage(item.image, fileName);
          processedItem.image = imageUrl;
        } catch (error) {
          console.error('Error uploading image for item:', item.id, error);
          // Continue without image if upload fails
        }
      } else if (item.image && item.image.trim()) {
        // Existing image URL - only include if it has a value
        processedItem.image = item.image;
      }

      processedItems.push(processedItem);
    }

    return processedItems;
  }

  // Check if user can modify procedures/checklists
  private static canModifyProcedures(userRole: UserRole): boolean {
    return userRole === 'manager' || userRole === 'admin';
  }
}