import { Flight, FlightQuery, PaginatedFlightResponse } from '@/types/Flight';
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
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  getDocsArray,
  timestampNow,
  timestampFromDate,
  Timestamp
} from '@/utils/firebaseUtils';

export class FlightService {
  private static readonly COLLECTION_NAME = 'flights';

  // Get flights based on user role
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
        // Note: Firestore requires a composite index for this query:
        // Collection: flights, Fields: userId (Ascending), date (Descending), startTime (Descending)
        q = createQuery(
          flightsCollection,
          where('userId', '==', currentUserId),
          orderBy('userId', 'asc'),
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map(doc => ({
        id: doc.id,
        ...doc.data,
        // Convert Firestore Timestamps to Dates
        createdAt: doc.data.createdAt?.toDate(),
        updatedAt: doc.data.updatedAt?.toDate(),
      } as Flight));
    } catch (error) {
      console.error('Error fetching flights:', error);
      throw new Error('Failed to fetch flights');
    }
  }

  // Get a single flight by ID with access control
  static async getFlight(id: string, userRole: UserRole, currentUserId: string): Promise<Flight | null> {
    try {
      const flightDoc = await getDocumentData(getDocument(this.COLLECTION_NAME, id));
      
      if (!flightDoc.exists) {
        return null;
      }

      const flight = {
        id: flightDoc.id,
        ...flightDoc.data,
        createdAt: flightDoc.data.createdAt?.toDate(),
        updatedAt: flightDoc.data.updatedAt?.toDate(),
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
      const now = timestampNow();
      const docRef = await addDocument(getCollection(this.COLLECTION_NAME), {
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
      const flightRef = getDocument(this.COLLECTION_NAME, id);
      const flightDoc = await getDocumentData(flightRef);
      
      if (!flightDoc.exists) {
        throw new Error('Flight not found');
      }

      const currentFlight = flightDoc.data as Flight;
      
      // Check access control - owner or admin/manager
      if (userRole !== 'admin' && userRole !== 'manager' && currentFlight.userId !== currentUserId) {
        throw new Error('Insufficient permissions to update this flight');
      }

      // Store previous values for audit log
      const previousValues = { ...currentFlight };
      const newValues = { ...currentFlight, ...patch };

      await updateDocument(flightRef, {
        ...patch,
        updatedAt: timestampNow(),
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

  // Get paginated flights with filtering
  static async getPaginatedFlights(
    userRole: UserRole, 
    currentUserId: string, 
    queryParams?: FlightQuery
  ): Promise<PaginatedFlightResponse> {
    try {
      const flightsCollection = getCollection(this.COLLECTION_NAME);
      const pageSize = queryParams?.pageSize || 10;
      const pageNumber = queryParams?.pageNumber || 1;

      // Build query constraints
      const constraints = [];

      // Role-based access control
      if (userRole !== 'admin' && userRole !== 'manager') {
        // Users only see their own flights
        constraints.push(where('userId', '==', currentUserId));
      }

      // Apply filters
      if (queryParams?.startDate) {
        constraints.push(where('date', '>=', queryParams.startDate.toISOString().split('T')[0]));
      }

      if (queryParams?.endDate) {
        constraints.push(where('date', '<=', queryParams.endDate.toISOString().split('T')[0]));
      }

      if (queryParams?.flightCategory) {
        constraints.push(where('flightCategory', '==', queryParams.flightCategory));
      }

      if (queryParams?.activityType) {
        constraints.push(where('activityType', '==', queryParams.activityType));
      }

      if (queryParams?.userEmail && (userRole === 'admin' || userRole === 'manager')) {
        constraints.push(where('userEmail', '==', queryParams.userEmail));
      }

      if (queryParams?.droneId) {
        constraints.push(where('droneId', '==', queryParams.droneId));
      }

      // Build base query for counting
      let countQuery;
      if (constraints.length > 0) {
        countQuery = createQuery(flightsCollection, ...constraints);
      } else {
        countQuery = createQuery(flightsCollection);
      }

      // Get total count
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data.count;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build paginated query with ordering
      let paginatedQuery;
      if (constraints.length > 0) {
        paginatedQuery = createQuery(
          flightsCollection, 
          ...constraints, 
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc'),
          limit(pageSize)
        );
      } else {
        paginatedQuery = createQuery(
          flightsCollection, 
          orderBy('date', 'desc'),
          orderBy('startTime', 'desc'),
          limit(pageSize)
        );
      }

      // Apply pagination with startAfter
      if (queryParams?.lastDocumentSnapshot) {
        paginatedQuery = createQuery(paginatedQuery, startAfter(queryParams.lastDocumentSnapshot));
      } else if (pageNumber > 1) {
        // For page-based navigation, we need to skip to the right position
        const skipCount = (pageNumber - 1) * pageSize;
        if (skipCount > 0) {
          let skipQuery;
          if (constraints.length > 0) {
            skipQuery = createQuery(
              flightsCollection, 
              ...constraints, 
              orderBy('date', 'desc'),
              orderBy('startTime', 'desc'),
              limit(skipCount)
            );
          } else {
            skipQuery = createQuery(
              flightsCollection, 
              orderBy('date', 'desc'),
              orderBy('startTime', 'desc'),
              limit(skipCount)
            );
          }
          const skipSnapshot = await getDocs(skipQuery);
          if (skipSnapshot.docs.length > 0) {
            const lastVisibleDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
            paginatedQuery = createQuery(paginatedQuery, startAfter(lastVisibleDoc));
          }
        }
      }

      const snapshot = await getDocs(paginatedQuery);
      const flights = getDocsArray(snapshot).map(doc => ({
        id: doc.id,
        ...doc.data,
        // Convert Firestore Timestamps to Dates
        createdAt: doc.data.createdAt?.toDate(),
        updatedAt: doc.data.updatedAt?.toDate(),
      } as Flight));

      return {
        flights,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
        currentPage: pageNumber,
        totalPages,
        lastDocumentSnapshot: getDocsArray(snapshot).length > 0 ? getDocsArray(snapshot)[getDocsArray(snapshot).length - 1] : undefined,
      };
    } catch (error) {
      console.error('Error fetching paginated flights:', error);
      throw new Error('Failed to fetch flights');
    }
  }
}
