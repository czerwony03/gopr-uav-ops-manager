// Entity types that can be audited
export type AuditEntityType = 'drone' | 'flight' | 'procedureChecklist' | 'user' | 'category' | 'droneComment' | 'droneClaim' | 'task' | 'taskTemplate';

// Actions that can be performed on entities
export type AuditAction = 'create' | 'edit' | 'delete' | 'restore' | 'view' | 'login' | 'soft_delete' | 'update' | 'hide' | 'release' | 'admin_override' | 'admin_override_end' | 'admin_override_create' | 'execute_start' | 'execute_finish' | 'assign' | 'status_change' | 'self_assign';

// Application platforms
export type ApplicationPlatform = 'web' | 'ios' | 'android';

// Main audit log interface
export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string; // Firebase Auth UID
  userEmail?: string; // User email for easier identification
  timestamp: Date;
  details?: string; // Human-readable description of what changed
  previousValues?: Record<string, any>; // Previous values for edit operations
  newValues?: Record<string, any>; // New values for edit operations
  applicationPlatform: ApplicationPlatform; // Platform where the action was performed
  applicationVersion: string; // Application version from app.json
  commitHash?: string; // Git commit hash if available
}

// Form data for creating audit logs
export interface AuditLogData {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string;
  userEmail?: string;
  details?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  applicationPlatform: ApplicationPlatform;
  applicationVersion: string;
  commitHash?: string;
}

// Query parameters for fetching audit logs
export interface AuditLogQuery {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  pageSize?: number;
  pageNumber?: number;
  lastDocumentSnapshot?: any; // Firestore DocumentSnapshot for pagination
}

// Paginated audit log response
export interface PaginatedAuditLogResponse {
  logs: AuditLog[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
  lastDocumentSnapshot?: any;
}
