import { AuditLog, AuditLogData, AuditLogQuery, PaginatedAuditLogResponse } from '@/types/AuditLog';
import { filterUndefinedProperties } from '@/utils/filterUndefinedProperties';
import { toDateIfTimestamp } from '@/utils/dateUtils';
import {
  getCollection,
  addDocument,
  createQuery,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  getDocsArray,
  timestampNow,
  timestampFromDate
} from '@/utils/firebaseUtils';

export class AuditLogRepository {
  private static readonly COLLECTION_NAME = 'auditLogs';

  /**
   * Create a new audit log entry
   */
  static async createAuditLog(auditData: AuditLogData): Promise<string> {
    try {
      const now = timestampNow();
      
      const completeAuditData = {
        ...auditData,
        timestamp: now,
      };

      const collectionRef = getCollection(this.COLLECTION_NAME);
      const docRef = await addDocument(collectionRef, filterUndefinedProperties(completeAuditData));
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw new Error('Failed to create audit log');
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(queryParams?: AuditLogQuery): Promise<AuditLog[]> {
    try {
      const auditLogsCollection = getCollection(this.COLLECTION_NAME);
      
      // Build query constraints
      const constraints = [];

      if (queryParams?.entityType) {
        constraints.push(where('entityType', '==', queryParams.entityType));
      }

      if (queryParams?.entityId) {
        constraints.push(where('entityId', '==', queryParams.entityId));
      }

      if (queryParams?.userId) {
        constraints.push(where('userId', '==', queryParams.userId));
      }

      if (queryParams?.userEmail) {
        constraints.push(where('userEmail', '==', queryParams.userEmail));
      }

      if (queryParams?.action) {
        constraints.push(where('action', '==', queryParams.action));
      }

      if (queryParams?.startDate) {
        constraints.push(where('timestamp', '>=', timestampFromDate(queryParams.startDate)));
      }

      if (queryParams?.endDate) {
        constraints.push(where('timestamp', '<=', timestampFromDate(queryParams.endDate)));
      }

      // Add order by
      constraints.push(orderBy('timestamp', 'desc'));

      // Apply limit
      if (queryParams?.limit) {
        constraints.push(limit(queryParams.limit));
      }

      // Create query
      const q = createQuery(auditLogsCollection, ...constraints);

      const snapshot = await getDocs(q);
      
      const docs = getDocsArray(snapshot);
      return docs.map((doc: any) => this.convertFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
    }
  }

  /**
   * Get paginated audit logs with filtering and total count
   */
  static async getPaginatedAuditLogs(queryParams?: AuditLogQuery): Promise<PaginatedAuditLogResponse> {
    try {
      const auditLogsCollection = getCollection(this.COLLECTION_NAME);
      const pageSize = queryParams?.pageSize || 10;
      const pageNumber = queryParams?.pageNumber || 1;

      // Build query constraints
      const constraints = [];

      if (queryParams?.entityType) {
        constraints.push(where('entityType', '==', queryParams.entityType));
      }

      if (queryParams?.entityId) {
        constraints.push(where('entityId', '==', queryParams.entityId));
      }

      if (queryParams?.userId) {
        constraints.push(where('userId', '==', queryParams.userId));
      }

      if (queryParams?.userEmail) {
        constraints.push(where('userEmail', '==', queryParams.userEmail));
      }

      if (queryParams?.action) {
        constraints.push(where('action', '==', queryParams.action));
      }

      if (queryParams?.startDate) {
        constraints.push(where('timestamp', '>=', timestampFromDate(queryParams.startDate)));
      }

      if (queryParams?.endDate) {
        constraints.push(where('timestamp', '<=', timestampFromDate(queryParams.endDate)));
      }

      // Build query for counting
      const countQuery = createQuery(auditLogsCollection, ...constraints);

      // Get total count
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data.count;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build paginated query
      const paginatedConstraints = [...constraints, orderBy('timestamp', 'desc'), limit(pageSize)];

      // Apply pagination with startAfter
      if (queryParams?.lastDocumentSnapshot) {
        paginatedConstraints.push(startAfter(queryParams.lastDocumentSnapshot));
      } else if (pageNumber > 1) {
        // For page-based navigation, we need to skip to the right position
        const skipCount = (pageNumber - 1) * pageSize;
        if (skipCount > 0) {
          const skipConstraints = [...constraints, orderBy('timestamp', 'desc'), limit(skipCount)];
          const skipQuery = createQuery(auditLogsCollection, ...skipConstraints);
          const skipSnapshot = await getDocs(skipQuery);
          if (skipSnapshot.docs && skipSnapshot.docs.length > 0) {
            const lastVisibleDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
            paginatedConstraints.push(startAfter(lastVisibleDoc));
          }
        }
      }

      const paginatedQuery = createQuery(auditLogsCollection, ...paginatedConstraints);
      const snapshot = await getDocs(paginatedQuery);
      
      const docs = getDocsArray(snapshot);
      const logs = docs.map((doc: any) => this.convertFromFirestore(doc.id, doc.data));

      const lastDocumentSnapshot = snapshot.docs && snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

      return {
        logs,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
        currentPage: pageNumber,
        totalPages,
        lastDocumentSnapshot,
      };
    } catch (error) {
      console.error('Error fetching paginated audit logs:', error);
      throw new Error('Failed to fetch paginated audit logs');
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(entityType: string, entityId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.getAuditLogs({
      entityType: entityType as any,
      entityId,
      limit
    });
  }

  /**
   * Get recent audit logs (last 100 by default)
   */
  static async getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.getAuditLogs({ limit });
  }

  /**
   * Convert Firestore document data to AuditLog domain object
   */
  private static convertFromFirestore(id: string, data: any): AuditLog {
    return {
      id: id,
      ...data,
      // Convert Firestore Timestamp to Date
      timestamp: toDateIfTimestamp(data.timestamp),
    } as AuditLog;
  }
}