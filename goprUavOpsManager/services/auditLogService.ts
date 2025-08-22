import { 
  collection, 
  addDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit as limitQuery,
  startAfter,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { AuditLog, AuditLogData, AuditLogQuery, PaginatedAuditLogResponse } from '@/types/AuditLog';
import { ApplicationMetadata } from '@/utils/applicationMetadata';
import { deepDiff, formatChanges } from '@/utils/deepDiff';
import {filterUndefinedProperties} from "@/utils/filterUndefinedProperties";
import {toDateIfTimestamp} from "@/utils/dateUtils";

export class AuditLogService {
  private static readonly COLLECTION_NAME = 'auditLogs';

  /**
   * Create a new audit log entry
   */
  static async createAuditLog(auditData: Omit<AuditLogData, 'applicationPlatform' | 'applicationVersion' | 'commitHash'>): Promise<string> {
    try {
      const now = Timestamp.now();
      const metadata = ApplicationMetadata.getMetadata();
      
      const completeAuditData = {
        ...auditData,
        ...metadata,
        timestamp: now,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), filterUndefinedProperties(completeAuditData));
      
      console.log(`Audit log created: ${auditData.action} on ${auditData.entityType}:${auditData.entityId} by ${auditData.userEmail || auditData.userId} [${metadata.applicationPlatform} v${metadata.applicationVersion}${metadata.commitHash ? ` @${metadata.commitHash.substring(0, 7)}` : ''}]`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error to prevent audit logging from breaking main operations
      return '';
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(queryParams?: AuditLogQuery): Promise<AuditLog[]> {
    try {
      const auditLogsCollection = collection(db, this.COLLECTION_NAME);
      let q = query(auditLogsCollection);

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
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }

      if (queryParams?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
      }

      // Apply constraints
      if (constraints.length > 0) {
        q = query(auditLogsCollection, ...constraints, orderBy('timestamp', 'desc'));
      } else {
        q = query(auditLogsCollection, orderBy('timestamp', 'desc'));
      }

      // Apply limit
      if (queryParams?.limit) {
        q = query(q, limitQuery(queryParams.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to Date
        timestamp: toDateIfTimestamp(doc.data().timestamp),
      } as AuditLog));
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
      const auditLogsCollection = collection(db, this.COLLECTION_NAME);
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
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }

      if (queryParams?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
      }

      // Build base query for counting
      let countQuery;
      if (constraints.length > 0) {
        countQuery = query(auditLogsCollection, ...constraints);
      } else {
        countQuery = query(auditLogsCollection);
      }

      // Get total count
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data().count;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build paginated query
      let paginatedQuery;
      if (constraints.length > 0) {
        paginatedQuery = query(auditLogsCollection, ...constraints, orderBy('timestamp', 'desc'), limitQuery(pageSize));
      } else {
        paginatedQuery = query(auditLogsCollection, orderBy('timestamp', 'desc'), limitQuery(pageSize));
      }

      // Apply pagination with startAfter
      if (queryParams?.lastDocumentSnapshot) {
        paginatedQuery = query(paginatedQuery, startAfter(queryParams.lastDocumentSnapshot));
      } else if (pageNumber > 1) {
        // For page-based navigation, we need to skip to the right position
        // This is less efficient than cursor-based pagination but needed for page numbers
        const skipCount = (pageNumber - 1) * pageSize;
        if (skipCount > 0) {
          let skipQuery;
          if (constraints.length > 0) {
            skipQuery = query(auditLogsCollection, ...constraints, orderBy('timestamp', 'desc'), limitQuery(skipCount));
          } else {
            skipQuery = query(auditLogsCollection, orderBy('timestamp', 'desc'), limitQuery(skipCount));
          }
          const skipSnapshot = await getDocs(skipQuery);
          if (skipSnapshot.docs.length > 0) {
            const lastVisibleDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
            paginatedQuery = query(paginatedQuery, startAfter(lastVisibleDoc));
          }
        }
      }

      const snapshot = await getDocs(paginatedQuery);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to Date
        timestamp: toDateIfTimestamp(doc.data().timestamp),
      } as AuditLog));

      const lastDocumentSnapshot = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

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
   * Helper method to create detailed change descriptions
   */
  static createChangeDetails(action: string, entityType: string, changes?: { previous?: any, new?: any }): string {
    if (!changes) {
      return `${action} ${entityType}`;
    }

    if (action === 'create') {
      return `Created ${entityType}`;
    }

    if (action === 'delete') {
      return `Deleted ${entityType}`;
    }

    if (action === 'restore') {
      return `Restored ${entityType}`;
    }

    if (action === 'edit' && changes.previous && changes.new) {
      // Use deep comparison to detect all changes, including nested objects
      const detectedChanges = deepDiff(changes.previous, changes.new);
      
      if (detectedChanges.length > 0) {
        return formatChanges(detectedChanges);
      }
    }

    return `Modified ${entityType}`;
  }
}
