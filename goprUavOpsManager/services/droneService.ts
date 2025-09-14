import { Drone } from '@/types/Drone';
import { AuditLogService } from './auditLogService';
import { UserService } from './userService';
import { ImageService } from './imageService';
import {UserRole} from "@/types/UserRole";
import {DroneRepository} from "@/repositories/DroneRepository";

export class DroneService {
  // Get all drones based on user role
  static async getDrones(userRole: UserRole): Promise<Drone[]> {
    return DroneRepository.getDrones(userRole);
  }

  // Get a single drone by ID
  static async getDrone(id: string, userRole: UserRole): Promise<Drone | null> {
    const drone = await DroneRepository.getDrone(id);
    
    if (!drone) {
      return null;
    }

    // Check if user can access this drone
    if (drone.isDeleted && userRole !== 'admin') {
      return null; // Non-admin users cannot see deleted drones
    }

    return drone;
  }

  // Create a new drone (manager and admin only)
  static async createDrone(droneData: Omit<Drone, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userRole: UserRole, userId: string): Promise<string> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to create drone');
    }

    try {
      // Generate a temporary ID for image processing
      const tempId = `temp_${Date.now()}`;
      
      // Process images if any
      let processedImages: string[] = [];
      if (droneData.images && droneData.images.length > 0) {
        processedImages = await ImageService.processImages(
          droneData.images,
          'drones/images',
          tempId
        );
      }

      // Process equipment images if any
      let processedEquipment: any[] = [];
      if (droneData.equipmentList && droneData.equipmentList.length > 0) {
        processedEquipment = await this.processEquipmentImages(droneData.equipmentList, tempId);
      }

      // Create the drone data with processed images and equipment
      const processedDroneData = {
        ...droneData,
        images: processedImages,
        equipmentList: processedEquipment,
      };

      const docId = await DroneRepository.createDrone(processedDroneData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'drone',
        entityId: docId,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'drone'),
        newValues: { ...processedDroneData, isDeleted: false }
      });

      return docId;
    } catch (error) {
      console.error('Error creating drone:', error);
      throw new Error('Failed to create drone');
    }
  }

  // Update an existing drone (manager and admin only)
  static async updateDrone(id: string, droneData: Partial<Drone>, userRole: UserRole, userId: string): Promise<void> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to update drone');
    }

    try {
      // Get current drone data for access control and audit logging
      const currentDrone = await DroneRepository.getDrone(id);
      if (!currentDrone) {
        throw new Error('Drone not found');
      }

      // Check if the drone is soft-deleted and user is not admin
      if (currentDrone.isDeleted && userRole !== 'admin') {
        throw new Error('Cannot update deleted drone');
      }

      // Process images if provided
      let processedData = { ...droneData };
      if (droneData.images !== undefined) {
        processedData.images = await ImageService.processImages(
          droneData.images,
          'drones/images',
          id
        );

        // Clean up old images that are no longer being used
        const oldImages = currentDrone.images || [];
        const newImages = processedData.images;
        const imagesToDelete = oldImages.filter(oldImg => !newImages.includes(oldImg));
        
        // Delete unused images asynchronously (don't wait for completion)
        imagesToDelete.forEach(async (imageUrl) => {
          try {
            await ImageService.deleteImage(imageUrl);
          } catch (error) {
            console.warn('Failed to delete old image:', imageUrl, error);
          }
        });
      }

      // Process equipment images if provided
      if (droneData.equipmentList !== undefined) {
        processedData.equipmentList = await this.processEquipmentImages(droneData.equipmentList, id);
        
        // Clean up old equipment images that are no longer being used
        await this.cleanupEquipmentImages(currentDrone.equipmentList, processedData.equipmentList);
      }

      // Store previous values for audit log
      const previousValues = { ...currentDrone };
      const newValues = { ...currentDrone, ...processedData };

      // Update drone in repository
      await DroneRepository.updateDrone(id, processedData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'drone',
        entityId: id,
        action: 'edit',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'drone', { previous: previousValues, new: newValues }),
        previousValues,
        newValues
      });
    } catch (error) {
      console.error('Error updating drone:', error);
      throw new Error('Failed to update drone');
    }
  }

  // Soft delete a drone (manager and admin only)
  static async softDeleteDrone(id: string, userRole: UserRole, userId: string): Promise<void> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to delete drone');
    }

    try {
      // Get current drone data for audit logging
      const currentDrone = await DroneRepository.getDrone(id);
      if (!currentDrone) {
        throw new Error('Drone not found');
      }

      // Soft delete drone in repository
      await DroneRepository.softDeleteDrone(id, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'drone',
        entityId: id,
        action: 'delete',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('delete', 'drone'),
        previousValues: currentDrone
      });
    } catch (error) {
      console.error('Error deleting drone:', error);
      throw new Error('Failed to delete drone');
    }
  }

  // Restore a soft-deleted drone (admin only)
  static async restoreDrone(id: string, userRole: UserRole, userId: string): Promise<void> {
    if (userRole !== 'admin') {
      throw new Error('Insufficient permissions to restore drone');
    }

    try {
      // Get current drone data for audit logging
      const currentDrone = await DroneRepository.getDrone(id);
      if (!currentDrone) {
        throw new Error('Drone not found');
      }

      // Restore drone in repository
      await DroneRepository.restoreDrone(id, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'drone',
        entityId: id,
        action: 'restore',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('restore', 'drone'),
        previousValues: currentDrone
      });
    } catch (error) {
      console.error('Error restoring drone:', error);
      throw new Error('Failed to restore drone');
    }
  }

  // Process equipment images for upload
  private static async processEquipmentImages(equipmentList: any[], droneId: string): Promise<any[]> {
    if (!equipmentList || equipmentList.length === 0) {
      return [];
    }

    const processedEquipment = [];
    
    for (const item of equipmentList) {
      let processedItem = { ...item };
      
      // Process equipment image if present and it's a new local URI
      if (item.image && !item.image.startsWith('https://')) {
        try {
          const uploadedImageUrl = await ImageService.uploadImage(
            item.image,
            `equipment_${item.id}_${Date.now()}`,
            `drones/equipment/${droneId}`
          );
          processedItem.image = uploadedImageUrl;
        } catch (error) {
          console.warn('Failed to upload equipment image:', error);
          // Continue without the image rather than failing the entire operation
          processedItem.image = undefined;
        }
      }
      
      processedEquipment.push(processedItem);
    }
    
    return processedEquipment;
  }

  // Clean up unused equipment images
  private static async cleanupEquipmentImages(oldEquipment: any[] = [], newEquipment: any[] = []): Promise<void> {
    // Get old images that are no longer being used
    const oldImages = oldEquipment
      .filter(item => item.image && item.image.startsWith('https://'))
      .map(item => item.image);
    
    const newImages = newEquipment
      .filter(item => item.image && item.image.startsWith('https://'))
      .map(item => item.image);
    
    const imagesToDelete = oldImages.filter(oldImg => !newImages.includes(oldImg));
    
    // Delete unused images asynchronously (don't wait for completion)
    imagesToDelete.forEach(async (imageUrl) => {
      try {
        await ImageService.deleteImage(imageUrl);
      } catch (error) {
        console.warn('Failed to delete old equipment image:', imageUrl, error);
      }
    });
  }

  // Check if user can modify drones
  private static canModifyDrones(userRole: UserRole): boolean {
    return userRole === 'manager' || userRole === 'admin';
  }

  // Check if user can view deleted drones
  static canViewDeletedDrones(userRole: UserRole): boolean {
    return userRole === 'admin';
  }

  // Format flight time in minutes to a readable format
  static formatFlightTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
  }

  // Format operating time in minutes to a readable format
  static formatOperatingTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hours`;
    }
    return `${hours} hours ${remainingMinutes} minutes`;
  }

  // Format weight in grams to a readable format
  static formatWeight(grams: number): string {
    if (grams < 1000) {
      return `${grams}g`;
    }
    const kg = (grams / 1000).toFixed(1);
    return `${kg}kg`;
  }

  // Format range in meters to a readable format
  static formatRange(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`;
    }
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  }

  // Format dimensions in mm to a readable format
  static formatDimensions(length: number, width: number, height: number): string {
    // Show in cm if over 100mm for readability
    if (length >= 100 && width >= 100 && height >= 100) {
      const lengthCm = (length / 10).toFixed(1);
      const widthCm = (width / 10).toFixed(1);
      const heightCm = (height / 10).toFixed(1);
      return `${lengthCm} x ${widthCm} x ${heightCm} cm`;
    }
    return `${length} x ${width} x ${height} mm`;
  }
}
