import { DroneClaimService } from '../droneClaimService';
import { DroneClaimRepository } from '@/repositories/DroneClaimRepository';
import { DroneRepository } from '@/repositories/DroneRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';
import { UserRole } from '@/types/UserRole';
import { DroneClaim } from '@/types/DroneClaim';
import { Drone } from '@/types/Drone';

// Mock all dependencies
jest.mock('@/repositories/DroneClaimRepository');
jest.mock('@/repositories/DroneRepository');
jest.mock('../auditLogService');
jest.mock('../userService');

const mockDroneClaimRepository = DroneClaimRepository as jest.Mocked<typeof DroneClaimRepository>;
const mockDroneRepository = DroneRepository as jest.Mocked<typeof DroneRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('DroneClaimService', () => {
  const TEST_ACCOUNTS = {
    USER: { uid: 'user-123', email: 'user@test.com' },
    ADMIN: { uid: 'admin-123', email: 'admin@test.com' }
  };

  const mockDrone: Drone = {
    id: 'drone-123',
    name: 'Test Drone',
    inventoryCode: 'TD001',
    location: 'Test Location',
    registrationNumber: 'REG123',
    totalFlightTime: 100,
    equipmentRegistrationNumber: 'EQ123',
    yearOfCommissioning: 2023,
    yearOfManufacture: 2022,
    insurance: '2025-12-31',
    callSign: 'TD1',
    weight: 2000,
    maxTakeoffWeight: 3000,
    operatingTime: 120,
    range: 5000,
    dimensions: { length: 400, width: 300, height: 150 },
    battery: { type: 'LiPo', capacity: 5000, voltage: 14.8 },
    maxSpeed: 60,
    shareable: true,
    isDeleted: false
  };

  const mockClaim: DroneClaim = {
    id: 'claim-123',
    droneId: 'drone-123',
    userId: TEST_ACCOUNTS.USER.uid,
    userEmail: TEST_ACCOUNTS.USER.email,
    startTime: new Date('2024-01-01T10:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    createdBy: TEST_ACCOUNTS.USER.uid
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('claimDrone', () => {
    beforeEach(() => {
      mockDroneRepository.getDrone.mockResolvedValue(mockDrone);
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(null);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.USER.email);
      mockDroneClaimRepository.createClaim.mockResolvedValue('claim-123');
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-123');
    });

    it('should allow user to claim shareable drone', async () => {
      const claimId = await DroneClaimService.claimDrone(
        'drone-123',
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER,
        TEST_ACCOUNTS.USER.email
      );

      expect(claimId).toBe('claim-123');
      expect(mockDroneRepository.getDrone).toHaveBeenCalledWith('drone-123');
      expect(mockDroneClaimRepository.getActiveClaim).toHaveBeenCalledWith('drone-123');
      expect(mockDroneClaimRepository.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          droneId: 'drone-123',
          userId: TEST_ACCOUNTS.USER.uid,
          userEmail: TEST_ACCOUNTS.USER.email
        }),
        TEST_ACCOUNTS.USER.uid
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should reject claim for non-shareable drone', async () => {
      mockDroneRepository.getDrone.mockResolvedValue({
        ...mockDrone,
        shareable: false
      });

      await expect(
        DroneClaimService.claimDrone(
          'drone-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('This drone is not shareable');
    });

    it('should reject claim if drone already claimed', async () => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(mockClaim);

      await expect(
        DroneClaimService.claimDrone(
          'drone-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('Drone is already claimed by another user');
    });

    it('should reject claim for deleted drone', async () => {
      mockDroneRepository.getDrone.mockResolvedValue({
        ...mockDrone,
        isDeleted: true
      });

      await expect(
        DroneClaimService.claimDrone(
          'drone-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('Cannot claim a deleted drone');
    });

    it('should reject claim for non-existent drone', async () => {
      mockDroneRepository.getDrone.mockResolvedValue(null);

      await expect(
        DroneClaimService.claimDrone(
          'drone-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('Drone not found');
    });
  });

  describe('releaseClaim', () => {
    beforeEach(() => {
      mockDroneClaimRepository.getClaim.mockResolvedValue(mockClaim);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.USER.email);
      mockDroneClaimRepository.updateClaim.mockResolvedValue();
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-123');
    });

    it('should allow user to release their own claim', async () => {
      await DroneClaimService.releaseClaim(
        'claim-123',
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER,
        TEST_ACCOUNTS.USER.email
      );

      expect(mockDroneClaimRepository.updateClaim).toHaveBeenCalledWith(
        'claim-123',
        expect.objectContaining({ endTime: expect.any(Date) }),
        TEST_ACCOUNTS.USER.uid
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'release' })
      );
    });

    it('should allow admin to release any claim', async () => {
      await DroneClaimService.releaseClaim(
        'claim-123',
        TEST_ACCOUNTS.ADMIN.uid,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.email
      );

      expect(mockDroneClaimRepository.updateClaim).toHaveBeenCalled();
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin_override' })
      );
    });

    it('should reject release for non-owner user', async () => {
      await expect(
        DroneClaimService.releaseClaim(
          'claim-123',
          'other-user-id',
          UserRole.USER
        )
      ).rejects.toThrow('You can only release your own claims');
    });

    it('should reject release for already released claim', async () => {
      mockDroneClaimRepository.getClaim.mockResolvedValue({
        ...mockClaim,
        endTime: new Date()
      });

      await expect(
        DroneClaimService.releaseClaim(
          'claim-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('Claim is already released');
    });

    it('should reject release for non-existent claim', async () => {
      mockDroneClaimRepository.getClaim.mockResolvedValue(null);

      await expect(
        DroneClaimService.releaseClaim(
          'claim-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('Claim not found');
    });
  });

  describe('adminOverrideClaim', () => {
    beforeEach(() => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(mockClaim);
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.ADMIN.email);
      mockDroneClaimRepository.updateClaim.mockResolvedValue();
      mockDroneClaimRepository.createClaim.mockResolvedValue('new-claim-123');
      mockAuditLogService.createAuditLog.mockResolvedValue('audit-123');
    });

    it('should allow admin to override claim', async () => {
      const newClaimId = await DroneClaimService.adminOverrideClaim(
        'drone-123',
        'new-user-123',
        TEST_ACCOUNTS.ADMIN.uid,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.email
      );

      expect(newClaimId).toBe('new-claim-123');
      expect(mockDroneClaimRepository.updateClaim).toHaveBeenCalledWith(
        'claim-123',
        expect.objectContaining({ endTime: expect.any(Date) }),
        TEST_ACCOUNTS.ADMIN.uid
      );
      expect(mockDroneClaimRepository.createClaim).toHaveBeenCalled();
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledTimes(2);
    });

    it('should allow manager to override claim', async () => {
      const MANAGER_ACCOUNT = { uid: 'manager-123', email: 'manager@test.com' };
      
      const newClaimId = await DroneClaimService.adminOverrideClaim(
        'drone-123',
        'new-user-123',
        MANAGER_ACCOUNT.uid,
        UserRole.MANAGER,
        MANAGER_ACCOUNT.email
      );

      expect(newClaimId).toBe('new-claim-123');
      expect(mockDroneClaimRepository.updateClaim).toHaveBeenCalledWith(
        'claim-123',
        expect.objectContaining({ endTime: expect.any(Date) }),
        MANAGER_ACCOUNT.uid
      );
      expect(mockDroneClaimRepository.createClaim).toHaveBeenCalled();
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledTimes(2);
    });

    it('should reject override for non-admin/manager user', async () => {
      await expect(
        DroneClaimService.adminOverrideClaim(
          'drone-123',
          'new-user-123',
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER
        )
      ).rejects.toThrow('Insufficient permissions to override claims');
    });

    it('should handle case with no active claim', async () => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(null);

      const newClaimId = await DroneClaimService.adminOverrideClaim(
        'drone-123',
        'new-user-123',
        TEST_ACCOUNTS.ADMIN.uid,
        UserRole.ADMIN
      );

      expect(newClaimId).toBe('new-claim-123');
      expect(mockDroneClaimRepository.updateClaim).not.toHaveBeenCalled();
      expect(mockDroneClaimRepository.createClaim).toHaveBeenCalled();
    });
  });

  describe('getActiveClaim', () => {
    it('should get active claim for drone', async () => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(mockClaim);

      const result = await DroneClaimService.getActiveClaim('drone-123');

      expect(result).toBe(mockClaim);
      expect(mockDroneClaimRepository.getActiveClaim).toHaveBeenCalledWith('drone-123');
    });
  });

  describe('formatClaimDuration', () => {
    it('should format duration in minutes', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T10:30:00Z');

      const result = DroneClaimService.formatClaimDuration(start, end);

      expect(result).toBe('30m');
    });

    it('should format duration in hours and minutes', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T12:30:00Z');

      const result = DroneClaimService.formatClaimDuration(start, end);

      expect(result).toBe('2h 30m');
    });

    it('should format duration in days and hours', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-03T12:00:00Z');

      const result = DroneClaimService.formatClaimDuration(start, end);

      expect(result).toBe('2d 2h');
    });

    it('should use current time if no end time provided', () => {
      const start = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const result = DroneClaimService.formatClaimDuration(start);

      expect(result).toMatch(/\d+m/);
    });
  });

  describe('canModifyClaim', () => {
    it('should allow claim owner to modify', () => {
      const result = DroneClaimService.canModifyClaim(
        mockClaim,
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER
      );

      expect(result).toBe(true);
    });

    it('should allow admin to modify any claim', () => {
      const result = DroneClaimService.canModifyClaim(
        mockClaim,
        TEST_ACCOUNTS.ADMIN.uid,
        UserRole.ADMIN
      );

      expect(result).toBe(true);
    });

    it('should allow manager to modify any claim', () => {
      const result = DroneClaimService.canModifyClaim(
        mockClaim,
        'manager-123',
        UserRole.MANAGER
      );

      expect(result).toBe(true);
    });

    it('should not allow other users to modify claim', () => {
      const result = DroneClaimService.canModifyClaim(
        mockClaim,
        'other-user-id',
        UserRole.USER
      );

      expect(result).toBe(false);
    });
  });

  describe('isDroneClaimable', () => {
    beforeEach(() => {
      mockDroneRepository.getDrone.mockResolvedValue(mockDrone);
    });

    it('should return true for claimable drone', async () => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(null);

      const result = await DroneClaimService.isDroneClaimable(
        'drone-123',
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER
      );

      expect(result).toBe(true);
    });

    it('should return false for non-shareable drone', async () => {
      mockDroneRepository.getDrone.mockResolvedValue({
        ...mockDrone,
        shareable: false
      });

      const result = await DroneClaimService.isDroneClaimable(
        'drone-123',
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER
      );

      expect(result).toBe(false);
    });

    it('should return false for already claimed drone', async () => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue({
        ...mockClaim,
        userId: 'other-user-id'
      });

      const result = await DroneClaimService.isDroneClaimable(
        'drone-123',
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER
      );

      expect(result).toBe(false);
    });

    it('should return true if user already owns the claim', async () => {
      mockDroneClaimRepository.getActiveClaim.mockResolvedValue(mockClaim);

      const result = await DroneClaimService.isDroneClaimable(
        'drone-123',
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER
      );

      expect(result).toBe(true);
    });
  });
});