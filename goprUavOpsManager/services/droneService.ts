import { Drone } from '../types/Drone';
import { AuditLogService } from './auditLogService';
import { UserService } from './userService';
import {UserRole} from "@/types/UserRole";
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
  Timestamp
} from '@/utils/firebaseUtils';

export class DroneService {
  private static readonly COLLECTION_NAME = 'drones';

  // Get all drones based on user role
  static async getDrones(userRole: UserRole): Promise<Drone[]> {
    try {
      const dronesCollection = getCollection(this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin') {
        // Admin can see all drones including soft-deleted ones
        q = createQuery(dronesCollection, orderBy('createdAt', 'desc'));
      } else {
        // Users and managers only see non-deleted drones
        q = createQuery(
          dronesCollection, 
          where('isDeleted', '==', false),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map(doc => ({
        id: doc.id,
        ...doc.data,
        // Convert Firestore Timestamps to Dates
        createdAt: doc.data.createdAt?.toDate(),
        updatedAt: doc.data.updatedAt?.toDate(),
        deletedAt: doc.data.deletedAt?.toDate(),
      } as Drone));
    } catch (error) {
      console.error('Error fetching drones:', error);
      throw new Error('Failed to fetch drones');
    }
  }

  // Get a single drone by ID
  static async getDrone(id: string, userRole: UserRole): Promise<Drone | null> {
    try {
      const droneDoc = await getDocumentData(getDocument(this.COLLECTION_NAME, id));
      
      if (!droneDoc.exists) {
        return null;
      }

      const drone = {
        id: id,
        ...droneDoc.data,
        createdAt: droneDoc.data.createdAt?.toDate(),
        updatedAt: droneDoc.data.updatedAt?.toDate(),
        deletedAt: droneDoc.data.deletedAt?.toDate(),
      } as Drone;

      // Check if user can access this drone
      if (drone.isDeleted && userRole !== 'admin') {
        return null; // Non-admin users cannot see deleted drones
      }

      return drone;
    } catch (error) {
      console.error('Error fetching drone:', error);
      throw new Error('Failed to fetch drone');
    }
  }

  // Create a new drone (manager and admin only)
  static async createDrone(droneData: Omit<Drone, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userRole: UserRole, userId: string): Promise<string> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to create drone');
    }

    try {
      const now = timestampNow();
      const docRef = await addDocument(getCollection(this.COLLECTION_NAME), {
        ...droneData,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'drone',
        entityId: docRef.id,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'drone'),
        newValues: { ...droneData, isDeleted: false }
      });

      return docRef.id;
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
      const droneRef = getDocument(this.COLLECTION_NAME, id);
      const droneDoc = await getDocumentData(droneRef);
      
      if (!droneDoc.exists) {
        throw new Error('Drone not found');
      }

      // Check if the drone is soft-deleted and user is not admin
      const currentDrone = droneDoc.data as Drone;
      if (currentDrone.isDeleted && userRole !== 'admin') {
        throw new Error('Cannot update deleted drone');
      }

      // Store previous values for audit log
      const previousValues = { ...currentDrone };
      const newValues = { ...currentDrone, ...droneData };

      await updateDocument(droneRef, {
        ...droneData,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });

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
      const droneRef = getDocument(this.COLLECTION_NAME, id);
      const droneDoc = await getDocumentData(droneRef);
      
      if (!droneDoc.exists) {
        throw new Error('Drone not found');
      }

      const currentDrone = droneDoc.data as Drone;

      await updateDocument(droneRef, {
        isDeleted: true,
        deletedAt: timestampNow(),
        updatedAt: timestampNow(),
        updatedBy: userId,
      });

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
      const droneRef = getDocument(this.COLLECTION_NAME, id);
      const droneDoc = await getDocumentData(droneRef);
      
      if (!droneDoc.exists) {
        throw new Error('Drone not found');
      }

      const currentDrone = droneDoc.data as Drone;

      await updateDocument(droneRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });

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
