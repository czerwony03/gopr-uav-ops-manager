import { Task, TaskTemplate, TaskQuery, TaskStatus } from '@/types/Task';
import { UserRole } from '@/types/UserRole';
import {
  getCollection,
  getDocument,
  getDocumentData,
  addDocument,
  updateDocument,
  createQuery,
  where,
  orderBy,
  getDocs,
  getDocsArray,
  timestampNow,
  and,
  or,
} from '@/utils/firebaseUtils';

export class TaskRepository {
  private static readonly TASKS_COLLECTION = 'tasks';
  private static readonly TEMPLATES_COLLECTION = 'task_templates';

  /**
   * Convert Firestore document to Task object
   */
  private static convertTaskFromFirestore(id: string, data: any): Task {
    return {
      id,
      title: data.title,
      description: data.description,
      status: data.status,
      statusUpdateText: data.statusUpdateText,
      createdBy: data.createdBy,
      assignedTo: data.assignedTo,
      selfSign: data.selfSign || false,
      droneId: data.droneId,
      procedureId: data.procedureId,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : data.startedAt,
      finishedAt: data.finishedAt?.toDate ? data.finishedAt.toDate() : data.finishedAt,
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt,
    };
  }

  /**
   * Convert Firestore document to TaskTemplate object
   */
  private static convertTemplateFromFirestore(id: string, data: any): TaskTemplate {
    return {
      id,
      title: data.title,
      description: data.description,
      selfSign: data.selfSign || false,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      isDeleted: data.isDeleted || false,
      deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt,
    };
  }

