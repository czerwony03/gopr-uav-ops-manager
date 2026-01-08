import { Task, TaskTemplate, TaskFormData, TaskTemplateFormData, TaskStatusUpdate, TaskQuery, TaskStatus } from '@/types/Task';
import { UserRole } from '@/types/UserRole';
import { TaskRepository } from '@/repositories/TaskRepository';
import { AuditLogService } from './auditLogService';
import { UserService } from './userService';

export class TaskService {
  /**
   * Check if user can modify tasks (create, edit, delete, assign)
   */
  static canModifyTasks(userRole: UserRole | string): boolean {
    return userRole === UserRole.ADMIN || userRole === UserRole.MANAGER || userRole === 'admin' || userRole === 'manager';
  }

  /**
   * Check if user can view deleted tasks
   */
  static canViewDeletedTasks(userRole: UserRole | string): boolean {
    return userRole === UserRole.ADMIN || userRole === 'admin';
  }

  /**
   * Get all tasks based on user role and optional filters
   */
  static async getTasks(userRole: UserRole, query?: TaskQuery): Promise<Task[]> {
    return TaskRepository.getTasks(userRole, query);
  }

  /**
   * Get unassigned tasks (visible to all users)
   */
  static async getUnassignedTasks(userRole: UserRole): Promise<Task[]> {
    return TaskRepository.getUnassignedTasks(userRole);
  }

  /**
   * Get tasks assigned to a specific user
   * @param userId - User ID to get tasks for
   * @param userRole - Current user's role
   * @param includeFinished - If true, return only finished tasks (done/not_finished), otherwise only open tasks
   */
  static async getUserTasks(userId: string, userRole: UserRole, includeFinished: boolean = false): Promise<Task[]> {
    return TaskRepository.getUserTasks(userId, userRole, includeFinished);
  }

  /**
   * Get a single task by ID
   */
  static async getTask(id: string, userRole: UserRole): Promise<Task | null> {
    const task = await TaskRepository.getTask(id);
    
    if (!task) {
      return null;
    }

    // Check if user can access deleted tasks
    if (task.isDeleted && !this.canViewDeletedTasks(userRole)) {
      return null;
    }

    return task;
  }

