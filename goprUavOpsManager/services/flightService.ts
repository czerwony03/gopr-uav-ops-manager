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
import { Flight } from '../types/Flight';
import { UserRole } from '../contexts/AuthContext';
import { AuditLogService } from './auditLogService';
import { UserService } from './userService';

export class FlightService {
  private static readonly COLLECTION_NAME = 'flights';

  // Get flights based on user role
  static async getFlights(userRole: UserRole, currentUserId: string): Promise<Flight[]> {
    try {
      const flightsCollection = collection(db, this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin' || userRole === 'manager') {
        // Admin and manager can see all flights
        q = query(
          flightsCollection, 
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc')
        );
      } else {
        // Users only see their own flights
        // Note: Firestore requires a composite index for this query:
        // Collection: flights, Fields: userId (Ascending), date (Descending), startTime (Descending)
        q = query(
          flightsCollection,
          where('userId', '==', currentUserId),
          orderBy('userId', 'asc'),
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to Dates
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as Flight));
    } catch (error) {
      console.error('Error fetching flights:', error);
      throw new Error('Failed to fetch flights');
    }
  }

  // Get a single flight by ID with access control
  static async getFlight(id: string, userRole: UserRole, currentUserId: string): Promise<Flight | null> {
    try {
      const flightDoc = await getDoc(doc(db, this.COLLECTION_NAME, id));
      
      if (!flightDoc.exists()) {
        return null;
      }

      const flight = {
        id: flightDoc.id,
        ...flightDoc.data(),
        createdAt: flightDoc.data().createdAt?.toDate(),
        updatedAt: flightDoc.data().updatedAt?.toDate(),
      } as Flight;

      // Check access control - owner or admin/manager
      if (userRole !== 'admin' && userRole !== 'manager' && flight.userId !== currentUserId) {
        throw new Error('Insufficient permissions to access this flight');
      }

      return flight;
    } catch (error) {
      console.error('Error fetching flight:', error);
      throw new Error('Failed to fetch flight');
    }
  }

  // Create a new flight
  static async createFlight(
    flightData: Omit<Flight, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, 
    currentUserId: string, 
    currentUserEmail?: string
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...flightData,
        userId: currentUserId,
        userEmail: currentUserEmail || '',
        createdAt: now,
        updatedAt: now,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      });

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(currentUserId);
      await AuditLogService.createAuditLog({
        entityType: 'flight',
        entityId: docRef.id,
        action: 'create',
        userId: currentUserId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'flight'),
        newValues: { ...flightData, userId: currentUserId, userEmail: currentUserEmail || '' }
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating flight:', error);
      throw new Error('Failed to create flight');
    }
  }

  // Update an existing flight with access control
  static async updateFlight(
    id: string, 
    patch: Partial<Flight>, 
    userRole: UserRole, 
    currentUserId: string
  ): Promise<void> {
    try {
      const flightRef = doc(db, this.COLLECTION_NAME, id);
      const flightDoc = await getDoc(flightRef);
      
      if (!flightDoc.exists()) {
        throw new Error('Flight not found');
      }

      const currentFlight = flightDoc.data() as Flight;
      
      // Check access control - owner or admin/manager
      if (userRole !== 'admin' && userRole !== 'manager' && currentFlight.userId !== currentUserId) {
        throw new Error('Insufficient permissions to update this flight');
      }

      // Store previous values for audit log
      const previousValues = { ...currentFlight };
      const newValues = { ...currentFlight, ...patch };

      await updateDoc(flightRef, {
        ...patch,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserId,
      });

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(currentUserId);
      await AuditLogService.createAuditLog({
        entityType: 'flight',
        entityId: id,
        action: 'edit',
        userId: currentUserId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'flight', { previous: previousValues, new: newValues }),
        previousValues,
        newValues
      });
    } catch (error) {
      console.error('Error updating flight:', error);
      throw new Error('Failed to update flight');
    }
  }
}