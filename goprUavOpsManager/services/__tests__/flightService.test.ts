// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/FlightRepository', () => ({
  FlightRepository: {
    getFlights: jest.fn(),
    getFlight: jest.fn(),
    createFlight: jest.fn(),
    updateFlight: jest.fn(),
    deleteFlight: jest.fn(),
    getPaginatedFlights: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
    createChangeDetails: jest.fn().mockReturnValue('Flight created'),
  }
}));

jest.mock('../userService', () => ({
  UserService: {
    getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
  }
}));

import { FlightService } from '../flightService';
import { UserRole } from '@/types/UserRole';
import { TEST_ACCOUNTS, mockFlight } from './setup';
import { FlightRepository } from '@/repositories/FlightRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';

// Get references to mocked functions
const mockFlightRepository = FlightRepository as jest.Mocked<typeof FlightRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('FlightService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockFlightRepository.createFlight.mockResolvedValue('new-flight-id');
    mockFlightRepository.getFlight.mockResolvedValue(mockFlight);
    mockFlightRepository.getFlights.mockResolvedValue([mockFlight]);
    mockFlightRepository.updateFlight.mockResolvedValue(undefined);
    mockFlightRepository.getPaginatedFlights.mockResolvedValue({
      flights: [mockFlight],
      totalCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      currentPage: 1,
      totalPages: 1
    });
    mockAuditLogService.createAuditLog.mockResolvedValue('audit-log-id');
    mockAuditLogService.createChangeDetails.mockReturnValue('Flight created');
    mockUserService.getUserEmail.mockResolvedValue('test@example.com');
  });

  describe('Permission Logic Tests', () => {
    describe('getFlight access control', () => {
      test('should allow admin to access any flight', async () => {
        mockFlightRepository.getFlight.mockResolvedValue(mockFlight);
        
        const result = await FlightService.getFlight(
          'flight-123', 
          UserRole.ADMIN, 
          'different-user-id'
        );
        
        expect(result).toBeTruthy();
        expect(result?.id).toBe('flight-123');
      });

      test('should allow manager to access any flight', async () => {
        mockFlightRepository.getFlight.mockResolvedValue(mockFlight);
        
        const result = await FlightService.getFlight(
          'flight-123', 
          UserRole.MANAGER, 
          'different-user-id'
        );
        
        expect(result).toBeTruthy();
        expect(result?.id).toBe('flight-123');
      });

      test('should allow user to access their own flight', async () => {
        mockFlightRepository.getFlight.mockResolvedValue(mockFlight);
        
        const result = await FlightService.getFlight(
          'flight-123', 
          UserRole.USER, 
          TEST_ACCOUNTS.USER.uid
        );
        
        expect(result).toBeTruthy();
        expect(result?.id).toBe('flight-123');
      });

      test('should deny user access to other users flights', async () => {
        mockFlightRepository.getFlight.mockResolvedValue(mockFlight);
        
        await expect(
          FlightService.getFlight('flight-123', UserRole.USER, 'different-user-id')
        ).rejects.toThrow('Insufficient permissions to access this flight');
      });

      test('should return null for non-existent flight', async () => {
        mockFlightRepository.getFlight.mockResolvedValue(null);
        
        const result = await FlightService.getFlight(
          'non-existent', 
          UserRole.ADMIN, 
          TEST_ACCOUNTS.ADMIN.uid
        );
        
        expect(result).toBeNull();
      });
    });
  });

  describe('Business Logic Tests', () => {
    describe('getFlights', () => {
      test('should delegate to repository with correct parameters', async () => {
        const mockFlights = [mockFlight, { ...mockFlight, id: 'flight-456' }];
        mockFlightRepository.getFlights.mockResolvedValue(mockFlights);
        
        const result = await FlightService.getFlights(UserRole.USER, TEST_ACCOUNTS.USER.uid);
        
        expect(result).toHaveLength(2);
        expect(mockFlightRepository.getFlights).toHaveBeenCalledWith(
          UserRole.USER, 
          TEST_ACCOUNTS.USER.uid
        );
      });

      test('should return empty array when no flights found', async () => {
        mockFlightRepository.getFlights.mockResolvedValue([]);
        
        const result = await FlightService.getFlights(UserRole.USER, TEST_ACCOUNTS.USER.uid);
        
        expect(result).toEqual([]);
      });
    });

    describe('createFlight', () => {
      test('should create flight with user information', async () => {
        const flightData = {
          droneId: 'drone-123',
          startTime: new Date(),
          endTime: new Date(),
          duration: 60,
        };
        
        mockFlightRepository.createFlight.mockResolvedValue('new-flight-id');
        
        const result = await FlightService.createFlight(
          flightData as any,
          TEST_ACCOUNTS.USER.uid,
          TEST_ACCOUNTS.USER.email
        );
        
        expect(result).toBe('new-flight-id');
        expect(mockFlightRepository.createFlight).toHaveBeenCalledWith(
          expect.objectContaining({
            ...flightData,
            userId: TEST_ACCOUNTS.USER.uid,
            userEmail: TEST_ACCOUNTS.USER.email,
          }),
          TEST_ACCOUNTS.USER.uid
        );
      });

      test('should create audit log for flight creation', async () => {
        const flightData = {
          droneId: 'drone-123',
          startTime: new Date(),
          endTime: new Date(),
          duration: 60,
        };
        
        mockFlightRepository.createFlight.mockResolvedValue('new-flight-id');
        
        await FlightService.createFlight(
          flightData as any,
          TEST_ACCOUNTS.USER.uid,
          TEST_ACCOUNTS.USER.email
        );
        
        expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'flight',
            entityId: 'new-flight-id',
            action: 'create',
            userId: TEST_ACCOUNTS.USER.uid,
          })
        );
      });
    });
  });

  describe('Error Handling and Side Effects', () => {
    test('should handle repository errors gracefully', async () => {
      mockFlightRepository.getFlight.mockRejectedValue(new Error('Database error'));
      
      await expect(
        FlightService.getFlight('flight-123', UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid)
      ).rejects.toThrow('Database error');
    });

    test('should call UserService for email retrieval in audit log', async () => {
      const flightData = {
        droneId: 'drone-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 60,
      };
      
      mockFlightRepository.createFlight.mockResolvedValue('new-flight-id');
      
      await FlightService.createFlight(
        flightData as any,
        TEST_ACCOUNTS.USER.uid
      );
      
      expect(mockUserService.getUserEmail).toHaveBeenCalledWith(TEST_ACCOUNTS.USER.uid);
    });

    test('should handle missing userEmail parameter', async () => {
      const flightData = {
        droneId: 'drone-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 60,
      };
      
      mockFlightRepository.createFlight.mockResolvedValue('new-flight-id');
      
      await FlightService.createFlight(
        flightData as any,
        TEST_ACCOUNTS.USER.uid
        // No userEmail provided
      );
      
      expect(mockFlightRepository.createFlight).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: '',
        }),
        TEST_ACCOUNTS.USER.uid
      );
    });
  });

  describe('Role-based Access Scenarios', () => {
    test('admin@example.com should access all flights regardless of owner', async () => {
      const otherUserFlight = { ...mockFlight, userId: 'other-user-id' };
      mockFlightRepository.getFlight.mockResolvedValue(otherUserFlight);
      
      const result = await FlightService.getFlight(
        'flight-123', 
        UserRole.ADMIN, 
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(result).toBeTruthy();
      expect(result?.userId).toBe('other-user-id');
    });

    test('manager@example.com should access all flights regardless of owner', async () => {
      const otherUserFlight = { ...mockFlight, userId: 'other-user-id' };
      mockFlightRepository.getFlight.mockResolvedValue(otherUserFlight);
      
      const result = await FlightService.getFlight(
        'flight-123', 
        UserRole.MANAGER, 
        TEST_ACCOUNTS.MANAGER.uid
      );
      
      expect(result).toBeTruthy();
      expect(result?.userId).toBe('other-user-id');
    });

    test('user@example.com should only access own flights', async () => {
      const otherUserFlight = { ...mockFlight, userId: 'other-user-id' };
      mockFlightRepository.getFlight.mockResolvedValue(otherUserFlight);
      
      await expect(
        FlightService.getFlight(
          'flight-123', 
          UserRole.USER, 
          TEST_ACCOUNTS.USER.uid
        )
      ).rejects.toThrow('Insufficient permissions to access this flight');
    });

    test('should work with string role values', async () => {
      mockFlightRepository.getFlight.mockResolvedValue(mockFlight);
      
      const result = await FlightService.getFlight(
        'flight-123', 
        'admin' as UserRole, 
        'any-user-id'
      );
      
      expect(result).toBeTruthy();
    });
  });

  describe('Audit Trail Verification', () => {
    test('should include proper metadata in audit logs', async () => {
      const flightData = {
        droneId: 'drone-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 60,
      };
      
      mockFlightRepository.createFlight.mockResolvedValue('new-flight-id');
      mockUserService.getUserEmail.mockResolvedValue(TEST_ACCOUNTS.USER.email);
      
      await FlightService.createFlight(
        flightData as any,
        TEST_ACCOUNTS.USER.uid,
        TEST_ACCOUNTS.USER.email
      );
      
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'flight',
          entityId: 'new-flight-id',
          action: 'create',
          userId: TEST_ACCOUNTS.USER.uid,
          userEmail: TEST_ACCOUNTS.USER.email,
          details: 'Flight created',
        })
      );
    });
  });

  describe('updateFlight', () => {
    const existingFlight = {
      id: 'flight-1',
      droneId: 'drone-123',
      userId: TEST_ACCOUNTS.USER.uid,
      date: '2023-12-01',
      location: 'Test Location',
      flightCategory: 'A1' as const,
      operationType: 'IR' as const,
      activityType: 'Individual training' as const,
      startTime: '2023-12-01T10:00:00Z',
      endTime: '2023-12-01T11:00:00Z',
      conditions: 'Good weather'
    };

    beforeEach(() => {
      mockFlightRepository.getFlight.mockResolvedValue(existingFlight);
    });

    it('should update flight by owner', async () => {
      const updateData = { conditions: 'Updated conditions' };
      
      await FlightService.updateFlight('flight-1', updateData, UserRole.USER, TEST_ACCOUNTS.USER.uid);
      
      expect(mockFlightRepository.updateFlight).toHaveBeenCalledWith('flight-1', updateData, TEST_ACCOUNTS.USER.uid);
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'flight',
          entityId: 'flight-1',
          action: 'edit'
        })
      );
    });

    it('should allow admin to update any flight', async () => {
      const updateData = { conditions: 'Admin update' };
      
      await FlightService.updateFlight('flight-1', updateData, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);
      
      expect(mockFlightRepository.updateFlight).toHaveBeenCalledWith('flight-1', updateData, TEST_ACCOUNTS.ADMIN.uid);
    });

    it('should allow manager to update any flight', async () => {
      const updateData = { conditions: 'Manager update' };
      
      await FlightService.updateFlight('flight-1', updateData, UserRole.MANAGER, TEST_ACCOUNTS.MANAGER.uid);
      
      expect(mockFlightRepository.updateFlight).toHaveBeenCalledWith('flight-1', updateData, TEST_ACCOUNTS.MANAGER.uid);
    });

    it('should throw error when flight not found', async () => {
      mockFlightRepository.getFlight.mockResolvedValue(null);
      
      await expect(
        FlightService.updateFlight('non-existent', {}, UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid)
      ).rejects.toThrow('Failed to update flight');
    });

    it('should throw error when non-owner user tries to update', async () => {
      const otherUserFlight = { ...existingFlight, userId: 'other-user-id' };
      mockFlightRepository.getFlight.mockResolvedValue(otherUserFlight);
      
      await expect(
        FlightService.updateFlight('flight-1', {}, UserRole.USER, TEST_ACCOUNTS.USER.uid)
      ).rejects.toThrow('Failed to update flight');
    });

    it('should handle update errors gracefully', async () => {
      mockFlightRepository.updateFlight.mockRejectedValue(new Error('Update failed'));
      
      await expect(
        FlightService.updateFlight('flight-1', {}, UserRole.USER, TEST_ACCOUNTS.USER.uid)
      ).rejects.toThrow('Failed to update flight');
    });

    it('should include previous and new values in audit log', async () => {
      const updateData = { conditions: 'Updated conditions', additionalInfo: 'Updated notes' };
      
      await FlightService.updateFlight('flight-1', updateData, UserRole.USER, TEST_ACCOUNTS.USER.uid);
      
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          previousValues: existingFlight,
          newValues: { ...existingFlight, ...updateData }
        })
      );
    });
  });

  describe('getPaginatedFlights', () => {
    const mockPaginatedResponse = {
      flights: [mockFlight],
      totalCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      currentPage: 1,
      totalPages: 1
    };

    beforeEach(() => {
      mockFlightRepository.getPaginatedFlights.mockResolvedValue(mockPaginatedResponse);
    });

    it('should get paginated flights with default parameters', async () => {
      const result = await FlightService.getPaginatedFlights(UserRole.ADMIN, TEST_ACCOUNTS.ADMIN.uid);
      
      expect(mockFlightRepository.getPaginatedFlights).toHaveBeenCalledWith(
        {},
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should get paginated flights with query parameters', async () => {
      const queryParams = {
        pageSize: 10,
        pageNumber: 2,
        droneId: 'drone-123'
      };
      
      const result = await FlightService.getPaginatedFlights(
        UserRole.MANAGER, 
        TEST_ACCOUNTS.MANAGER.uid, 
        queryParams
      );
      
      expect(mockFlightRepository.getPaginatedFlights).toHaveBeenCalledWith(
        queryParams,
        UserRole.MANAGER,
        TEST_ACCOUNTS.MANAGER.uid
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle user role pagination correctly', async () => {
      await FlightService.getPaginatedFlights(UserRole.USER, TEST_ACCOUNTS.USER.uid);
      
      expect(mockFlightRepository.getPaginatedFlights).toHaveBeenCalledWith(
        {},
        UserRole.USER,
        TEST_ACCOUNTS.USER.uid
      );
    });

    it('should pass through complex query parameters', async () => {
      const complexQuery = {
        pageSize: 25,
        pageNumber: 3,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        droneId: 'drone-456',
        userId: 'specific-user'
      };
      
      await FlightService.getPaginatedFlights(
        UserRole.ADMIN, 
        TEST_ACCOUNTS.ADMIN.uid, 
        complexQuery
      );
      
      expect(mockFlightRepository.getPaginatedFlights).toHaveBeenCalledWith(
        complexQuery,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
    });
  });
});