  /**
   * Create a new task (admin/manager only)
   */
  static async createTask(
    formData: TaskFormData,
    userRole: UserRole,
    userId: string
  ): Promise<string> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to create task');
    }

    try {
      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description,
        status: 'not_started',
        createdBy: userId,
        assignedTo: formData.assignedTo,
        selfSign: formData.selfSign || false,
        droneId: formData.droneId,
        procedureId: formData.procedureId,
      };

      const docId = await TaskRepository.createTask(taskData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: docId,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'task'),
        newValues: { ...taskData, isDeleted: false }
      });

      return docId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  /**
   * Create a task from a template
   */
  static async createTaskFromTemplate(
    templateId: string,
    userRole: UserRole,
    userId: string,
    overrides?: Partial<TaskFormData>
  ): Promise<string> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to create task');
    }

    // Get the template
    const template = await TaskRepository.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isDeleted && !this.canViewDeletedTasks(userRole)) {
      throw new Error('Template not found');
    }

    // Create task from template with optional overrides
    const formData: TaskFormData = {
      title: overrides?.title || template.title,
      description: overrides?.description || template.description,
      selfSign: overrides?.selfSign !== undefined ? overrides.selfSign : template.selfSign || false,
      assignedTo: overrides?.assignedTo,
      droneId: overrides?.droneId,
      procedureId: overrides?.procedureId,
    };

    try {
      return await this.createTask(formData, userRole, userId);
    } catch (error) {
      console.error('Error creating task from template:', error);
      throw new Error('Failed to create task from template');
    }
  }

  /**
   * Update an existing task (admin/manager only)
   */
  static async updateTask(
    id: string,
    formData: Partial<TaskFormData>,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to update task');
    }

    try {
      // Get current task data for audit logging
      const currentTask = await TaskRepository.getTask(id);
      if (!currentTask) {
        throw new Error('Task not found');
      }

      const updateData: Partial<Task> = {};
      
      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.selfSign !== undefined) updateData.selfSign = formData.selfSign;
      if (formData.assignedTo !== undefined) updateData.assignedTo = formData.assignedTo;
      if (formData.droneId !== undefined) updateData.droneId = formData.droneId;
      if (formData.procedureId !== undefined) updateData.procedureId = formData.procedureId;

      await TaskRepository.updateTask(id, updateData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: id,
        action: 'edit',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'task'),
        previousValues: currentTask,
        newValues: updateData
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  /**
   * Update task status
   * Can be done by: admin, manager, or assigned user
   */
  static async updateTaskStatus(
    id: string,
    statusUpdate: TaskStatusUpdate,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    // Get current task
    const currentTask = await TaskRepository.getTask(id);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    // Check permissions
    const isAdminOrManager = this.canModifyTasks(userRole);
    const isAssignedUser = currentTask.assignedTo === userId;

    if (!isAdminOrManager && !isAssignedUser) {
      throw new Error('Insufficient permissions to update task status');
    }

    try {
      // Update status
      await TaskRepository.updateTaskStatus(id, statusUpdate.status, statusUpdate.statusUpdateText);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: id,
        action: 'status_change',
        userId,
        userEmail,
        details: `Task status changed from ${currentTask.status} to ${statusUpdate.status}`,
        previousValues: { status: currentTask.status, statusUpdateText: currentTask.statusUpdateText },
        newValues: { status: statusUpdate.status, statusUpdateText: statusUpdate.statusUpdateText }
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw new Error('Failed to update task status');
    }
  }

  /**
   * Assign task to a user
   * Can be done by: admin, manager
   */
  static async assignTask(
    id: string,
    assignedUserId: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to assign task');
    }

    try {
      // Get current task
      const currentTask = await TaskRepository.getTask(id);
      if (!currentTask) {
        throw new Error('Task not found');
      }

      await TaskRepository.assignTask(id, assignedUserId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: id,
        action: 'assign',
        userId,
        userEmail,
        details: `Task assigned to user ${assignedUserId}`,
        previousValues: { assignedTo: currentTask.assignedTo },
        newValues: { assignedTo: assignedUserId }
      });
    } catch (error) {
      console.error('Error assigning task:', error);
      throw new Error('Failed to assign task');
    }
  }

  /**
   * Self-assign a task (if selfSign is enabled)
   * Can be done by: any user if task has selfSign enabled
   */
  static async selfAssignTask(
    id: string,
    userId: string
  ): Promise<void> {
    // Get current task
    const currentTask = await TaskRepository.getTask(id);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    // Check if self-sign is enabled
    if (!currentTask.selfSign) {
      throw new Error('Self-assignment is not enabled for this task');
    }

    // Check if task is already assigned
    if (currentTask.assignedTo) {
      throw new Error('Task is already assigned');
    }

    try {
      await TaskRepository.assignTask(id, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: id,
        action: 'self_assign',
        userId,
        userEmail,
        details: `Task self-assigned by user`,
        previousValues: { assignedTo: null },
        newValues: { assignedTo: userId }
      });
    } catch (error) {
      console.error('Error self-assigning task:', error);
      throw new Error('Failed to self-assign task');
    }
  }

  /**
   * Soft delete a task (admin/manager only)
   */
  static async deleteTask(
    id: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to delete task');
    }

    try {
      const currentTask = await TaskRepository.getTask(id);
      if (!currentTask) {
        throw new Error('Task not found');
      }

      await TaskRepository.softDeleteTask(id);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: id,
        action: 'soft_delete',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('soft_delete', 'task'),
        previousValues: currentTask
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Restore a soft-deleted task (admin only)
   */
  static async restoreTask(
    id: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canViewDeletedTasks(userRole)) {
      throw new Error('Insufficient permissions to restore task');
    }

    try {
      const currentTask = await TaskRepository.getTask(id);
      if (!currentTask) {
        throw new Error('Task not found');
      }

      await TaskRepository.restoreTask(id);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'task',
        entityId: id,
        action: 'restore',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('restore', 'task'),
      });
    } catch (error) {
      console.error('Error restoring task:', error);
      throw new Error('Failed to restore task');
    }
  }

  // ==================== Task Templates ====================

  /**
   * Get all task templates
   */
  static async getTemplates(userRole: UserRole): Promise<TaskTemplate[]> {
    return TaskRepository.getTemplates(userRole);
  }

  /**
   * Get a single template by ID
   */
  static async getTemplate(id: string, userRole: UserRole): Promise<TaskTemplate | null> {
    const template = await TaskRepository.getTemplate(id);
    
    if (!template) {
      return null;
    }

    // Check if user can access deleted templates
    if (template.isDeleted && !this.canViewDeletedTasks(userRole)) {
      return null;
    }

    return template;
  }

  /**
   * Create a new task template (admin/manager only)
   */
  static async createTemplate(
    formData: TaskTemplateFormData,
    userRole: UserRole,
    userId: string
  ): Promise<string> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to create template');
    }

    try {
      const templateData: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description,
        selfSign: formData.selfSign || false,
        createdBy: userId,
        updatedBy: userId,
      };

      const docId = await TaskRepository.createTemplate(templateData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'taskTemplate',
        entityId: docId,
        action: 'create',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'task template'),
        newValues: { ...templateData, isDeleted: false }
      });

      return docId;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  /**
   * Update an existing template (admin/manager only)
   */
  static async updateTemplate(
    id: string,
    formData: Partial<TaskTemplateFormData>,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to update template');
    }

    try {
      // Get current template data for audit logging
      const currentTemplate = await TaskRepository.getTemplate(id);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      const updateData: Partial<TaskTemplate> = {};
      
      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.selfSign !== undefined) updateData.selfSign = formData.selfSign;

      await TaskRepository.updateTemplate(id, updateData, userId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'taskTemplate',
        entityId: id,
        action: 'edit',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'task template'),
        previousValues: currentTemplate,
        newValues: updateData
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  /**
   * Soft delete a template (admin/manager only)
   */
  static async deleteTemplate(
    id: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canModifyTasks(userRole)) {
      throw new Error('Insufficient permissions to delete template');
    }

    try {
      const currentTemplate = await TaskRepository.getTemplate(id);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      await TaskRepository.softDeleteTemplate(id);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'taskTemplate',
        entityId: id,
        action: 'soft_delete',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('soft_delete', 'task template'),
        previousValues: currentTemplate
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Restore a soft-deleted template (admin only)
   */
  static async restoreTemplate(
    id: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    if (!this.canViewDeletedTasks(userRole)) {
      throw new Error('Insufficient permissions to restore template');
    }

    try {
      const currentTemplate = await TaskRepository.getTemplate(id);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      await TaskRepository.restoreTemplate(id);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(userId);
      await AuditLogService.createAuditLog({
        entityType: 'taskTemplate',
        entityId: id,
        action: 'restore',
        userId,
        userEmail,
        details: AuditLogService.createChangeDetails('restore', 'task template'),
      });
    } catch (error) {
      console.error('Error restoring template:', error);
      throw new Error('Failed to restore template');
    }
  }

  /**
   * Helper to format task status for display
   */
  static formatTaskStatus(status: TaskStatus): string {
    const statusMap: Record<TaskStatus, string> = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      done: 'Done',
      not_finished: 'Not Finished',
    };
    return statusMap[status] || status;
  }

  /**
   * Helper to get status color
   */
  static getStatusColor(status: TaskStatus): string {
    const colorMap: Record<TaskStatus, string> = {
      not_started: '#999', // Gray
      in_progress: '#FF9800', // Orange
      done: '#4CAF50', // Green
      not_finished: '#F44336', // Red
    };
    return colorMap[status] || '#999';
  }
}
