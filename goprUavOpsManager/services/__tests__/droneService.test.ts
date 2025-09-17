// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/DroneRepository', () => ({
  DroneRepository: {
    getDrones: jest.fn(),
    getDrone: jest.fn(),
    createDrone: jest.fn(),
    updateDrone: jest.fn(),
    deleteDrone: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
    createChangeDetails: jest.fn().mockReturnValue('Drone created'),
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
  }
}));

import { DroneService } from '../droneService';
import { UserRole } from '@/types/UserRole';
import { TEST_ACCOUNTS, mockDrone } from './setup';
import { DroneRepository } from '@/repositories/DroneRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';
import { ImageService } from '../imageService';

// Get references to mocked functions
const mockDroneRepository = DroneRepository as jest.Mocked<typeof DroneRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockImageService = ImageService as jest.Mocked<typeof ImageService>;

describe('DroneService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockDroneRepository.createDrone.mockResolvedValue('new-drone-id');
    mockDroneRepository.getDrone.mockResolvedValue(mockDrone);
    mockDroneRepository.getDrones.mockResolvedValue([mockDrone]);
    mockAuditLogService.createAuditLog.mockResolvedValue('audit-log-id');
    mockAuditLogService.createChangeDetails.mockReturnValue('Drone created');
    mockUserService.getUserEmail.mockResolvedValue('test@example.com');
    mockImageService.processImages.mockResolvedValue([]);
  });

  describe('Permission Logic Tests', () => {
    describe('canModifyDrones', () => {
      test('should allow admin to modify drones', () => {
        // Access private method through any casting for testing
        const canModify = (DroneService as any).canModifyDrones(UserRole.ADMIN);
        expect(canModify).toBe(true);
      });

      test('should allow manager to modify drones', () => {
        const canModify = (DroneService as any).canModifyDrones(UserRole.MANAGER);
        expect(canModify).toBe(true);
      });

      test('should not allow user to modify drones', () => {
        const canModify = (DroneService as any).canModifyDrones(UserRole.USER);
        expect(canModify).toBe(false);
      });

      test('should handle string role values', () => {
        const canModifyAdmin = (DroneService as any).canModifyDrones('admin');
        const canModifyManager = (DroneService as any).canModifyDrones('manager');
        const canModifyUser = (DroneService as any).canModifyDrones('user');
        
        expect(canModifyAdmin).toBe(true);
        expect(canModifyManager).toBe(true);
        expect(canModifyUser).toBe(false);
      });
    });

    describe('canViewDeletedDrones', () => {
      test('should allow admin to view deleted drones', () => {
        const result = DroneService.canViewDeletedDrones(UserRole.ADMIN);
        expect(result).toBe(true);
      });

      test('should not allow manager to view deleted drones', () => {
        const result = DroneService.canViewDeletedDrones(UserRole.MANAGER);
        expect(result).toBe(false);
      });

      test('should not allow user to view deleted drones', () => {
        const result = DroneService.canViewDeletedDrones(UserRole.USER);
        expect(result).toBe(false);
      });

      test('should handle string role values', () => {
        const adminResult = DroneService.canViewDeletedDrones('admin' as UserRole);
        const managerResult = DroneService.canViewDeletedDrones('manager' as UserRole);
        const userResult = DroneService.canViewDeletedDrones('user' as UserRole);
        
        expect(adminResult).toBe(true);
        expect(managerResult).toBe(false);
        expect(userResult).toBe(false);
      });
    });
  });

  describe('Business Logic Tests', () => {
    describe('formatFlightTime', () => {
      test('should format minutes less than 60', () => {
        expect(DroneService.formatFlightTime(30)).toBe('30min');
        expect(DroneService.formatFlightTime(59)).toBe('59min');
        expect(DroneService.formatFlightTime(1)).toBe('1min');
      });

      test('should format exact hours', () => {
        expect(DroneService.formatFlightTime(60)).toBe('1h');
        expect(DroneService.formatFlightTime(120)).toBe('2h');
        expect(DroneService.formatFlightTime(180)).toBe('3h');
      });

      test('should format hours with remaining minutes', () => {
        expect(DroneService.formatFlightTime(90)).toBe('1h 30min');
        expect(DroneService.formatFlightTime(125)).toBe('2h 5min');
        expect(DroneService.formatFlightTime(241)).toBe('4h 1min');
      });

      test('should handle zero minutes', () => {
        expect(DroneService.formatFlightTime(0)).toBe('0min');
      });

      test('should handle large values', () => {
        expect(DroneService.formatFlightTime(1440)).toBe('24h'); // 24 hours
        expect(DroneService.formatFlightTime(1441)).toBe('24h 1min'); // 24 hours 1 minute
      });
    });
  });

  describe('Error Handling and Access Control', () => {
    describe('getDrone', () => {
      test('should return null for non-existent drone', async () => {
        mockDroneRepository.getDrone.mockResolvedValue(null);
        
        const result = await DroneService.getDrone('non-existent', UserRole.ADMIN);
        
        expect(result).toBeNull();
        expect(mockDroneRepository.getDrone).toHaveBeenCalledWith('non-existent');
      });

      test('should return null for deleted drone when user is not admin', async () => {
        const deletedDrone = { ...mockDrone, isDeleted: true };
        mockDroneRepository.getDrone.mockResolvedValue(deletedDrone);
        
        const result = await DroneService.getDrone('drone-123', UserRole.USER);
        
        expect(result).toBeNull();
      });

      test('should return deleted drone when user is admin', async () => {
        const deletedDrone = { ...mockDrone, isDeleted: true };
        mockDroneRepository.getDrone.mockResolvedValue(deletedDrone);
        
        const result = await DroneService.getDrone('drone-123', UserRole.ADMIN);
        
        expect(result).toBeTruthy();
        expect(result?.id).toBe('drone-123');
      });
    });

    describe('createDrone', () => {
      test('should throw error when user lacks permissions', async () => {
        const droneData = {
          serialNumber: 'SN123',
          model: 'Test Model',
        };

        await expect(
          DroneService.createDrone(droneData as any, UserRole.USER, TEST_ACCOUNTS.USER.uid)
        ).rejects.toThrow('Insufficient permissions to create drone');
      });

      test('should create audit log on successful creation', async () => {
        const droneData = {
          serialNumber: 'SN123',
          model: 'Test Model',
          images: [],
        };
        
        mockDroneRepository.createDrone.mockResolvedValue('new-drone-id');
        
        await DroneService.createDrone(droneData as any, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);
        
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'drone',
            entityId: 'new-drone-id',
            action: 'create',
            userId: TEST_ACCOUNTS.ADMIN.uid,
          })
        );
      });
    });
  });

  describe('Integration with External Services', () => {
    test('should call UserService for email when creating audit log', async () => {
      const droneData = {
        serialNumber: 'SN123',
        model: 'Test Model',
        images: [],
      };
      
      mockDroneRepository.createDrone.mockResolvedValue('new-drone-id');
      
      await DroneService.createDrone(droneData as any, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);
      
      expect(mockUserService.getUserEmail).toHaveBeenCalledWith(TEST_ACCOUNTS.ADMIN.uid);
    });

    test('should process images when creating drone with images', async () => {
      const droneData = {
        serialNumber: 'SN123',
        model: 'Test Model',
        images: ['image1.jpg', 'image2.jpg'],
      };
      
      mockDroneRepository.createDrone.mockResolvedValue('new-drone-id');
      mockImageService.processImages.mockResolvedValue(['processed1.jpg', 'processed2.jpg']);
      
      await DroneService.createDrone(droneData as any, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);
      
      expect(mockImageService.processImages).toHaveBeenCalledWith(
        ['image1.jpg', 'image2.jpg'],
        'drones/images',
        expect.stringContaining('temp_')
      );
    });
  });

  describe('Role-based Access Scenarios', () => {
    test('admin@example.com should have full access', async () => {
      mockDroneRepository.getDrones.mockResolvedValue([mockDrone]);
      
      const result = await DroneService.getDrones(UserRole.ADMIN);
      
      expect(result).toHaveLength(1);
      expect(mockDroneRepository.getDrones).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    test('manager@example.com should have modification access', () => {
      const canModify = (DroneService as any).canModifyDrones(UserRole.MANAGER);
      expect(canModify).toBe(true);
    });

    test('user@example.com should have limited access', () => {
      const canModify = (DroneService as any).canModifyDrones(UserRole.USER);
      const canViewDeleted = DroneService.canViewDeletedDrones(UserRole.USER);
      
      expect(canModify).toBe(false);
      expect(canViewDeleted).toBe(false);
    });
  });
});