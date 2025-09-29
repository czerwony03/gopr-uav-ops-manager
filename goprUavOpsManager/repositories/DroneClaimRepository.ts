import { DroneClaim, DroneClaimData, DroneClaimQuery, PaginatedDroneClaimResponse } from '@/types/DroneClaim';
import {
  getCollection,
  getDocument,
  getDocumentData,
  addDocument,
  updateDocument,
  createQuery,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  getDocsArray,
  timestampNow,
  Timestamp
} from '@/utils/firebaseUtils';

export class DroneClaimRepository {
  private static readonly COLLECTION_NAME = 'droneClaims';

  /**
   * Convert Firestore data to DroneClaim
   */
  private static convertFromFirestore(id: string, data: any): DroneClaim {
    return {
      id,
      droneId: data.droneId,
      userId: data.userId,
      userEmail: data.userEmail,
      startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime),
      endTime: data.endTime?.toDate ? data.endTime.toDate() : data.endTime ? new Date(data.endTime) : undefined,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy
    };
  }

  /**
   * Convert DroneClaim to Firestore data
   */
  private static convertToFirestore(claim: Partial<DroneClaim>): any {
    const data: any = {
      ...claim
    };
    
    // Convert dates to Firestore timestamps
    if (data.startTime) {
      data.startTime = Timestamp.fromDate(data.startTime);
    }
    if (data.endTime) {
      data.endTime = Timestamp.fromDate(data.endTime);
    }
    if (data.createdAt) {
      data.createdAt = Timestamp.fromDate(data.createdAt);
    }
    if (data.updatedAt) {
      data.updatedAt = Timestamp.fromDate(data.updatedAt);
    }

    // Remove id field
    delete data.id;
    
    return data;
  }

  /**
   * Create a new drone claim
   */
  static async createClaim(claimData: DroneClaimData, userId: string): Promise<string> {
    try {
      const now = timestampNow();
      const processedData = this.convertToFirestore({
        ...claimData,
        createdAt: now.toDate(),
        createdBy: userId
      });

      const claimsCollection = getCollection(this.COLLECTION_NAME);
      const docRef = await addDocument(claimsCollection, processedData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating drone claim:', error);
      throw new Error('Failed to create drone claim');
    }
  }

  /**
   * Update an existing drone claim (for ending claims)
   */
  static async updateClaim(id: string, updates: Partial<DroneClaim>, userId: string): Promise<void> {
    try {
      const now = timestampNow();
      const processedUpdates = this.convertToFirestore({
        ...updates,
        updatedAt: now.toDate(),
        updatedBy: userId
      });

      const claimDoc = getDocument(this.COLLECTION_NAME, id);
      await updateDocument(claimDoc, processedUpdates);
    } catch (error) {
      console.error('Error updating drone claim:', error);
      throw new Error('Failed to update drone claim');
    }
  }

  /**
   * Get a specific drone claim by ID
   */
  static async getClaim(id: string): Promise<DroneClaim | null> {
    try {
      const claimDoc = getDocument(this.COLLECTION_NAME, id);
      const claimSnapshot = await getDocumentData(claimDoc);
      
      if (!claimSnapshot.exists) {
        return null;
      }

      return this.convertFromFirestore(id, claimSnapshot.data);
    } catch (error) {
      console.error('Error fetching drone claim:', error);
      throw new Error('Failed to fetch drone claim');
    }
  }

  /**
   * Get current active claim for a specific drone
   */
  static async getActiveClaim(droneId: string): Promise<DroneClaim | null> {
    try {
      const claimsCollection = getCollection(this.COLLECTION_NAME);
      const q = createQuery(
        claimsCollection,
        where('droneId', '==', droneId),
        where('endTime', '==', null),
        orderBy('startTime', 'desc'),
        firestoreLimit(1)
      );

      const snapshot = await getDocs(q);
      const claims = getDocsArray(snapshot);
      
      if (claims.length === 0) {
        return null;
      }

      return this.convertFromFirestore(claims[0].id, claims[0].data);
    } catch (error) {
      console.error('Error fetching active claim:', error);
      throw new Error('Failed to fetch active claim');
    }
  }

  /**
   * Get claims with optional filtering
   */
  static async getClaims(queryParams?: DroneClaimQuery): Promise<DroneClaim[]> {
    try {
      const claimsCollection = getCollection(this.COLLECTION_NAME);
      const constraints = [];

      if (queryParams?.droneId) {
        constraints.push(where('droneId', '==', queryParams.droneId));
      }

      if (queryParams?.userId) {
        constraints.push(where('userId', '==', queryParams.userId));
      }

      if (queryParams?.active !== undefined) {
        if (queryParams.active) {
          constraints.push(where('endTime', '==', null));
        } else {
          constraints.push(where('endTime', '!=', null));
        }
      }

      // Always order by startTime descending
      constraints.push(orderBy('startTime', 'desc'));

      if (queryParams?.limit) {
        constraints.push(firestoreLimit(queryParams.limit));
      }

      const q = createQuery(claimsCollection, ...constraints);
      const snapshot = await getDocs(q);
      
      return getDocsArray(snapshot).map((doc: any) => 
        this.convertFromFirestore(doc.id, doc.data)
      );
    } catch (error) {
      console.error('Error fetching drone claims:', error);
      throw new Error('Failed to fetch drone claims');
    }
  }

  /**
   * Get paginated claims with filtering and total count
   */
  static async getPaginatedClaims(queryParams?: DroneClaimQuery): Promise<PaginatedDroneClaimResponse> {
    try {
      const pageSize = queryParams?.limit || 20;
      const offset = queryParams?.offset || 0;

      // Get claims with one extra to check if there are more
      const claimsQuery = {
        ...queryParams,
        limit: pageSize + 1
      };
      
      const claims = await this.getClaims(claimsQuery);
      const hasMore = claims.length > pageSize;
      const paginatedClaims = hasMore ? claims.slice(0, pageSize) : claims;

      // For total count, we'd need a separate query without limits
      // For now, we'll estimate based on the current results
      const total = offset + paginatedClaims.length + (hasMore ? 1 : 0);

      return {
        claims: paginatedClaims,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching paginated drone claims:', error);
      throw new Error('Failed to fetch paginated drone claims');
    }
  }

  /**
   * Get claim history for a specific drone
   */
  static async getDroneClaimHistory(droneId: string, limit: number = 50): Promise<DroneClaim[]> {
    return this.getClaims({
      droneId,
      limit
    });
  }

  /**
   * Get claims for a specific user
   */
  static async getUserClaims(userId: string, limit: number = 50): Promise<DroneClaim[]> {
    return this.getClaims({
      userId,
      limit
    });
  }
}
