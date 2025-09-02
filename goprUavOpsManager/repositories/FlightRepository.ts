import { Flight, FlightQuery, PaginatedFlightResponse } from '@/types/Flight';
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
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  getDocsArray,
  timestampNow
} from '@/utils/firebaseUtils';

export class FlightRepository {
  private static readonly COLLECTION_NAME = 'flights';

  /**
   * Get flights based on user role and access control
   */
  static async getFlights(userRole: UserRole, currentUserId: string): Promise<Flight[]> {
    try {
      const flightsCollection = getCollection(this.COLLECTION_NAME);
      let q;

      if (userRole === 'admin' || userRole === 'manager') {
        // Admin and manager can see all flights
        q = createQuery(
          flightsCollection, 
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc')
        );
      } else {
        // Users only see their own flights
        q = createQuery(
          flightsCollection,
          where('userId', '==', currentUserId),
          orderBy('userId', 'asc'),
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map((doc: any) => this.convertFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching flights:', error);
      throw new Error('Failed to fetch flights');
    }
  }

  /**
   * Get a single flight by ID
   */
  static async getFlight(id: string): Promise<Flight | null> {
    try {
      const flightDoc = await getDocumentData(getDocument(this.COLLECTION_NAME, id));
      
      if (!flightDoc.exists) {
        return null;
      }

      return this.convertFromFirestore(id, flightDoc.data);
    } catch (error) {
      console.error('Error fetching flight:', error);
      throw new Error('Failed to fetch flight');
    }
  }

  /**
   * Create a new flight
   */
  static async createFlight(
    flightData: Omit<Flight, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, 
    currentUserId: string
  ): Promise<string> {
    try {
      const now = timestampNow();
      const docRef = await addDocument(getCollection(this.COLLECTION_NAME), {
        ...flightData,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating flight:', error);
      throw new Error('Failed to create flight');
    }
  }

  /**
   * Update an existing flight
   */
  static async updateFlight(id: string, patch: Partial<Flight>, currentUserId: string): Promise<void> {
    try {
      const flightRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(flightRef, {
        ...patch,
        updatedAt: timestampNow(),
        updatedBy: currentUserId,
      });
    } catch (error) {
      console.error('Error updating flight:', error);
      throw new Error('Failed to update flight');
    }
  }

  /**
   * Soft delete a flight
   */
  static async deleteFlight(id: string, currentUserId: string): Promise<void> {
    try {
      const flightRef = getDocument(this.COLLECTION_NAME, id);

      await updateDocument(flightRef, {
        isDeleted: true,
        deletedAt: timestampNow(),
        updatedAt: timestampNow(),
        updatedBy: currentUserId,
      });
    } catch (error) {
      console.error('Error deleting flight:', error);
      throw new Error('Failed to delete flight');
    }
  }

  /**
   * Get paginated flights with filtering
   */
  static async getPaginatedFlights(
    queryParams: FlightQuery, 
    userRole: UserRole, 
    currentUserId: string
  ): Promise<PaginatedFlightResponse> {
    try {
      const flightsCollection = getCollection(this.COLLECTION_NAME);
      const pageSize = queryParams.pageSize || 10;
      const pageNumber = queryParams.pageNumber || 1;

      // Build query constraints
      const constraints = [];

      // Role-based access control
      if (userRole !== 'admin' && userRole !== 'manager') {
        constraints.push(where('userId', '==', currentUserId));
      }

      // Apply filters
      if (queryParams.startDate) {
        constraints.push(where('date', '>=', queryParams.startDate.toISOString().split('T')[0]));
      }

      if (queryParams.endDate) {
        constraints.push(where('date', '<=', queryParams.endDate.toISOString().split('T')[0]));
      }

      if (queryParams.flightCategory) {
        constraints.push(where('flightCategory', '==', queryParams.flightCategory));
      }

      if (queryParams.activityType) {
        constraints.push(where('activityType', '==', queryParams.activityType));
      }

      if (queryParams.userEmail) {
        constraints.push(where('userEmail', '==', queryParams.userEmail));
      }

      if (queryParams.droneId) {
        constraints.push(where('droneId', '==', queryParams.droneId));
      }

      // Build query for counting
      const countQuery = createQuery(flightsCollection, ...constraints);

      // Get total count
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data.count;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build paginated query
      const paginatedConstraints = [...constraints, orderBy('date', 'desc'), orderBy('startTime', 'desc'), limit(pageSize)];

      // Apply pagination with startAfter
      if (queryParams.lastDocumentSnapshot) {
        paginatedConstraints.push(startAfter(queryParams.lastDocumentSnapshot));
      } else if (pageNumber > 1) {
        // For page-based navigation, skip to the right position
        const skipCount = (pageNumber - 1) * pageSize;
        if (skipCount > 0) {
          const skipConstraints = [...constraints, orderBy('date', 'desc'), orderBy('startTime', 'desc'), limit(skipCount)];
          const skipQuery = createQuery(flightsCollection, ...skipConstraints);
          const skipSnapshot = await getDocs(skipQuery);
          if (skipSnapshot.docs && skipSnapshot.docs.length > 0) {
            const lastVisibleDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
            paginatedConstraints.push(startAfter(lastVisibleDoc));
          }
        }
      }

      const paginatedQuery = createQuery(flightsCollection, ...paginatedConstraints);
      const snapshot = await getDocs(paginatedQuery);
      
      const docs = getDocsArray(snapshot);
      const flights = docs.map((doc: any) => this.convertFromFirestore(doc.id, doc.data));

      const lastDocumentSnapshot = snapshot.docs && snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

      return {
        flights,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
        currentPage: pageNumber,
        totalPages,
        lastDocumentSnapshot,
      };
    } catch (error) {
      console.error('Error fetching paginated flights:', error);
      throw new Error('Failed to fetch paginated flights');
    }
  }

  /**
   * Convert Firestore document data to Flight domain object
   */
  private static convertFromFirestore(id: string, data: any): Flight {
    return {
      id: id,
      ...data,
      // Convert Firestore Timestamps to Dates
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Flight;
  }
}