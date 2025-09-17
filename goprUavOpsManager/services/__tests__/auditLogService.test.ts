// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/AuditLogRepository', () => ({
  AuditLogRepository: {
    createAuditLog: jest.fn(),
    getAuditLogs: jest.fn(),
    getPaginatedAuditLogs: jest.fn(),
    getEntityAuditLogs: jest.fn(),
    getRecentAuditLogs: jest.fn(),
  }
}));

jest.mock('@/utils/applicationMetadata', () => ({
  ApplicationMetadata: {
    getMetadata: jest.fn().mockReturnValue({
      applicationPlatform: 'web',
      applicationVersion: '1.0.0',
      commitHash: 'abc123def456',
    }),
  }
}));

jest.mock('@/utils/deepDiff', () => ({
  deepDiff: jest.fn().mockReturnValue([]), // Return empty array by default
  formatChanges: jest.fn().mockReturnValue('Mock formatted changes'),
}));

import { AuditLogService } from '../auditLogService';
import { TEST_ACCOUNTS } from './setup';
import { AuditLogData } from '@/types/AuditLog';
import { AuditLogRepository } from '@/repositories/AuditLogRepository';
import { ApplicationMetadata } from '@/utils/applicationMetadata';
import { deepDiff, formatChanges } from '@/utils/deepDiff';

