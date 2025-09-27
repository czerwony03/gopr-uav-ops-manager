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
  or,
  and,
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
  static async getDroneComments(droneId: string, userRole: UserRole, userId: string, queryParams?: Partial<DroneCommentQuery>): Promise<DroneComment[]> {
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
          conditions.push(where('isDeleted', '==', false));
        }
      } else if (userRole === 'manager') {
        // Manager can see all non-deleted comments (public and hidden)
        conditions.push(where('isDeleted', '==', false));
      } else {
        // Regular users only see public, non-deleted comments
        conditions.push(
          where('isDeleted', '==', false),
          or(
            where('visibility', '==', 'public'),
            and(
              where('visibility', '==', 'hidden'),
              where('userId', '==', userId || '')
            )
          ),
        );
      }

      // Add ordering and limit
      const orderField = queryParams?.orderBy || 'createdAt';
      const orderDir = queryParams?.orderDirection || 'desc';
      const queryLimit = queryParams?.limit || 5;

      q = createQuery(
        commentsCollection,
        and(...conditions),
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
      const docRef = await addDocument(collection, docData);
      return docRef.id;
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
  static async getPaginatedDroneComments(droneId: string, userRole: UserRole, userId?: string, queryParams?: Partial<DroneCommentQuery>): Promise<PaginatedDroneCommentResponse> {
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
          conditions.push(where('isDeleted', '==', false));
        }
      } else if (userRole === 'manager') {
        // Manager can see all non-deleted comments (public and hidden)
        conditions.push(where('isDeleted', '==', false));
      } else {
        // Regular users can see public comments and their own hidden comments
        conditions.push(where('isDeleted', '==', false));
        if (userId) {
          conditions.push(
            or(
              where('visibility', '==', 'public'),
              and(
                where('visibility', '==', 'hidden'),
                where('userId', '==', userId)
              )
            )
          );
        } else {
          conditions.push(where('visibility', '==', 'public'));
        }
      }

      // Add ordering and limit
      const orderField = queryParams?.orderBy || 'createdAt';
      const orderDir = queryParams?.orderDirection || 'desc';
      const queryLimit = queryParams?.limit || 5;

      // Build query with conditions
      const baseQuery = [
        and(...conditions),
        orderBy(orderField, orderDir),
      ];

      // Handle pagination with startAfter
      if (queryParams?.lastDocumentSnapshot) {
        q = createQuery(
          commentsCollection,
          ...baseQuery,
          startAfter(queryParams.lastDocumentSnapshot),
          limit(queryLimit + 1) // Get one extra to check if there are more
        );
      } else {
        q = createQuery(
          commentsCollection,
          ...baseQuery,
          limit(queryLimit + 1) // Get one extra to check if there are more
        );
      }

      const snapshot = await getDocs(q);
      const docs = getDocsArray(snapshot);
      
      // Check if we have more than the requested limit
      const hasNextPage = docs.length > queryLimit;
      
      // Remove the extra document if we have one
      const comments = docs
        .slice(0, queryLimit)
        .map((doc: any) => this.convertFromFirestore(doc.id, doc.data()));

      // Get the last document snapshot for pagination
      let lastDocumentSnapshot = null;
      if (hasNextPage && comments.length > 0) {
        // Use the last document from our results (before we sliced off the extra)
        lastDocumentSnapshot = docs[queryLimit - 1];
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
