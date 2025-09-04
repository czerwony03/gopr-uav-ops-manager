import {deleteObject, getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {storage} from '@/firebaseConfig';
import {ChecklistItemFormData, ProcedureChecklist, ProcedureChecklistFormData} from '@/types/ProcedureChecklist';
import {AuditLogService} from './auditLogService';
import {UserService} from './userService';
import {UserRole} from "@/types/UserRole";
import {ImageProcessingService} from '@/utils/imageProcessing';
import {ProcedureChecklistRepository} from '@/repositories/ProcedureChecklistRepository';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export class ProcedureChecklistService {
  // Get all procedures/checklists based on user role
  static async getProcedureChecklists(userRole: UserRole): Promise<ProcedureChecklist[]> {
    return ProcedureChecklistRepository.getProcedureChecklists(userRole);
  }

  // Get a single procedure/checklist by ID
  static async getProcedureChecklist(id: string, userRole: UserRole): Promise<ProcedureChecklist | null> {
    const checklist = await ProcedureChecklistRepository.getProcedureChecklist(id);
    
    if (!checklist) {
      return null;
    }

    // Check if non-admin users can access deleted items
    if (userRole !== 'admin' && checklist.isDeleted) {
      return null;
    }

    return checklist;
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
      };

      // Create checklist in repository
      const docId = await ProcedureChecklistRepository.createProcedureChecklist(checklistData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'procedureChecklist',
        entityId: docId,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'procedure/checklist'),
        newValues: { ...checklistData, isDeleted: false }
      });

      return docId;
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
      // Get current checklist data for audit logging
      const currentChecklist = await ProcedureChecklistRepository.getProcedureChecklist(id);
      if (!currentChecklist) {
        throw new Error('Procedure/checklist not found');
      }

      // Process items and upload images
      const processedItems = await this.processChecklistItems(formData.items);

      const updateData = {
        title: formData.title,
        description: formData.description,
        items: processedItems,
        updatedBy: userId,
      };

      // Store previous values for audit log
      const previousValues = { ...currentChecklist };
      const newValues = { ...currentChecklist, ...updateData };

      // Update checklist in repository
      await ProcedureChecklistRepository.updateProcedureChecklist(id, updateData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'procedureChecklist',
        entityId: id,
        action: 'edit',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'procedure/checklist', { previous: previousValues, new: newValues }),
        previousValues,
        newValues
      });
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
      // Get current checklist data for audit logging
      const currentChecklist = await ProcedureChecklistRepository.getProcedureChecklist(id);
      if (!currentChecklist) {
        throw new Error('Procedure/checklist not found');
      }

      // Soft delete checklist in repository
      await ProcedureChecklistRepository.softDeleteProcedureChecklist(id, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'procedureChecklist',
        entityId: id,
        action: 'delete',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('delete', 'procedure/checklist'),
        previousValues: currentChecklist
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
      // Get current checklist data for audit logging
      const currentChecklist = await ProcedureChecklistRepository.getProcedureChecklist(id);
      if (!currentChecklist) {
        throw new Error('Procedure/checklist not found');
      }

      // Restore checklist in repository
      await ProcedureChecklistRepository.restoreProcedureChecklist(id, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'procedureChecklist',
        entityId: id,
        action: 'restore',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('restore', 'procedure/checklist'),
        previousValues: currentChecklist
      });
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      throw new Error('Failed to restore procedure/checklist');
    }
  }

  // Upload image to Firebase Storage
  static async uploadImage(imageUri: string, fileName: string): Promise<string> {
    try {
      // Defensive checks
      if (!fileName || !fileName.trim()) {
        throw new Error('fileName is required');
      }

      // Process the image before upload (resize, compress, convert format)
      const processedImage = await ImageProcessingService.processImageForUpload(imageUri, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'jpeg'
      });

      // Defensive check for processed image
      if (!processedImage || !processedImage.uri) {
        throw new Error('Failed to process image');
      }

      // Create blob based on URI type to handle different platforms and URI formats
      let blob: Blob;

      if (processedImage.uri.startsWith('file://')) {
        // File URI - handle platform differences
        if (Platform.OS === 'web') {
          // Web: file:// URIs should work with fetch
          const response = await fetch(processedImage.uri);
          blob = await response.blob();
        } else {
          // Mobile: file:// URIs may not work with fetch on all platforms
          // Use expo-file-system to read the file and create blob
          try {
            // Try fetch first (might work on some platforms)
            const response = await fetch(processedImage.uri);
            blob = await response.blob();
          } catch (fetchError) {
            console.log('[ProcedureChecklistService] fetch failed for file URI, using FileSystem fallback');
            // Fallback: read file as base64 and write to temp file
            const base64 = await FileSystem.readAsStringAsync(processedImage.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            const tempDir = FileSystem.cacheDirectory;
            if (!tempDir) {
              throw new Error('Cache directory not available');
            }
            
            const tempFilePath = `${tempDir}temp_upload_${Date.now()}.jpg`;
            await FileSystem.writeAsStringAsync(tempFilePath, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Read the temporary file as blob using file:// path that works
            const response = await fetch(tempFilePath);
            blob = await response.blob();
            
            // Clean up temporary file
            await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
          }
        }
      } else if (processedImage.uri.startsWith('data:')) {
        // Base64 data URI - handle length limitations on mobile
        if (Platform.OS === 'web') {
          // Web: fetch should work fine for data URIs
          const response = await fetch(processedImage.uri);
          blob = await response.blob();
        } else {
          // Mobile: avoid fetch with long data URIs, write to temp file instead
          const [header, base64Data] = processedImage.uri.split(',');
          
          const tempDir = FileSystem.cacheDirectory;
          if (!tempDir) {
            throw new Error('Cache directory not available');
          }
          
          const tempFilePath = `${tempDir}temp_upload_${Date.now()}.jpg`;
          await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Read the temporary file as blob
          const response = await fetch(tempFilePath);
          blob = await response.blob();
          
          // Clean up temporary file
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        }
      } else {
        // Blob URL or HTTP URL - use fetch (existing behavior)
        const response = await fetch(processedImage.uri);
        blob = await response.blob();
      }
      
      const imageRef = ref(storage, `procedures_checklists/images/${fileName}`);
      await uploadBytes(imageRef, blob, {
        cacheControl: 'public,max-age=31536000' // Cache for 1 year
      });
      
      const downloadUrl = await getDownloadURL(imageRef);
      
      // Clean up processed image URI if it's a blob URL (web platform)
      if (processedImage.uri.startsWith('blob:') && processedImage.uri !== imageUri) {
        URL.revokeObjectURL(processedImage.uri);
      }
      
      return downloadUrl;
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
          processedItem.image = await this.uploadImage(item.image, fileName);
        } catch (error) {
          console.error('Error uploading image for item:', item.id, error);
          // Continue without image if upload fails
        }
      } else if (item.image && item.image.trim() && !item.image.startsWith('blob:')) {
        // Existing image URL - only include if it has a value and is not a blob URL
        processedItem.image = item.image;
      } else if (item.image && item.image.startsWith('blob:')) {
        // Log warning if blob URL detected (this indicates a bug in the UI layer)
        console.warn('Blob URL detected in procedure form data, skipping:', item.image);
        // Don't include blob URLs in the saved data
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
