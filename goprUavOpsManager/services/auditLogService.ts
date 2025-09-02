import { AuditLog, AuditLogData, AuditLogQuery, PaginatedAuditLogResponse } from '@/types/AuditLog';
import { ApplicationMetadata } from '@/utils/applicationMetadata';
import { deepDiff, formatChanges } from '@/utils/deepDiff';
import {AuditLogRepository} from '@/repositories/AuditLogRepository';

export class AuditLogService {
  /**
   * Create a new audit log entry
   */
  static async createAuditLog(auditData: Omit<AuditLogData, 'applicationPlatform' | 'applicationVersion' | 'commitHash'>): Promise<string> {
    try {
      const metadata = ApplicationMetadata.getMetadata();
      
      const completeAuditData = {
        ...auditData,
        ...metadata,
      };

      const docId = await AuditLogRepository.createAuditLog(completeAuditData);
      
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
    return AuditLogRepository.getAuditLogs(queryParams);
  }

  /**
   * Get paginated audit logs with filtering and total count
   */
  static async getPaginatedAuditLogs(queryParams?: AuditLogQuery): Promise<PaginatedAuditLogResponse> {
    return AuditLogRepository.getPaginatedAuditLogs(queryParams);
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(entityType: string, entityId: string, limit: number = 50): Promise<AuditLog[]> {
    return AuditLogRepository.getEntityAuditLogs(entityType, entityId, limit);
  }

  /**
   * Get recent audit logs (last 100 by default)
   */
  static async getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return AuditLogRepository.getRecentAuditLogs(limit);
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
