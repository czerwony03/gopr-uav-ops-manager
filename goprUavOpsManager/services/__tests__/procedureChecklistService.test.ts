// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/ProcedureChecklistRepository', () => ({
  ProcedureChecklistRepository: {
    getProcedureChecklists: jest.fn(),
    getProcedureChecklist: jest.fn(),
    createProcedureChecklist: jest.fn(),
    updateProcedureChecklist: jest.fn(),
    softDeleteProcedureChecklist: jest.fn(),
    restoreProcedureChecklist: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
    createChangeDetails: jest.fn().mockReturnValue('Procedure checklist created'),
  }
}));

jest.mock('../userService', () => ({
  UserService: {
    getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
  }
}));

jest.mock('../imageService', () => ({
  ImageService: {
    processImages: jest.fn().mockResolvedValue([]),
    uploadImage: jest.fn().mockResolvedValue('uploaded-image-url'),
    deleteImage: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('@/utils/imageProcessing', () => ({
  ImageProcessingService: {
    processImage: jest.fn().mockResolvedValue('processed-image-url'),
  }
}));

import { ProcedureChecklistService } from '../procedureChecklistService';
import { UserRole } from '@/types/UserRole';
import { TEST_ACCOUNTS, mockProcedureChecklist } from './setup';
import { ProcedureChecklistRepository } from '@/repositories/ProcedureChecklistRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';
import { ImageService } from '../imageService';

// Get references to mocked functions
const mockProcedureChecklistRepository = ProcedureChecklistRepository as jest.Mocked<typeof ProcedureChecklistRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockImageService = ImageService as jest.Mocked<typeof ImageService>;

describe('ProcedureChecklistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
    mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockProcedureChecklist);
    mockProcedureChecklistRepository.getProcedureChecklists.mockResolvedValue([mockProcedureChecklist]);
    mockAuditLogService.createAuditLog.mockResolvedValue('audit-log-id');
    mockAuditLogService.createChangeDetails.mockReturnValue('Procedure checklist created');
    mockUserService.getUserEmail.mockResolvedValue('test@example.com');
    mockImageService.processImages.mockResolvedValue([]);
  });

  describe('Permission Logic Tests', () => {
    describe('canModifyProcedures', () => {
      test('should allow admin to modify procedures', () => {
        // Access private method through any casting for testing
        const canModify = (ProcedureChecklistService as any).canModifyProcedures(UserRole.ADMIN);
        expect(canModify).toBe(true);
      });

      test('should allow manager to modify procedures', () => {
        const canModify = (ProcedureChecklistService as any).canModifyProcedures(UserRole.MANAGER);
        expect(canModify).toBe(true);
      });

      test('should not allow user to modify procedures', () => {
        const canModify = (ProcedureChecklistService as any).canModifyProcedures(UserRole.USER);
        expect(canModify).toBe(false);
      });

      test('should handle string role values', () => {
        const canModifyAdmin = (ProcedureChecklistService as any).canModifyProcedures('admin');
        const canModifyManager = (ProcedureChecklistService as any).canModifyProcedures('manager');
        const canModifyUser = (ProcedureChecklistService as any).canModifyProcedures('user');
        
        expect(canModifyAdmin).toBe(true);
        expect(canModifyManager).toBe(true);
        expect(canModifyUser).toBe(false);
      });
    });

    describe('createProcedureChecklist access control', () => {
      test('should allow admin to create checklist', async () => {
        const formData = {
          title: 'Test Checklist',
          description: 'Test Description',
          items: [],
        };
        
        mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
        
        const result = await ProcedureChecklistService.createProcedureChecklist(
          formData as any,
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        );
        
        expect(result).toBe('new-checklist-id');
      });

      test('should allow manager to create checklist', async () => {
        const formData = {
          title: 'Test Checklist',
          description: 'Test Description',
          items: [],
        };
        
        mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
        
        const result = await ProcedureChecklistService.createProcedureChecklist(
          formData as any,
          UserRole.MANAGER,
          TEST_ACCOUNTS.MANAGER.uid
        );
        
        expect(result).toBe('new-checklist-id');
      });

      test('should deny user to create checklist', async () => {
        const formData = {
          title: 'Test Checklist',
          description: 'Test Description',
          items: [],
        };
        
        await expect(
          ProcedureChecklistService.createProcedureChecklist(
            formData as any,
            UserRole.USER,
            TEST_ACCOUNTS.USER.uid
          )
        ).rejects.toThrow('Insufficient permissions to create procedure/checklist');
      });
    });
  });

  describe('Business Logic Tests', () => {
    describe('getProcedureChecklists', () => {
      test('should delegate to repository', async () => {
        const mockChecklists = [mockProcedureChecklist];
        mockProcedureChecklistRepository.getProcedureChecklists.mockResolvedValue(mockChecklists);
        
        const result = await ProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN);
        
        expect(result).toHaveLength(1);
        expect(mockProcedureChecklistRepository.getProcedureChecklists).toHaveBeenCalledWith(UserRole.ADMIN);
      });

      test('should return empty array when no checklists found', async () => {
        mockProcedureChecklistRepository.getProcedureChecklists.mockResolvedValue([]);
        
        const result = await ProcedureChecklistService.getProcedureChecklists(UserRole.USER);
        
        expect(result).toEqual([]);
      });
    });

    describe('getProcedureChecklist', () => {
      test('should return null for non-existent checklist', async () => {
        mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(null);
        
        const result = await ProcedureChecklistService.getProcedureChecklist(
          'non-existent',
          UserRole.ADMIN
        );
        
        expect(result).toBeNull();
      });

      test('should return null for deleted checklist when user is not admin', async () => {
        const deletedChecklist = { ...mockProcedureChecklist, isDeleted: true };
        mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(deletedChecklist);
        
        const result = await ProcedureChecklistService.getProcedureChecklist(
          'checklist-123',
          UserRole.USER
        );
        
        expect(result).toBeNull();
      });

      test('should return deleted checklist when user is admin', async () => {
        const deletedChecklist = { ...mockProcedureChecklist, isDeleted: true };
        mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(deletedChecklist);
        
        const result = await ProcedureChecklistService.getProcedureChecklist(
          'checklist-123',
          UserRole.ADMIN
        );
        
        expect(result).toBeTruthy();
        expect(result?.id).toBe('checklist-123');
      });

      test('should return active checklist for any user role', async () => {
        mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockProcedureChecklist);
        
        const result = await ProcedureChecklistService.getProcedureChecklist(
          'checklist-123',
          UserRole.USER
        );
        
        expect(result).toBeTruthy();
        expect(result?.id).toBe('checklist-123');
      });
    });
  });

  describe('Error Handling and Side Effects', () => {
    test('should create audit log on successful creation', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
      };
      
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
      
      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'procedureChecklist',
          entityId: 'new-checklist-id',
          action: 'create',
          userId: TEST_ACCOUNTS.ADMIN.uid,
        })
      );
    });

    test('should handle repository errors gracefully', async () => {
      mockProcedureChecklistRepository.getProcedureChecklists.mockRejectedValue(
        new Error('Database error')
      );
      
      await expect(
        ProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN)
      ).rejects.toThrow('Database error');
    });

    test('should call UserService for email retrieval in audit log', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
      };
      
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
      
      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(mockUserService.getUserEmail).toHaveBeenCalledWith(TEST_ACCOUNTS.ADMIN.uid);
    });

    test('should process checklist items during creation', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          { id: '1', title: 'Item 1', description: 'Description 1' },
          { id: '2', title: 'Item 2', description: 'Description 2' },
        ],
      };
      
      const processedItems = [
        { id: '1', title: 'Item 1', description: 'Description 1', processed: true },
        { id: '2', title: 'Item 2', description: 'Description 2', processed: true },
      ];
      
      // Mock the private processChecklistItems method
      (ProcedureChecklistService as any).processChecklistItems = jest.fn().mockResolvedValue(processedItems);
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
      
      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect((ProcedureChecklistService as any).processChecklistItems).toHaveBeenCalledWith(formData.items);
    });
  });

  describe('Role-based Access Scenarios', () => {
    test('admin@example.com should have full access', async () => {
      mockProcedureChecklistRepository.getProcedureChecklists.mockResolvedValue([mockProcedureChecklist]);
      
      const result = await ProcedureChecklistService.getProcedureChecklists(UserRole.ADMIN);
      
      expect(result).toHaveLength(1);
      expect(mockProcedureChecklistRepository.getProcedureChecklists).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    test('manager@example.com should have modification access', async () => {
      const canModify = (ProcedureChecklistService as any).canModifyProcedures(UserRole.MANAGER);
      expect(canModify).toBe(true);
    });

    test('user@example.com should have limited access', async () => {
      const canModify = (ProcedureChecklistService as any).canModifyProcedures(UserRole.USER);
      expect(canModify).toBe(false);
      
      // But can still view active checklists
      mockProcedureChecklistRepository.getProcedureChecklists.mockResolvedValue([mockProcedureChecklist]);
      const result = await ProcedureChecklistService.getProcedureChecklists(UserRole.USER);
      expect(result).toHaveLength(1);
    });

    test('should work with string role values', async () => {
      const canModifyAdmin = (ProcedureChecklistService as any).canModifyProcedures('admin');
      const canModifyUser = (ProcedureChecklistService as any).canModifyProcedures('user');
      
      expect(canModifyAdmin).toBe(true);
      expect(canModifyUser).toBe(false);
    });
  });

  describe('Audit Trail Verification', () => {
    test('should include proper metadata in audit logs', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
      };
      
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);
      
      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      const expectedCall = expect.objectContaining({
        entityType: 'procedureChecklist',
        entityId: 'new-checklist-id',
        action: 'create',
        userId: TEST_ACCOUNTS.ADMIN.uid,
        userEmail: TEST_ACCOUNTS.ADMIN.email,
        details: expect.stringContaining('Procedure checklist created'),
      });
      
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(expectedCall);
    });
  });

  // Test updateProcedureChecklist method
  describe('Update Procedure/Checklist Tests', () => {
    it('should allow manager to update procedure/checklist', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Original Title',
        description: 'Original Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid,
        isDeleted: false
      };

      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            link: 'https://example.com',
            file: 'checklist.pdf'
          }
        ]
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.updateProcedureChecklist.mockResolvedValue(undefined);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.MANAGER.email);
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-id');
      mockAuditLogService.createChangeDetails.mockReturnValue('Updated procedure/checklist');

      await ProcedureChecklistService.updateProcedureChecklist(
        'checklist-1',
        updateData as any,
        UserRole.MANAGER,
        TEST_ACCOUNTS.MANAGER.uid
      );

      expect(mockProcedureChecklistRepository.getProcedureChecklist).toHaveBeenCalledWith('checklist-1');
      expect(mockProcedureChecklistRepository.updateProcedureChecklist).toHaveBeenCalledWith(
        'checklist-1',
        expect.objectContaining({
          title: 'Updated Title',
          description: 'Updated Description',
          updatedBy: TEST_ACCOUNTS.MANAGER.uid
        }),
        TEST_ACCOUNTS.MANAGER.uid
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'procedureChecklist',
          entityId: 'checklist-1',
          action: 'edit',
          userId: TEST_ACCOUNTS.MANAGER.uid,
          userEmail: TEST_ACCOUNTS.MANAGER.email
        })
      );
    });

    it('should deny user from updating procedure/checklist', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        items: []
      };

      await expect(
        ProcedureChecklistService.updateProcedureChecklist(
          'checklist-1',
          updateData as any,
          UserRole.USER,
          TEST_ACCOUNTS.USER.uid
        )
      ).rejects.toThrow('Insufficient permissions to update procedure/checklist');

      expect(mockProcedureChecklistRepository.updateProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should handle non-existent checklist during update', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        items: []
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(null);

      await expect(
        ProcedureChecklistService.updateProcedureChecklist(
          'non-existent',
          updateData as any,
          UserRole.MANAGER,
          TEST_ACCOUNTS.MANAGER.uid
        )
      ).rejects.toThrow('Failed to update procedure/checklist');

      expect(mockProcedureChecklistRepository.updateProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should handle repository error during update', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Original Title',
        description: 'Original Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid
      };

      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        items: []
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.updateProcedureChecklist.mockRejectedValue(new Error('Database error'));

      await expect(
        ProcedureChecklistService.updateProcedureChecklist(
          'checklist-1',
          updateData as any,
          UserRole.MANAGER,
          TEST_ACCOUNTS.MANAGER.uid
        )
      ).rejects.toThrow('Failed to update procedure/checklist');
    });
  });

  // Test softDeleteProcedureChecklist method
  describe('Soft Delete Procedure/Checklist Tests', () => {
    it('should allow admin to soft delete procedure/checklist', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid,
        isDeleted: false
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.softDeleteProcedureChecklist.mockResolvedValue(undefined);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-id');
      mockAuditLogService.createChangeDetails.mockReturnValue('Deleted procedure/checklist');

      await ProcedureChecklistService.softDeleteProcedureChecklist(
        'checklist-1',
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockProcedureChecklistRepository.getProcedureChecklist).toHaveBeenCalledWith('checklist-1');
      expect(mockProcedureChecklistRepository.softDeleteProcedureChecklist).toHaveBeenCalledWith(
        'checklist-1',
        TEST_ACCOUNTS.ADMIN.uid
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'procedureChecklist',
          entityId: 'checklist-1',
          action: 'delete',
          userId: TEST_ACCOUNTS.ADMIN.uid,
          userEmail: TEST_ACCOUNTS.ADMIN.email,
          previousValues: mockChecklist
        })
      );
    });

    it('should allow manager to soft delete procedure/checklist', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid,
        isDeleted: false
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.softDeleteProcedureChecklist.mockResolvedValue(undefined);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.MANAGER.email);

      await ProcedureChecklistService.softDeleteProcedureChecklist(
        'checklist-1',
        UserRole.MANAGER,
        TEST_ACCOUNTS.MANAGER.uid
      );

      expect(mockProcedureChecklistRepository.softDeleteProcedureChecklist).toHaveBeenCalledWith(
        'checklist-1',
        TEST_ACCOUNTS.MANAGER.uid
      );
    });

    it('should deny user from soft deleting procedure/checklist', async () => {
      await expect(
        ProcedureChecklistService.softDeleteProcedureChecklist(
          'checklist-1',
          UserRole.USER,
          TEST_ACCOUNTS.USER.uid
        )
      ).rejects.toThrow('Insufficient permissions to delete procedure/checklist');

      expect(mockProcedureChecklistRepository.softDeleteProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should handle non-existent checklist during delete', async () => {
      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(null);

      await expect(
        ProcedureChecklistService.softDeleteProcedureChecklist(
          'non-existent',
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        )
      ).rejects.toThrow('Failed to delete procedure/checklist');

      expect(mockProcedureChecklistRepository.softDeleteProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should handle repository error during delete', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.softDeleteProcedureChecklist.mockRejectedValue(new Error('Database error'));

      await expect(
        ProcedureChecklistService.softDeleteProcedureChecklist(
          'checklist-1',
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        )
      ).rejects.toThrow('Failed to delete procedure/checklist');
    });
  });

  // Test restoreProcedureChecklist method
  describe('Restore Procedure/Checklist Tests', () => {
    it('should allow admin to restore procedure/checklist', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid,
        isDeleted: true
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.restoreProcedureChecklist.mockResolvedValue(undefined);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-id');
      mockAuditLogService.createChangeDetails.mockReturnValue('Restored procedure/checklist');

      await ProcedureChecklistService.restoreProcedureChecklist(
        'checklist-1',
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockProcedureChecklistRepository.getProcedureChecklist).toHaveBeenCalledWith('checklist-1');
      expect(mockProcedureChecklistRepository.restoreProcedureChecklist).toHaveBeenCalledWith(
        'checklist-1',
        TEST_ACCOUNTS.ADMIN.uid
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'procedureChecklist',
          entityId: 'checklist-1',
          action: 'restore',
          userId: TEST_ACCOUNTS.ADMIN.uid,
          userEmail: TEST_ACCOUNTS.ADMIN.email,
          previousValues: mockChecklist
        })
      );
    });

    it('should deny manager from restoring procedure/checklist', async () => {
      await expect(
        ProcedureChecklistService.restoreProcedureChecklist(
          'checklist-1',
          UserRole.MANAGER,
          TEST_ACCOUNTS.MANAGER.uid
        )
      ).rejects.toThrow('Insufficient permissions to restore procedure/checklist');

      expect(mockProcedureChecklistRepository.restoreProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should deny user from restoring procedure/checklist', async () => {
      await expect(
        ProcedureChecklistService.restoreProcedureChecklist(
          'checklist-1',
          UserRole.USER,
          TEST_ACCOUNTS.USER.uid
        )
      ).rejects.toThrow('Insufficient permissions to restore procedure/checklist');

      expect(mockProcedureChecklistRepository.restoreProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should handle non-existent checklist during restore', async () => {
      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(null);

      await expect(
        ProcedureChecklistService.restoreProcedureChecklist(
          'non-existent',
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        )
      ).rejects.toThrow('Failed to restore procedure/checklist');

      expect(mockProcedureChecklistRepository.restoreProcedureChecklist).not.toHaveBeenCalled();
    });

    it('should handle repository error during restore', async () => {
      const mockChecklist = {
        id: 'checklist-1',
        title: 'Test Checklist',
        description: 'Test Description',
        items: [],
        createdBy: TEST_ACCOUNTS.ADMIN.uid,
        updatedBy: TEST_ACCOUNTS.ADMIN.uid
      };

      mockProcedureChecklistRepository.getProcedureChecklist.mockResolvedValue(mockChecklist);
      mockProcedureChecklistRepository.restoreProcedureChecklist.mockRejectedValue(new Error('Database error'));

      await expect(
        ProcedureChecklistService.restoreProcedureChecklist(
          'checklist-1',
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        )
      ).rejects.toThrow('Failed to restore procedure/checklist');
    });
  });

  // Test processChecklistItems method (via createProcedureChecklist)
  describe('Process Checklist Items Tests', () => {
    it('should process items with all fields correctly', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            link: 'https://example.com',
            file: 'document.pdf'
          },
          {
            id: 'item-2',
            topic: 'Equipment',
            content: 'Verify setup',
            number: 2,
            link: '',
            file: ''
          }
        ]
      };

      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-id');
      mockAuditLogService.createChangeDetails.mockReturnValue('Created procedure/checklist');

      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockProcedureChecklistRepository.createProcedureChecklist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            {
              id: 'item-1',
              topic: 'Safety',
              content: 'Check equipment',
              number: 1,
              link: 'https://example.com',
              file: 'document.pdf'
            },
            {
              id: 'item-2',
              topic: 'Equipment',
              content: 'Verify setup',
              number: 2
              // link and file should be omitted when empty
            }
          ]
        }),
        TEST_ACCOUNTS.ADMIN.uid
      );
    });

    it('should handle new image upload during item processing', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            image: 'data:image/jpeg;base64,test123'
          }
        ]
      };

      mockImageService.uploadImage.mockResolvedValue('https://example.com/uploaded-image.jpg');
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-id');

      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockImageService.uploadImage).toHaveBeenCalledWith(
        'data:image/jpeg;base64,test123',
        expect.stringMatching(/^\d+_item-1\.jpg$/),
        'procedures_checklists/images'
      );

      expect(mockProcedureChecklistRepository.createProcedureChecklist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              id: 'item-1',
              topic: 'Safety',
              content: 'Check equipment',
              number: 1,
              image: 'https://example.com/uploaded-image.jpg'
            })
          ]
        }),
        TEST_ACCOUNTS.ADMIN.uid
      );
    });

    it('should handle file URI image upload during item processing', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            image: 'file:///path/to/image.jpg'
          }
        ]
      };

      mockImageService.uploadImage.mockResolvedValue('https://example.com/uploaded-image.jpg');
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);

      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockImageService.uploadImage).toHaveBeenCalledWith(
        'file:///path/to/image.jpg',
        expect.stringMatching(/^\d+_item-1\.jpg$/),
        'procedures_checklists/images'
      );
    });

    it('should preserve existing image URLs during item processing', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            image: 'https://example.com/existing-image.jpg'
          }
        ]
      };

      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);

      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockImageService.uploadImage).not.toHaveBeenCalled();
      expect(mockProcedureChecklistRepository.createProcedureChecklist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              image: 'https://example.com/existing-image.jpg'
            })
          ]
        }),
        TEST_ACCOUNTS.ADMIN.uid
      );
    });

    it('should skip blob URLs during item processing', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            image: 'blob:http://localhost:3000/blob-id'
          }
        ]
      };

      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);

      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockImageService.uploadImage).not.toHaveBeenCalled();
      expect(mockProcedureChecklistRepository.createProcedureChecklist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              id: 'item-1',
              topic: 'Safety',
              content: 'Check equipment',
              number: 1
              // image should not be included
            })
          ]
        }),
        TEST_ACCOUNTS.ADMIN.uid
      );
    });

    it('should continue processing when image upload fails', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          {
            id: 'item-1',
            topic: 'Safety',
            content: 'Check equipment',
            number: 1,
            image: 'data:image/jpeg;base64,test123'
          }
        ]
      };

      mockImageService.uploadImage.mockRejectedValue(new Error('Upload failed'));
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('checklist-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);

      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );

      expect(mockProcedureChecklistRepository.createProcedureChecklist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              id: 'item-1',
              topic: 'Safety',
              content: 'Check equipment',
              number: 1
              // image should not be included due to upload failure
            })
          ]
        }),
        TEST_ACCOUNTS.ADMIN.uid
      );
    });
  });

  // Test image processing and validation
  describe('Image Management Tests', () => {
    it('should handle image upload correctly', async () => {
      const mockUploadImage = jest.fn().mockResolvedValue('https://example.com/uploaded-image.jpg');
      (mockImageService.uploadImage as jest.Mock) = mockUploadImage;

      const result = await ProcedureChecklistService.uploadImage('data:image/jpeg;base64,test', 'test.jpg');

      expect(result).toBe('https://example.com/uploaded-image.jpg');
      expect(mockUploadImage).toHaveBeenCalledWith('data:image/jpeg;base64,test', 'test.jpg', 'procedures_checklists/images');
    });

    it('should handle image deletion correctly', async () => {
      const mockDeleteImage = jest.fn().mockResolvedValue(undefined);
      (mockImageService.deleteImage as jest.Mock) = mockDeleteImage;

      await ProcedureChecklistService.deleteImage('https://example.com/image.jpg');

      expect(mockDeleteImage).toHaveBeenCalledWith('https://example.com/image.jpg');
    });
  });
});