import { DroneComment, DroneCommentCreateData, DroneCommentUpdateData, DroneCommentQuery, PaginatedDroneCommentResponse } from '@/types/DroneComment';
import { UserRole } from '@/types/UserRole';
import { DroneCommentRepository } from '@/repositories/DroneCommentRepository';
import { AuditLogService } from '@/services/auditLogService';
import { ImageService } from '@/services/imageService';
import { UserService } from '@/services/userService';

export class DroneCommentService {

  /**
   * Get a single comment by ID
   */
  static async getDroneComment(id: string): Promise<DroneComment | null> {
    try {
      return await DroneCommentRepository.getDroneComment(id);
    } catch (error) {
      console.error('Error in DroneCommentService.getDroneComment:', error);
      throw error;
    }
  }

  /**
   * Create a new drone comment
   */
  static async createDroneComment(
    commentData: DroneCommentCreateData, 
    userRole: UserRole, 
    userId: string, 
    userEmail?: string
  ): Promise<string> {
    // Check if user can create comments (all authenticated users can)
    if (!userId) {
      throw new Error('User authentication required to create comments');
    }

    try {
      // Get user display name for better UX
      await UserService.getUserDisplayName(userId);

      // Process images if provided
      let processedImages: string[] = [];
      if (commentData.images && commentData.images.length > 0) {
        // Create a temporary comment ID for image processing
        const tempId = Date.now().toString();
        processedImages = await ImageService.processImages(
          commentData.images,
          'droneComments/images',
          tempId
        );
      }

      const processedCommentData = {
        ...commentData,
        images: processedImages
      };

      const docId = await DroneCommentRepository.createDroneComment(
        processedCommentData, 
        userId, 
        userEmail
      );

      // Update comment with actual ID in image paths if needed
      if (processedImages.length > 0) {
        const updatedImages = processedImages.map(url => 
          url.replace(`/droneComments/images/${Date.now().toString()}`, 
                     `/droneComments/images/${docId}`)
        );
        
        await DroneCommentRepository.updateDroneComment(docId, {
          images: updatedImages
        }, userId);
      }

      // Add to audit log
      await AuditLogService.createAuditLog({
        entityType: 'droneComment',
        entityId: docId,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'drone comment'),
        newValues: { 
          droneId: commentData.droneId,
          content: commentData.content,
          visibility: commentData.visibility,
          imageCount: processedImages.length
        }
      });

      return docId;
    } catch (error) {
      console.error('Error creating drone comment:', error);
      throw new Error('Failed to create drone comment');
    }
  }

  /**
   * Update an existing drone comment (future enhancement)
   */
  static async updateDroneComment(
    id: string, 
    commentData: DroneCommentUpdateData, 
    userRole: UserRole, 
    userId: string,
    userEmail?: string
  ): Promise<void> {
    try {
      // Get current comment to check ownership/permissions
      const currentComment = await DroneCommentRepository.getDroneComment(id);
      if (!currentComment) {
        throw new Error('Comment not found');
      }

      // Check permissions - only comment owner or admin/manager can update
      const canUpdate = currentComment.userId === userId || 
                       userRole === 'admin' || 
                       userRole === 'manager';
      
      if (!canUpdate) {
        throw new Error('Permission denied: Cannot update this comment');
      }

      // Process images if provided
      let processedImages: string[] | undefined = undefined;
      if (commentData.images !== undefined) {
        processedImages = await ImageService.processImages(
          commentData.images,
          'droneComments/images',
          id
        );
      }

      const processedCommentData = {
        ...commentData,
        ...(processedImages !== undefined && { images: processedImages })
      };

      await DroneCommentRepository.updateDroneComment(id, processedCommentData, userId);

      // Add to audit log
      await AuditLogService.createAuditLog({
        entityType: 'droneComment',
        entityId: id,
        action: 'update',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('update', 'drone comment'),
        previousValues: {
          content: currentComment.content,
          visibility: currentComment.visibility,
          imageCount: currentComment.images?.length || 0
        },
        newValues: {
          content: processedCommentData.content || currentComment.content,
          visibility: processedCommentData.visibility || currentComment.visibility,
          imageCount: processedImages?.length || currentComment.images?.length || 0
        }
      });

    } catch (error) {
      console.error('Error updating drone comment:', error);
      throw error;
    }
  }

  /**
   * Soft delete (hide) a drone comment - only for admin/manager
   */
  static async deleteDroneComment(
    id: string, 
    userRole: UserRole, 
    userId: string,
    userEmail?: string
  ): Promise<void> {
    try {
      // Check permissions - only admin/manager can delete comments
      if (userRole !== 'admin' && userRole !== 'manager') {
        throw new Error('Permission denied: Only managers and admins can delete comments');
      }

      const currentComment = await DroneCommentRepository.getDroneComment(id);
      if (!currentComment) {
        throw new Error('Comment not found');
      }

      await DroneCommentRepository.softDeleteDroneComment(id, userId);

      // Add to audit log
      await AuditLogService.createAuditLog({
        entityType: 'droneComment',
        entityId: id,
        action: 'soft_delete',
        userId,
        userEmail,
        details: `Drone comment deleted/hidden by ${userRole}`,
        previousValues: {
          content: currentComment.content,
          visibility: currentComment.visibility,
          isDeleted: currentComment.isDeleted || false
        },
        newValues: {
          isDeleted: true
        }
      });

    } catch (error) {
      console.error('Error deleting drone comment:', error);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted drone comment - only for admin
   */
  static async restoreDroneComment(
    id: string, 
    userRole: UserRole, 
    userId: string,
    userEmail?: string
  ): Promise<void> {
    try {
      // Check permissions - only admin can restore comments
      if (userRole !== 'admin') {
        throw new Error('Permission denied: Only admins can restore comments');
      }

      const currentComment = await DroneCommentRepository.getDroneComment(id);
      if (!currentComment) {
        throw new Error('Comment not found');
      }

      await DroneCommentRepository.restoreDroneComment(id, userId);

      // Add to audit log
      await AuditLogService.createAuditLog({
        entityType: 'droneComment',
        entityId: id,
        action: 'restore',
        userId,
        userEmail,
        details: 'Drone comment restored by admin',
        previousValues: {
          isDeleted: true
        },
        newValues: {
          isDeleted: false
        }
      });

    } catch (error) {
      console.error('Error restoring drone comment:', error);
      throw error;
    }
  }

  /**
   * Get paginated comments for a drone
   */
  static async getPaginatedDroneComments(
    droneId: string, 
    userRole: UserRole,
    userId: string,
    queryParams?: Partial<DroneCommentQuery>
  ): Promise<PaginatedDroneCommentResponse> {
    try {
      return await DroneCommentRepository.getPaginatedDroneComments(droneId, userRole, userId, queryParams);
    } catch (error) {
      console.error('Error in DroneCommentService.getPaginatedDroneComments:', error);
      throw error;
    }
  }

  /**
   * Check if user can view hidden comments
   */
  static canViewHiddenComments(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'manager';
  }

  /**
   * Check if user can delete/hide comments
   */
  static canDeleteComments(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'manager';
  }

  /**
   * Check if user can restore comments
   */
  static canRestoreComments(userRole: UserRole): boolean {
    return userRole === 'admin';
  }
}
