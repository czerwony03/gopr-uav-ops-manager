// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/TaskRepository', () => ({
  TaskRepository: {
    getTasks: jest.fn(),
    getUnassignedTasks: jest.fn(),
    getUserTasks: jest.fn(),
    getTask: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    assignTask: jest.fn(),
    softDeleteTask: jest.fn(),
    restoreTask: jest.fn(),
    getTemplates: jest.fn(),
    getTemplate: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    softDeleteTemplate: jest.fn(),
    restoreTemplate: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
    createChangeDetails: jest.fn().mockReturnValue('Task created'),
  }
}));

jest.mock('../userService', () => ({
  UserService: {
    getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
  }
}));

import { TaskService } from '../taskService';
import { UserRole } from '@/types/UserRole';
import { Task, TaskTemplate, TaskStatus } from '@/types/Task';
import { TEST_ACCOUNTS } from './setup';
import { TaskRepository } from '@/repositories/TaskRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';

// Get references to mocked functions
const mockTaskRepository = TaskRepository as jest.Mocked<typeof TaskRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

// Mock task data
const mockTask: Task = {
  id: 'task-123',
  title: 'Test Task',
  description: 'Test Description',
  status: 'not_started',
  createdBy: TEST_ACCOUNTS.ADMIN.uid,
  selfSign: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTemplate: TaskTemplate = {
  id: 'template-123',
  title: 'Test Template',
  description: 'Test Template Description',
  selfSign: false,
  createdBy: TEST_ACCOUNTS.ADMIN.uid,
  updatedBy: TEST_ACCOUNTS.ADMIN.uid,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockTaskRepository.getTask.mockResolvedValue(mockTask);
    mockTaskRepository.getTasks.mockResolvedValue([mockTask]);
    mockTaskRepository.getUnassignedTasks.mockResolvedValue([mockTask]);
    mockTaskRepository.getUserTasks.mockResolvedValue([mockTask]);
    mockTaskRepository.createTask.mockResolvedValue('new-task-id');
    mockTaskRepository.updateTask.mockResolvedValue(undefined);
    mockTaskRepository.updateTaskStatus.mockResolvedValue(undefined);
    mockTaskRepository.assignTask.mockResolvedValue(undefined);
    mockTaskRepository.softDeleteTask.mockResolvedValue(undefined);
    mockTaskRepository.restoreTask.mockResolvedValue(undefined);
    mockTaskRepository.getTemplate.mockResolvedValue(mockTemplate);
    mockTaskRepository.getTemplates.mockResolvedValue([mockTemplate]);
    mockTaskRepository.createTemplate.mockResolvedValue('new-template-id');
    mockTaskRepository.updateTemplate.mockResolvedValue(undefined);
    mockTaskRepository.softDeleteTemplate.mockResolvedValue(undefined);
    mockTaskRepository.restoreTemplate.mockResolvedValue(undefined);
    mockAuditLogService.createAuditLog.mockResolvedValue('audit-log-id');
    mockAuditLogService.createChangeDetails.mockReturnValue('Task created');
    mockUserService.getUserEmail.mockResolvedValue('test@example.com');
  });

  describe('Permission Logic Tests', () => {
    describe('canModifyTasks', () => {
      test('should allow admin to modify tasks', () => {
        const canModify = TaskService.canModifyTasks(UserRole.ADMIN);
        expect(canModify).toBe(true);
      });

      test('should allow manager to modify tasks', () => {
        const canModify = TaskService.canModifyTasks(UserRole.MANAGER);
        expect(canModify).toBe(true);
      });

      test('should not allow user to modify tasks', () => {
        const canModify = TaskService.canModifyTasks(UserRole.USER);
        expect(canModify).toBe(false);
      });

      test('should handle string role values', () => {
        const canModifyAdmin = TaskService.canModifyTasks('admin');
        const canModifyManager = TaskService.canModifyTasks('manager');
        const canModifyUser = TaskService.canModifyTasks('user');
        
        expect(canModifyAdmin).toBe(true);
        expect(canModifyManager).toBe(true);
        expect(canModifyUser).toBe(false);
      });
    });

    describe('canViewDeletedTasks', () => {
      test('should allow admin to view deleted tasks', () => {
        const result = TaskService.canViewDeletedTasks(UserRole.ADMIN);
        expect(result).toBe(true);
      });

      test('should not allow manager to view deleted tasks', () => {
        const result = TaskService.canViewDeletedTasks(UserRole.MANAGER);
        expect(result).toBe(false);
      });

      test('should not allow user to view deleted tasks', () => {
        const result = TaskService.canViewDeletedTasks(UserRole.USER);
        expect(result).toBe(false);
      });
    });
  });

  describe('Task CRUD Operations', () => {
    describe('createTask', () => {
      test('should create task for admin', async () => {
        const formData = {
          title: 'New Task',
          description: 'New Description',
          selfSign: false,
        };

        const taskId = await TaskService.createTask(formData, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);

        expect(taskId).toBe('new-task-id');
        expect(mockTaskRepository.createTask).toHaveBeenCalled();
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'task',
            action: 'create',
          })
        );
      });

      test('should create task for manager', async () => {
        const formData = {
          title: 'New Task',
          description: 'New Description',
          selfSign: false,
        };

        const taskId = await TaskService.createTask(formData, UserRole.MANAGER, TEST_ACCOUNTS.MANAGER.uid);

        expect(taskId).toBe('new-task-id');
        expect(mockTaskRepository.createTask).toHaveBeenCalled();
      });

      test('should throw error for user trying to create task', async () => {
        const formData = {
          title: 'New Task',
          description: 'New Description',
          selfSign: false,
        };

        await expect(
          TaskService.createTask(formData, UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to create task');
      });
    });

    describe('updateTask', () => {
      test('should update task for admin', async () => {
        const formData = {
          title: 'Updated Title',
        };

        await TaskService.updateTask('task-123', formData, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);

        expect(mockTaskRepository.updateTask).toHaveBeenCalledWith(
          'task-123',
          expect.objectContaining({ title: 'Updated Title' }),
          TEST_ACCOUNTS.ADMIN.uid
        );
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
      });

      test('should throw error for user trying to update task', async () => {
        const formData = {
          title: 'Updated Title',
        };

        await expect(
          TaskService.updateTask('task-123', formData, UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to update task');
      });
    });

    describe('deleteTask', () => {
      test('should soft delete task for admin', async () => {
        await TaskService.deleteTask('task-123', UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);

        expect(mockTaskRepository.softDeleteTask).toHaveBeenCalledWith('task-123');
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'task',
            action: 'soft_delete',
          })
        );
      });

      test('should throw error for user trying to delete task', async () => {
        await expect(
          TaskService.deleteTask('task-123', UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to delete task');
      });
    });
  });

  describe('Task Status and Assignment', () => {
    describe('updateTaskStatus', () => {
      test('should allow admin to update status', async () => {
        const statusUpdate = {
          status: 'in_progress' as TaskStatus,
          statusUpdateText: 'Started working',
        };

        await TaskService.updateTaskStatus('task-123', statusUpdate, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);

        expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
          'task-123',
          'in_progress',
          'Started working'
        );
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'task',
            action: 'status_change',
          })
        );
      });

      test('should allow assigned user to update status', async () => {
        const assignedTask = { ...mockTask, assignedTo: TEST_ACCOUNTS.USER.uid };
        mockTaskRepository.getTask.mockResolvedValue(assignedTask);

        const statusUpdate = {
          status: 'done' as TaskStatus,
          statusUpdateText: 'Completed',
        };

        await TaskService.updateTaskStatus('task-123', statusUpdate, UserRole.USER, TEST_ACCOUNTS.USER.uid);

        expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalled();
      });

      test('should not allow non-assigned user to update status', async () => {
        const statusUpdate = {
          status: 'done' as TaskStatus,
        };

        await expect(
          TaskService.updateTaskStatus('task-123', statusUpdate, UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to update task status');
      });
    });

    describe('assignTask', () => {
      test('should allow admin to assign task', async () => {
        await TaskService.assignTask('task-123', TEST_ACCOUNTS.USER.uid, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);

        expect(mockTaskRepository.assignTask).toHaveBeenCalledWith('task-123', TEST_ACCOUNTS.USER.uid);
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'task',
            action: 'assign',
          })
        );
      });

      test('should throw error for user trying to assign task', async () => {
        await expect(
          TaskService.assignTask('task-123', TEST_ACCOUNTS.USER.uid, UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to assign task');
      });
    });

    describe('selfAssignTask', () => {
      test('should allow user to self-assign task with selfSign enabled', async () => {
        const selfSignTask = { ...mockTask, selfSign: true, assignedTo: undefined };
        mockTaskRepository.getTask.mockResolvedValue(selfSignTask);

        await TaskService.selfAssignTask('task-123', TEST_ACCOUNTS.USER.uid);

        expect(mockTaskRepository.assignTask).toHaveBeenCalledWith('task-123', TEST_ACCOUNTS.USER.uid);
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'task',
            action: 'self_assign',
          })
        );
      });

      test('should throw error if selfSign is disabled', async () => {
        const noSelfSignTask = { ...mockTask, selfSign: false };
        mockTaskRepository.getTask.mockResolvedValue(noSelfSignTask);

        await expect(
          TaskService.selfAssignTask('task-123', TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Self-assignment is not enabled for this task');
      });

      test('should throw error if task is already assigned', async () => {
        const assignedTask = { ...mockTask, selfSign: true, assignedTo: TEST_ACCOUNTS.ADMIN.uid };
        mockTaskRepository.getTask.mockResolvedValue(assignedTask);

        await expect(
          TaskService.selfAssignTask('task-123', TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Task is already assigned');
      });
    });
  });

  describe('Task Templates', () => {
    describe('createTemplate', () => {
      test('should create template for admin', async () => {
        const formData = {
          title: 'New Template',
          description: 'Template Description',
          selfSign: false,
        };

        const templateId = await TaskService.createTemplate(formData, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);

        expect(templateId).toBe('new-template-id');
        expect(mockTaskRepository.createTemplate).toHaveBeenCalled();
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'taskTemplate',
            action: 'create',
          })
        );
      });

      test('should throw error for user trying to create template', async () => {
        const formData = {
          title: 'New Template',
          description: 'Template Description',
          selfSign: false,
        };

        await expect(
          TaskService.createTemplate(formData, UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to create template');
      });
    });

    describe('createTaskFromTemplate', () => {
      test('should create task from template', async () => {
        const templateId = 'template-123';
        
        const taskId = await TaskService.createTaskFromTemplate(
          templateId,
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        );

        expect(taskId).toBe('new-task-id');
        expect(mockTaskRepository.getTemplate).toHaveBeenCalledWith(templateId);
        expect(mockTaskRepository.createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: mockTemplate.title,
            description: mockTemplate.description,
          }),
          TEST_ACCOUNTS.ADMIN.uid
        );
      });

      test('should create task from template with overrides', async () => {
        const templateId = 'template-123';
        const overrides = {
          title: 'Overridden Title',
          droneId: 'drone-123',
        };
        
        await TaskService.createTaskFromTemplate(
          templateId,
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid,
          overrides
        );

        expect(mockTaskRepository.createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Overridden Title',
            droneId: 'drone-123',
          }),
          TEST_ACCOUNTS.ADMIN.uid
        );
      });

      test('should throw error if template not found', async () => {
        mockTaskRepository.getTemplate.mockResolvedValue(null);

        await expect(
          TaskService.createTaskFromTemplate('invalid-id', UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid)
        ).rejects.toThrow('Template not found');
      });
    });
  });

  describe('Helper Methods', () => {
    describe('formatTaskStatus', () => {
      test('should format task statuses correctly', () => {
        expect(TaskService.formatTaskStatus('not_started')).toBe('Not Started');
        expect(TaskService.formatTaskStatus('in_progress')).toBe('In Progress');
        expect(TaskService.formatTaskStatus('done')).toBe('Done');
        expect(TaskService.formatTaskStatus('not_finished')).toBe('Not Finished');
      });
    });

    describe('getStatusColor', () => {
      test('should return correct colors for statuses', () => {
        expect(TaskService.getStatusColor('not_started')).toBe('#999');
        expect(TaskService.getStatusColor('in_progress')).toBe('#FF9800');
        expect(TaskService.getStatusColor('done')).toBe('#4CAF50');
        expect(TaskService.getStatusColor('not_finished')).toBe('#F44336');
      });
    });
  });
});
