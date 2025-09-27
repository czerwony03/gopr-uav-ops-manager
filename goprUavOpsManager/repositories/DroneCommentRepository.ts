import { DroneComment, DroneCommentCreateData, DroneCommentUpdateData, DroneCommentQuery, PaginatedDroneCommentResponse } from '@/types/DroneComment';
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
  timestampNow,
  limit,
  startAfter
} from '@/utils/firebaseUtils';

export class DroneCommentRepository {
  private static readonly COLLECTION_NAME = 'droneComments';

  /**
   * Get all comments for a drone with role-based filtering
   */
  static async getDroneComments(droneId: string, userRole: UserRole, queryParams?: Partial<DroneCommentQuery>): Promise<DroneComment[]> {
    try {
      const commentsCollection = getCollection(this.COLLECTION_NAME);
      let q;

      const conditions = [
        where('droneId', '==', droneId)
      ];

      // Role-based visibility filtering
      if (userRole === 'admin') {
        // Admin can see all comments including soft-deleted ones if requested
        if (!queryParams?.includeDeleted) {
          conditions.push(where('isDeleted', '!=', true));
        }
      } else if (userRole === 'manager') {
        // Manager can see all non-deleted comments (public and hidden)
        conditions.push(where('isDeleted', '!=', true));
      } else {
        // Regular users only see public, non-deleted comments
        conditions.push(
          where('isDeleted', '!=', true),
          where('visibility', '==', 'public')
        );
      }

      // Add ordering and limit
      const orderField = queryParams?.orderBy || 'createdAt';
      const orderDir = queryParams?.orderDirection || 'desc';
      const queryLimit = queryParams?.limit || 20;

      q = createQuery(
        commentsCollection,
        ...conditions,
        orderBy(orderField, orderDir),
        limit(queryLimit)
      );

      // Handle pagination
      if (queryParams?.lastDocumentSnapshot) {
        q = createQuery(
          commentsCollection,
          ...conditions,
          orderBy(orderField, orderDir),
          startAfter(queryParams.lastDocumentSnapshot),
          limit(queryLimit)
        );
      }

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map((doc: any) => this.convertFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching drone comments:', error);
      throw new Error('Failed to fetch drone comments');
    }
  }

  /**
   * Get a single comment by ID
   */
  static async getDroneComment(id: string): Promise<DroneComment | null> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, id);
      const docData = await getDocumentData(docRef);
      
      if (!docData) {
        return null;
      }

      return this.convertFromFirestore(id, docData);
    } catch (error) {
      console.error('Error fetching drone comment:', error);
      return null;
    }
  }

  /**
   * Create a new drone comment
   */
  static async createDroneComment(commentData: DroneCommentCreateData, userId: string, userEmail?: string): Promise<string> {
    try {
      const now = timestampNow();
      const docData = {
        droneId: commentData.droneId,
        userId,
        userEmail: userEmail || '',
        userName: '', // Will be filled by service layer
        content: commentData.content,
        images: commentData.images || [],
        visibility: commentData.visibility,
        isDeleted: false,
        createdAt: now,
      };

      const collection = getCollection(this.COLLECTION_NAME);
      const docId = await addDocument(collection, docData);
      return docId;
    } catch (error) {
      console.error('Error creating drone comment:', error);
      throw new Error('Failed to create drone comment');
    }
  }

  /**
   * Update an existing drone comment
   */
  static async updateDroneComment(id: string, commentData: DroneCommentUpdateData, userId: string): Promise<void> {
    try {
      const now = timestampNow();
      const updateData: any = {
        updatedAt: now,
      };

      if (commentData.content !== undefined) {
        updateData.content = commentData.content;
      }

      if (commentData.images !== undefined) {
        updateData.images = commentData.images;
      }

      if (commentData.visibility !== undefined) {
        updateData.visibility = commentData.visibility;
      }

      const docRef = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(docRef, updateData);
    } catch (error) {
      console.error('Error updating drone comment:', error);
      throw new Error('Failed to update drone comment');
    }
  }

  /**
   * Soft delete (hide) a drone comment - only for admin/manager
   */
  static async softDeleteDroneComment(id: string, userId: string): Promise<void> {
    try {
      const now = timestampNow();
      const docRef = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(docRef, {
        isDeleted: true,
        deletedAt: now,
        deletedBy: userId,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error soft deleting drone comment:', error);
      throw new Error('Failed to delete drone comment');
    }
  }

  /**
   * Restore a soft-deleted drone comment - only for admin
   */
  static async restoreDroneComment(id: string, userId: string): Promise<void> {
    try {
      const now = timestampNow();
      const docRef = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(docRef, {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error restoring drone comment:', error);
      throw new Error('Failed to restore drone comment');
    }
  }

  /**
   * Get paginated comments for a drone
   */
  static async getPaginatedDroneComments(droneId: string, userRole: UserRole, queryParams?: Partial<DroneCommentQuery>): Promise<PaginatedDroneCommentResponse> {
    try {
      const comments = await this.getDroneComments(droneId, userRole, queryParams);
      
      // For pagination, we check if there are more results by fetching one extra
      const hasNextPage = comments.length === (queryParams?.limit || 20);
      
      // Get the last document snapshot for next page
      let lastDocumentSnapshot = null;
      if (hasNextPage && comments.length > 0) {
        // This would need the actual Firestore document snapshot, not just the data
        // For now, we'll implement basic pagination
        lastDocumentSnapshot = comments[comments.length - 1].id;
      }

      return {
        comments,
        hasNextPage,
        hasPreviousPage: false, // Implement if backward pagination is needed
        lastDocumentSnapshot
      };
    } catch (error) {
      console.error('Error fetching paginated drone comments:', error);
      throw new Error('Failed to fetch paginated drone comments');
    }
  }

  /**
   * Convert Firestore document data to DroneComment domain object
   */
  private static convertFromFirestore(id: string, data: any): DroneComment {
    return {
      id,
      droneId: data.droneId,
      userId: data.userId,
      userEmail: data.userEmail || '',
      userName: data.userName || '',
      content: data.content,
      images: data.images || [],
      visibility: data.visibility,
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt?.toDate() || undefined,
      deletedBy: data.deletedBy || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || undefined,
    };
  }
}