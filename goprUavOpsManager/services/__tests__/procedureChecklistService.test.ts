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

  describe('Integration with Image Processing', () => {
    test('should handle checklists with image items', async () => {
      const formData = {
        title: 'Test Checklist',
        description: 'Test Description',
        items: [
          { 
            id: '1', 
            title: 'Item with image', 
            description: 'Description', 
            image: 'base64-image-data' 
          },
        ],
      };
      
      // Mock processChecklistItems to simulate image processing
      const processedItems = [
        { 
          id: '1', 
          title: 'Item with image', 
          description: 'Description', 
          imageUrl: 'https://storage.example.com/processed-image.jpg' 
        },
      ];
      
      (ProcedureChecklistService as any).processChecklistItems = jest.fn().mockResolvedValue(processedItems);
      mockProcedureChecklistRepository.createProcedureChecklist.mockResolvedValue('new-checklist-id');
      
      await ProcedureChecklistService.createProcedureChecklist(
        formData as any,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(mockProcedureChecklistRepository.createProcedureChecklist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: processedItems,
        }),
        TEST_ACCOUNTS.ADMIN.uid
      );
    });
  });
});