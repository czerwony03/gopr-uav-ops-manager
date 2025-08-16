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
import { db } from '../firebaseConfig';
import { Drone } from '../types/Drone';
import { UserRole } from '../contexts/AuthContext';

export class DroneService {
  private static readonly COLLECTION_NAME = 'drones';

  // Get all drones based on user role
  static async getDrones(userRole: UserRole): Promise<Drone[]> {
    try {
      const dronesCollection = collection(db, this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin') {
        // Admin can see all drones including soft-deleted ones
        q = query(dronesCollection, orderBy('createdAt', 'desc'));
      } else {
        // Users and managers only see non-deleted drones
        q = query(
          dronesCollection, 
          where('isDeleted', '!=', true),
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
      } as Drone));
    } catch (error) {
      console.error('Error fetching drones:', error);
      throw new Error('Failed to fetch drones');
    }
  }

  // Get a single drone by ID
  static async getDrone(id: string, userRole: UserRole): Promise<Drone | null> {
    try {
      const droneDoc = await getDoc(doc(db, this.COLLECTION_NAME, id));
      
      if (!droneDoc.exists()) {
        return null;
      }

      const drone = {
        id: droneDoc.id,
        ...droneDoc.data(),
        createdAt: droneDoc.data().createdAt?.toDate(),
        updatedAt: droneDoc.data().updatedAt?.toDate(),
        deletedAt: droneDoc.data().deletedAt?.toDate(),
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
  static async createDrone(droneData: Omit<Drone, 'id' | 'createdAt' | 'updatedAt'>, userRole: UserRole): Promise<string> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to create drone');
    }

    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...droneData,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating drone:', error);
      throw new Error('Failed to create drone');
    }
  }

  // Update an existing drone (manager and admin only)
  static async updateDrone(id: string, droneData: Partial<Drone>, userRole: UserRole): Promise<void> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to update drone');
    }

    try {
      const droneRef = doc(db, this.COLLECTION_NAME, id);
      const droneDoc = await getDoc(droneRef);
      
      if (!droneDoc.exists()) {
        throw new Error('Drone not found');
      }

      // Check if the drone is soft-deleted and user is not admin
      const currentDrone = droneDoc.data() as Drone;
      if (currentDrone.isDeleted && userRole !== 'admin') {
        throw new Error('Cannot update deleted drone');
      }

      await updateDoc(droneRef, {
        ...droneData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating drone:', error);
      throw new Error('Failed to update drone');
    }
  }

  // Soft delete a drone (manager and admin only)
  static async softDeleteDrone(id: string, userRole: UserRole): Promise<void> {
    if (!this.canModifyDrones(userRole)) {
      throw new Error('Insufficient permissions to delete drone');
    }

    try {
      const droneRef = doc(db, this.COLLECTION_NAME, id);
      const droneDoc = await getDoc(droneRef);
      
      if (!droneDoc.exists()) {
        throw new Error('Drone not found');
      }

      await updateDoc(droneRef, {
        isDeleted: true,
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting drone:', error);
      throw new Error('Failed to delete drone');
    }
  }

  // Restore a soft-deleted drone (admin only)
  static async restoreDrone(id: string, userRole: UserRole): Promise<void> {
    if (userRole !== 'admin') {
      throw new Error('Insufficient permissions to restore drone');
    }

    try {
      const droneRef = doc(db, this.COLLECTION_NAME, id);
      const droneDoc = await getDoc(droneRef);
      
      if (!droneDoc.exists()) {
        throw new Error('Drone not found');
      }

      await updateDoc(droneRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: Timestamp.now(),
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
}