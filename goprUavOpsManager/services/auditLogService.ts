import { 
  collection, 
  addDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit as limitQuery,
  Timestamp,
  and,
  or 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AuditLog, AuditLogData, AuditLogQuery } from '../types/AuditLog';

export class AuditLogService {
  private static readonly COLLECTION_NAME = 'auditLogs';

  /**
   * Create a new audit log entry
   */
  static async createAuditLog(auditData: AuditLogData): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...auditData,
        timestamp: now,
      });
      
      console.log(`Audit log created: ${auditData.action} on ${auditData.entityType}:${auditData.entityId} by ${auditData.userEmail || auditData.userId}`);
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
        timestamp: doc.data().timestamp?.toDate(),
      } as AuditLog));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
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
      const changedFields = [];
      
      // Compare fields to identify what changed
      for (const key in changes.new) {
        if (changes.previous[key] !== changes.new[key]) {
          // Format specific fields for better readability
          if (key === 'weight') {
            changedFields.push(`weight from ${changes.previous[key]}g to ${changes.new[key]}g`);
          } else if (key === 'maxTakeoffWeight') {
            changedFields.push(`max takeoff weight from ${changes.previous[key]}g to ${changes.new[key]}g`);
          } else if (key === 'name') {
            changedFields.push(`name from "${changes.previous[key]}" to "${changes.new[key]}"`);
          } else if (key === 'location') {
            changedFields.push(`location from "${changes.previous[key]}" to "${changes.new[key]}"`);
          } else {
            changedFields.push(`${key} from "${changes.previous[key]}" to "${changes.new[key]}"`);
          }
        }
      }

      if (changedFields.length > 0) {
        return `Changed ${changedFields.join(', ')}`;
      }
    }

    return `Modified ${entityType}`;
  }
}