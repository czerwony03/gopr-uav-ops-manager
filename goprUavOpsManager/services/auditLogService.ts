import { Platform } from 'react-native';
import { db } from '@/firebaseConfig';
import { AuditLog, AuditLogData, AuditLogQuery, PaginatedAuditLogResponse } from '@/types/AuditLog';
import { ApplicationMetadata } from '@/utils/applicationMetadata';
import { deepDiff, formatChanges } from '@/utils/deepDiff';
import {filterUndefinedProperties} from "@/utils/filterUndefinedProperties";
import {toDateIfTimestamp} from "@/utils/dateUtils";

// Platform-aware Firebase imports and helpers
let webFirestore: any;
let Timestamp: any;

if (Platform.OS === 'web') {
  // Web Firebase SDK
  const firestore = require('firebase/firestore');
  webFirestore = firestore;
  Timestamp = firestore.Timestamp;
} else {
  // React Native Firebase SDK
  const firestore = require('@react-native-firebase/firestore');
  Timestamp = firestore.default.Timestamp;
}

// Platform-aware helper functions
const getCollection = (collectionName: string) => {
  if (Platform.OS === 'web') {
    return webFirestore.collection(db, collectionName);
  } else {
    return db.collection(collectionName);
  }
};

const addDocument = async (collectionRef: any, data: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.addDoc(collectionRef, data);
  } else {
    return collectionRef.add(data);
  }
};

const createQuery = (collectionRef: any, ...constraints: any[]) => {
  if (Platform.OS === 'web') {
    return webFirestore.query(collectionRef, ...constraints);
  } else {
    // React Native Firebase uses chaining
    let query = collectionRef;
    
    for (const constraint of constraints) {
      if (constraint.type === 'where') {
        query = query.where(constraint.field, constraint.operator, constraint.value);
      } else if (constraint.type === 'orderBy') {
        query = query.orderBy(constraint.field, constraint.direction);
      } else if (constraint.type === 'limit') {
        query = query.limit(constraint.value);
      } else if (constraint.type === 'startAfter') {
        query = query.startAfter(constraint.value);
      }
    }
    
    return query;
  }
};

const where = (field: string, operator: any, value: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.where(field, operator, value);
  } else {
    return { type: 'where', field, operator, value };
  }
};

const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => {
  if (Platform.OS === 'web') {
    return webFirestore.orderBy(field, direction);
  } else {
    return { type: 'orderBy', field, direction };
  }
};

const limit = (value: number) => {
  if (Platform.OS === 'web') {
    return webFirestore.limit(value);
  } else {
    return { type: 'limit', value };
  }
};

const startAfter = (value: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.startAfter(value);
  } else {
    return { type: 'startAfter', value };
  }
};

const getDocs = async (query: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.getDocs(query);
  } else {
    return query.get();
  }
};

const getCountFromServer = async (query: any) => {
  if (Platform.OS === 'web') {
    return webFirestore.getCountFromServer(query);
  } else {
    // React Native Firebase doesn't have getCountFromServer, we need to get docs and count
    const snapshot = await query.get();
    return { data: () => ({ count: snapshot.size }) };
  }
};

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

      const collectionRef = getCollection(this.COLLECTION_NAME);
      const docRef = await addDocument(collectionRef, filterUndefinedProperties(completeAuditData));
      
      const docId = Platform.OS === 'web' ? docRef.id : docRef.id;
      console.log(`Audit log created: ${auditData.action} on ${auditData.entityType}:${auditData.entityId} by ${auditData.userEmail || auditData.userId} [${metadata.applicationPlatform} v${metadata.applicationVersion}${metadata.commitHash ? ` @${metadata.commitHash.substring(0, 7)}` : ''}]`);
      return docId;
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
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }

      if (queryParams?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
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
      
      const docs = Platform.OS === 'web' ? snapshot.docs : snapshot.docs;
      return docs.map((doc: any) => ({
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
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }

      if (queryParams?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
      }

      // Build query for counting
      const countQuery = createQuery(auditLogsCollection, ...constraints);

      // Get total count
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data().count;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build paginated query
      const paginatedConstraints = [...constraints, orderBy('timestamp', 'desc'), limit(pageSize)];

      // Apply pagination with startAfter
      if (queryParams?.lastDocumentSnapshot) {
        paginatedConstraints.push(startAfter(queryParams.lastDocumentSnapshot));
      } else if (pageNumber > 1) {
        // For page-based navigation, we need to skip to the right position
        // This is less efficient than cursor-based pagination but needed for page numbers
        const skipCount = (pageNumber - 1) * pageSize;
        if (skipCount > 0) {
          const skipConstraints = [...constraints, orderBy('timestamp', 'desc'), limit(skipCount)];
          const skipQuery = createQuery(auditLogsCollection, ...skipConstraints);
          const skipSnapshot = await getDocs(skipQuery);
          const skipDocs = Platform.OS === 'web' ? skipSnapshot.docs : skipSnapshot.docs;
          if (skipDocs.length > 0) {
            const lastVisibleDoc = skipDocs[skipDocs.length - 1];
            paginatedConstraints.push(startAfter(lastVisibleDoc));
          }
        }
      }

      const paginatedQuery = createQuery(auditLogsCollection, ...paginatedConstraints);
      const snapshot = await getDocs(paginatedQuery);
      
      const docs = Platform.OS === 'web' ? snapshot.docs : snapshot.docs;
      const logs = docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to Date
        timestamp: toDateIfTimestamp(doc.data().timestamp),
      } as AuditLog));

      const lastDocumentSnapshot = docs.length > 0 ? docs[docs.length - 1] : null;

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
