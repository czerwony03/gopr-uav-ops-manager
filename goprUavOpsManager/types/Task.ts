// Task status enumeration
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'not_finished';

// Main Task interface
export interface Task {
  id: string;
  title: string;
  description: string;
  
  // Status and workflow
  status: TaskStatus;
  statusUpdateText?: string; // Text field for status updates, editable by assigned user or admin/manager
  
  // Assignment
  createdBy: string; // user ID of creator (admin/manager)
  assignedTo?: string; // user ID of assigned user (optional, can be assigned later)
  selfSign?: boolean; // if true, any user can assign the task to themselves
  
  // Relationships
  droneId?: string; // optional: attached to a drone
  procedureId?: string; // optional: attached to a procedure/checklist
  
  // Timestamps for status changes
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date; // when status changed to in_progress
  finishedAt?: Date; // when status changed to done or not_finished
  
  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
}

// Task template for common tasks
export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  selfSign?: boolean; // default self-sign setting for tasks created from this template
  
  // Metadata
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

// Form data interface for task creation/editing
export interface TaskFormData {
  title: string;
  description: string;
  selfSign: boolean;
  assignedTo?: string;
  droneId?: string;
  procedureId?: string;
}

// Form data interface for template creation/editing
export interface TaskTemplateFormData {
  title: string;
  description: string;
  selfSign: boolean;
}

// Status update data
export interface TaskStatusUpdate {
  status: TaskStatus;
  statusUpdateText?: string;
}

// Task filter types for views
export type TaskFilter = 'all' | 'unassigned' | 'my_open' | 'my_finished';

// Task query parameters
export interface TaskQuery {
  filter?: TaskFilter;
  userId?: string;
  droneId?: string;
  procedureId?: string;
  status?: TaskStatus;
  assignedTo?: string;
}