  /**
   * Get all tasks with optional filtering
   */
  static async getTasks(userRole: UserRole, query?: TaskQuery): Promise<Task[]> {
    try {
      const tasksCollection = getCollection(this.TASKS_COLLECTION);
      const conditions: any[] = [];

      // Admin can see all tasks including deleted ones
      if (userRole !== 'admin') {
        conditions.push(where('isDeleted', '==', false));
      }

      // Apply filters
      if (query?.droneId) {
        conditions.push(where('droneId', '==', query.droneId));
      }
      if (query?.procedureId) {
        conditions.push(where('procedureId', '==', query.procedureId));
      }
      if (query?.status) {
        conditions.push(where('status', '==', query.status));
      }
      if (query?.assignedTo) {
        conditions.push(where('assignedTo', '==', query.assignedTo));
      }

      // Create query with conditions
      const q = conditions.length > 0
        ? createQuery(tasksCollection, ...conditions, orderBy('createdAt', 'desc'))
        : createQuery(tasksCollection, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map((doc: any) => this.convertTaskFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  /**
   * Get unassigned tasks
   */
  static async getUnassignedTasks(userRole: UserRole): Promise<Task[]> {
    try {
      const tasksCollection = getCollection(this.TASKS_COLLECTION);
      const conditions: any[] = [];

      // Non-deleted tasks only for non-admins
      if (userRole !== 'admin') {
        conditions.push(where('isDeleted', '==', false));
      }

      // Unassigned means assignedTo is not set (null or undefined)
      // Firestore doesn't have a direct "is null" query, so we'll filter client-side
      const q = conditions.length > 0
        ? createQuery(tasksCollection, ...conditions, orderBy('createdAt', 'desc'))
        : createQuery(tasksCollection, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      const allTasks = getDocsArray(snapshot).map((doc: any) => this.convertTaskFromFirestore(doc.id, doc.data));
      
      // Filter unassigned tasks client-side
      return allTasks.filter(task => !task.assignedTo);
    } catch (error) {
      console.error('Error fetching unassigned tasks:', error);
      throw new Error('Failed to fetch unassigned tasks');
    }
  }

  /**
   * Get tasks assigned to a specific user
   */
  static async getUserTasks(userId: string, userRole: UserRole, includeFinished: boolean = false): Promise<Task[]> {
    try {
      const tasksCollection = getCollection(this.TASKS_COLLECTION);
      const conditions: any[] = [
        where('assignedTo', '==', userId),
      ];

      // Non-deleted tasks only for non-admins
      if (userRole !== 'admin') {
        conditions.push(where('isDeleted', '==', false));
      }

      const q = createQuery(tasksCollection, ...conditions, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tasks = getDocsArray(snapshot).map((doc: any) => this.convertTaskFromFirestore(doc.id, doc.data));

      // Filter by finished status if needed
      if (!includeFinished) {
        return tasks.filter(task => task.status !== 'done' && task.status !== 'not_finished');
      }
      return tasks.filter(task => task.status === 'done' || task.status === 'not_finished');
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw new Error('Failed to fetch user tasks');
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTask(id: string): Promise<Task | null> {
    try {
      const taskDoc = await getDocumentData(getDocument(this.TASKS_COLLECTION, id));
      
      if (!taskDoc.exists) {
        return null;
      }

      return this.convertTaskFromFirestore(id, taskDoc.data);
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error('Failed to fetch task');
    }
  }

  /**
   * Create a new task
   */
  static async createTask(
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    try {
      const now = timestampNow();
      const docRef = await addDocument(getCollection(this.TASKS_COLLECTION), {
        ...taskData,
        status: taskData.status || 'not_started',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(id: string, taskData: Partial<Task>, userId: string): Promise<void> {
    try {
      const taskRef = getDocument(this.TASKS_COLLECTION, id);

      await updateDocument(taskRef, {
        ...taskData,
        updatedAt: timestampNow(),
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(
    id: string,
    status: TaskStatus,
    statusUpdateText?: string
  ): Promise<void> {
    try {
      const taskRef = getDocument(this.TASKS_COLLECTION, id);
      const updateData: any = {
        status,
        statusUpdateText,
        updatedAt: timestampNow(),
      };

      // Set timestamp based on status
      if (status === 'in_progress') {
        updateData.startedAt = timestampNow();
      } else if (status === 'done' || status === 'not_finished') {
        updateData.finishedAt = timestampNow();
      }

      await updateDocument(taskRef, updateData);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw new Error('Failed to update task status');
    }
  }

  /**
   * Assign task to a user
   */
  static async assignTask(id: string, userId: string): Promise<void> {
    try {
      const taskRef = getDocument(this.TASKS_COLLECTION, id);

      await updateDocument(taskRef, {
        assignedTo: userId,
        updatedAt: timestampNow(),
      });
    } catch (error) {
      console.error('Error assigning task:', error);
      throw new Error('Failed to assign task');
    }
  }

  /**
   * Soft delete a task
   */
  static async softDeleteTask(id: string): Promise<void> {
    try {
      const taskRef = getDocument(this.TASKS_COLLECTION, id);

      await updateDocument(taskRef, {
        isDeleted: true,
        deletedAt: timestampNow(),
        updatedAt: timestampNow(),
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Restore a soft-deleted task
   */
  static async restoreTask(id: string): Promise<void> {
    try {
      const taskRef = getDocument(this.TASKS_COLLECTION, id);

      await updateDocument(taskRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: timestampNow(),
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
    try {
      const templatesCollection = getCollection(this.TEMPLATES_COLLECTION);
      let q;

      if (userRole === 'admin') {
        q = createQuery(templatesCollection, orderBy('createdAt', 'desc'));
      } else {
        q = createQuery(
          templatesCollection,
          where('isDeleted', '==', false),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return getDocsArray(snapshot).map((doc: any) => this.convertTemplateFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching task templates:', error);
      throw new Error('Failed to fetch task templates');
    }
  }

  /**
   * Get a single template by ID
   */
  static async getTemplate(id: string): Promise<TaskTemplate | null> {
    try {
      const templateDoc = await getDocumentData(getDocument(this.TEMPLATES_COLLECTION, id));
      
      if (!templateDoc.exists) {
        return null;
      }

      return this.convertTemplateFromFirestore(id, templateDoc.data);
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error('Failed to fetch template');
    }
  }

  /**
   * Create a new task template
   */
  static async createTemplate(
    templateData: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    try {
      const now = timestampNow();
      const docRef = await addDocument(getCollection(this.TEMPLATES_COLLECTION), {
        ...templateData,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(id: string, templateData: Partial<TaskTemplate>, userId: string): Promise<void> {
    try {
      const templateRef = getDocument(this.TEMPLATES_COLLECTION, id);

      await updateDocument(templateRef, {
        ...templateData,
        updatedAt: timestampNow(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  /**
   * Soft delete a template
   */
  static async softDeleteTemplate(id: string): Promise<void> {
    try {
      const templateRef = getDocument(this.TEMPLATES_COLLECTION, id);

      await updateDocument(templateRef, {
        isDeleted: true,
        deletedAt: timestampNow(),
        updatedAt: timestampNow(),
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Restore a soft-deleted template
   */
  static async restoreTemplate(id: string): Promise<void> {
    try {
      const templateRef = getDocument(this.TEMPLATES_COLLECTION, id);

      await updateDocument(templateRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: timestampNow(),
      });
    } catch (error) {
      console.error('Error restoring template:', error);
      throw new Error('Failed to restore template');
    }
  }
}
