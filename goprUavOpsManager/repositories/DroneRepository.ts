import { Drone } from '@/types/Drone';
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

export class DroneRepository {
  private static readonly COLLECTION_NAME = 'drones';

  /**
   * Get all drones with role-based filtering
   */
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
      return getDocsArray(snapshot).map((doc: any) => this.convertFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching drones:', error);
      throw new Error('Failed to fetch drones');
    }
  }

  /**
   * Get a single drone by ID
   */
  static async getDrone(id: string): Promise<Drone | null> {
    try {
      const droneDoc = await getDocumentData(getDocument(this.COLLECTION_NAME, id));
      
      if (!droneDoc.exists) {
        return null;
      }

      return this.convertFromFirestore(id, droneDoc.data);
    } catch (error) {
      console.error('Error fetching drone:', error);
      throw new Error('Failed to fetch drone');
    }
  }

  /**
   * Create a new drone
   */
  static async createDrone(
    droneData: Omit<Drone, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, 
    userId: string
  ): Promise<string> {
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

      return docRef.id;
    } catch (error) {
      console.error('Error creating drone:', error);
      throw new Error('Failed to create drone');
    }
  }

  /**
   * Update an existing drone
   */
  static async updateDrone(id: string, droneData: Partial<Drone>, userId: string): Promise<void> {
    try {
      const droneRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(droneRef, {
        ...droneData,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating drone:', error);
      throw new Error('Failed to update drone');
    }
  }

  /**
   * Soft delete a drone
   */
  static async softDeleteDrone(id: string, userId: string): Promise<void> {
    try {
      const droneRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(droneRef, {
        isDeleted: true,
        deletedAt: timestampNow(),
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error deleting drone:', error);
      throw new Error('Failed to delete drone');
    }
  }

  /**
   * Restore a soft-deleted drone
   */
  static async restoreDrone(id: string, userId: string): Promise<void> {
    try {
      const droneRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(droneRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error restoring drone:', error);
      throw new Error('Failed to restore drone');
    }
  }

  /**
   * Convert Firestore document data to Drone domain object
   */
  private static convertFromFirestore(id: string, data: any): Drone {
    return {
      id: id,
      ...data,
      // Convert Firestore Timestamps to Dates
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      deletedAt: data.deletedAt?.toDate(),
    } as Drone;
  }
}