// Get references to mocked functions
const mockAuditLogRepository = AuditLogRepository as jest.Mocked<typeof AuditLogRepository>;
const mockApplicationMetadata = ApplicationMetadata as jest.Mocked<typeof ApplicationMetadata>;
const mockDeepDiff = { deepDiff: deepDiff as jest.MockedFunction<typeof deepDiff>, formatChanges: formatChanges as jest.MockedFunction<typeof formatChanges> };

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default behavior
    mockApplicationMetadata.getMetadata.mockReturnValue({
      applicationPlatform: 'web',
      applicationVersion: '1.0.0',
      commitHash: 'abc123def456',
    });
    mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');
  });

  describe('Audit Log Creation', () => {
    test('should create audit log with application metadata', async () => {
      const auditData: Omit<AuditLogData, 'applicationPlatform' | 'applicationVersion' | 'commitHash'> = {
        entityType: 'drone',
        entityId: 'drone-123',
        action: 'create',
        userId: TEST_ACCOUNTS.ADMIN.uid,
        userEmail: TEST_ACCOUNTS.ADMIN.email,
        details: 'Drone created',
      };

      // Ensure mock is properly configured
      mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');
      mockApplicationMetadata.getMetadata.mockReturnValue({
        applicationPlatform: 'web',
        applicationVersion: '1.0.0',
        commitHash: 'abc123def456',
      });

      const result = await AuditLogService.createAuditLog(auditData);

      expect(result).toBe('audit-log-id');
      expect(mockApplicationMetadata.getMetadata).toHaveBeenCalled();
      expect(mockAuditLogRepository.createAuditLog).toHaveBeenCalledWith({
        ...auditData,
        applicationPlatform: 'web',
        applicationVersion: '1.0.0', 
        commitHash: 'abc123def456',
      });
    });

    test('should handle missing optional fields', async () => {
      const auditData = {
        entityType: 'flight' as const,
        entityId: 'flight-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.USER.uid,
      };

      // Ensure mocks are properly configured
      mockApplicationMetadata.getMetadata.mockReturnValue({
        applicationPlatform: 'web',
        applicationVersion: '1.0.0',
        commitHash: 'abc123def456',
      });
      mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');

      const result = await AuditLogService.createAuditLog(auditData);

      expect(result).toBe('audit-log-id');
      expect(mockAuditLogRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'flight',
          entityId: 'flight-123',
          action: 'create',
          userId: TEST_ACCOUNTS.USER.uid,
          applicationPlatform: 'web',
          applicationVersion: '1.0.0',
          commitHash: 'abc123def456',
        })
      );
    });

    test('should include change values for edit operations', async () => {
      const auditData = {
        entityType: 'user' as const,
        entityId: 'user-123',
        action: 'edit' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
        userEmail: TEST_ACCOUNTS.ADMIN.email,
        previousValues: { name: 'Old Name', role: 'user' },
        newValues: { name: 'New Name', role: 'manager' },
      };

      mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');

      await AuditLogService.createAuditLog(auditData);

      expect(mockAuditLogRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          previousValues: { name: 'Old Name', role: 'user' },
          newValues: { name: 'New Name', role: 'manager' },
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should not throw error when audit log creation fails', async () => {
      const auditData = {
        entityType: 'drone' as const,
        entityId: 'drone-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
      };

      mockAuditLogRepository.createAuditLog.mockRejectedValue(new Error('Database error'));

      // Should not throw, but return empty string
      const result = await AuditLogService.createAuditLog(auditData);

      expect(result).toBe('');
    });

    test('should handle metadata service errors gracefully', async () => {
      const auditData = {
        entityType: 'drone' as const,
        entityId: 'drone-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
      };

      mockApplicationMetadata.getMetadata.mockImplementation(() => {
        throw new Error('Metadata error');
      });

      // Should not throw, but return empty string due to error handling
      const result = await AuditLogService.createAuditLog(auditData);
      expect(result).toBe('');
    });
  });

  describe('Business Logic Tests', () => {
    describe('getAuditLogs', () => {
      test('should delegate to repository', async () => {
        const mockLogs = [
          {
            id: 'log-1',
            entityType: 'drone' as const,
            entityId: 'drone-123',
            action: 'create' as const,
            userId: TEST_ACCOUNTS.ADMIN.uid,
            timestamp: new Date(),
            applicationPlatform: 'web' as const,
            applicationVersion: '1.0.0',
            commitHash: 'abc123',
          },
        ];

        mockAuditLogRepository.getAuditLogs.mockResolvedValue(mockLogs);

        const result = await AuditLogService.getAuditLogs();

        expect(result).toEqual(mockLogs);
        expect(mockAuditLogRepository.getAuditLogs).toHaveBeenCalledWith(undefined);
      });

      test('should pass query parameters to repository', async () => {
        const queryParams = {
          entityType: 'drone' as const,
          action: 'create' as const,
          limit: 50,
        };

        mockAuditLogRepository.getAuditLogs.mockResolvedValue([]);

        await AuditLogService.getAuditLogs(queryParams);

        expect(mockAuditLogRepository.getAuditLogs).toHaveBeenCalledWith(queryParams);
      });
    });

    describe('getPaginatedAuditLogs', () => {
      test('should delegate to repository with pagination', async () => {
        const mockResponse = {
          logs: [],
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1,
        };

        mockAuditLogRepository.getPaginatedAuditLogs.mockResolvedValue(mockResponse);

        const result = await AuditLogService.getPaginatedAuditLogs();

        expect(result).toEqual(mockResponse);
        expect(mockAuditLogRepository.getPaginatedAuditLogs).toHaveBeenCalledWith(undefined);
      });
    });

    describe('getEntityAuditLogs', () => {
      test('should get logs for specific entity', async () => {
        const mockLogs = [
          {
            id: 'log-1',
            entityType: 'drone' as const,
            entityId: 'drone-123',
            action: 'create' as const,
            userId: TEST_ACCOUNTS.ADMIN.uid,
            timestamp: new Date(),
            applicationPlatform: 'web' as const,
            applicationVersion: '1.0.0',
            commitHash: 'abc123',
          },
        ];

        mockAuditLogRepository.getEntityAuditLogs.mockResolvedValue(mockLogs);

        const result = await AuditLogService.getEntityAuditLogs('drone', 'drone-123');

        expect(result).toEqual(mockLogs);
        expect(mockAuditLogRepository.getEntityAuditLogs).toHaveBeenCalledWith('drone', 'drone-123', 50);
      });

      test('should respect custom limit parameter', async () => {
        mockAuditLogRepository.getEntityAuditLogs.mockResolvedValue([]);

        await AuditLogService.getEntityAuditLogs('flight', 'flight-123', 25);

        expect(mockAuditLogRepository.getEntityAuditLogs).toHaveBeenCalledWith('flight', 'flight-123', 25);
      });
    });

    describe('getRecentAuditLogs', () => {
      test('should get recent logs with default limit', async () => {
        mockAuditLogRepository.getRecentAuditLogs.mockResolvedValue([]);

        await AuditLogService.getRecentAuditLogs();

        expect(mockAuditLogRepository.getRecentAuditLogs).toHaveBeenCalledWith(100);
      });

      test('should respect custom limit parameter', async () => {
        mockAuditLogRepository.getRecentAuditLogs.mockResolvedValue([]);

        await AuditLogService.getRecentAuditLogs(50);

        expect(mockAuditLogRepository.getRecentAuditLogs).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Change Details Creation', () => {
    test('should create detailed change descriptions', () => {
      const changes = {
        previous: { name: 'Old Name', status: 'active' },
        new: { name: 'New Name', status: 'inactive' },
      };

      // Mock deepDiff to return a non-empty array for this test
      mockDeepDiff.deepDiff.mockReturnValueOnce([{ path: 'name', previousValue: 'Old Name', newValue: 'New Name' }]);
      mockDeepDiff.formatChanges.mockReturnValueOnce('Mock formatted changes');

      const result = AuditLogService.createChangeDetails('edit', 'user', changes);

      expect(mockDeepDiff.deepDiff).toHaveBeenCalledWith(changes.previous, changes.new);
      expect(mockDeepDiff.formatChanges).toHaveBeenCalled();
      expect(result).toContain('Mock formatted changes');
    });

    test('should handle create action without previous values', () => {
      const changes = {
        new: { name: 'New Item', status: 'active' },
      };

      const result = AuditLogService.createChangeDetails('create', 'drone', changes);

      expect(result).toContain('Created');
    });

    test('should handle delete action', () => {
      const changes = {
        previous: { name: 'Deleted Item', status: 'active' },
      };

      const result = AuditLogService.createChangeDetails('delete', 'drone', changes);

      expect(result).toContain('Deleted');
    });

    test('should handle actions without change data', () => {
      const result = AuditLogService.createChangeDetails('view', 'flight');

      expect(result).toContain('view');
      expect(result).toContain('flight');
    });
  });

  describe('Metadata Integration', () => {
    test('should include all metadata fields', async () => {
      const auditData = {
        entityType: 'drone' as const,
        entityId: 'drone-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
      };

      mockApplicationMetadata.getMetadata.mockReturnValue({
        applicationPlatform: 'ios',
        applicationVersion: '2.0.0',
        commitHash: 'xyz789abc123',
      });

      mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');

      await AuditLogService.createAuditLog(auditData);

      expect(mockAuditLogRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationPlatform: 'ios',
          applicationVersion: '2.0.0',
          commitHash: 'xyz789abc123',
        })
      );
    });

    test('should handle missing commit hash', async () => {
      const auditData = {
        entityType: 'drone' as const,
        entityId: 'drone-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
      };

      mockApplicationMetadata.getMetadata.mockReturnValue({
        applicationPlatform: 'android',
        applicationVersion: '1.5.0',
        commitHash: '', // Empty string instead of missing property
      });

      mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');

      await AuditLogService.createAuditLog(auditData);

      expect(mockAuditLogRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationPlatform: 'android',
          applicationVersion: '1.5.0',
        })
      );
    });
  });

  describe('Console Logging', () => {
    test('should log successful audit creation with proper format', async () => {
      // Disable the mock that was setup for this test
      (global.console.log as jest.Mock).mockClear();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const auditData = {
        entityType: 'drone' as const,
        entityId: 'drone-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
        userEmail: TEST_ACCOUNTS.ADMIN.email,
      };

      // Ensure mocks return proper values
      mockApplicationMetadata.getMetadata.mockReturnValue({
        applicationPlatform: 'web',
        applicationVersion: '1.0.0',
        commitHash: 'abc123def456',
      });
      mockAuditLogRepository.createAuditLog.mockResolvedValue('audit-log-id');

      await AuditLogService.createAuditLog(auditData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Audit log created: create on drone:drone-123 by admin@example.com')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log errors without crashing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const auditData = {
        entityType: 'drone' as const,
        entityId: 'drone-123',
        action: 'create' as const,
        userId: TEST_ACCOUNTS.ADMIN.uid,
      };

      const error = new Error('Repository failure');
      mockAuditLogRepository.createAuditLog.mockRejectedValue(error);

      const result = await AuditLogService.createAuditLog(auditData);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating audit log:', error);
      
      consoleErrorSpy.mockRestore();
    });
  });
});