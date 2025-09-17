// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/UserRepository', () => ({
  UserRepository: {
    getUsers: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    createUser: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
  }
}));

import { UserService } from '../userService';
import { UserRole } from '@/types/UserRole';
import { TEST_ACCOUNTS, mockUser } from './setup';
import { UserRepository } from '@/repositories/UserRepository';
import { AuditLogService } from '../auditLogService';

// Get references to mocked functions
const mockUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Logic Tests', () => {
    describe('getUsers access control', () => {
      test('should allow admin to get all users', async () => {
        const mockUsers = [mockUser, { ...mockUser, uid: 'user2', email: 'user2@example.com' }];
        mockUserRepository.getUsers.mockResolvedValue(mockUsers);
        
        const result = await UserService.getUsers(UserRole.ADMIN);
        
        expect(result).toHaveLength(2);
        expect(mockUserRepository.getUsers).toHaveBeenCalled();
      });

      test('should allow manager to get all users', async () => {
        const mockUsers = [mockUser];
        mockUserRepository.getUsers.mockResolvedValue(mockUsers);
        
        const result = await UserService.getUsers(UserRole.MANAGER);
        
        expect(result).toHaveLength(1);
        expect(mockUserRepository.getUsers).toHaveBeenCalled();
      });

      test('should deny user access to get all users', async () => {
        await expect(
          UserService.getUsers(UserRole.USER)
        ).rejects.toThrow('Access denied. Only administrators and managers can view all users.');
      });

      test('should handle string role values', async () => {
        mockUserRepository.getUsers.mockResolvedValue([mockUser]);
        
        const result = await UserService.getUsers('admin' as UserRole);
        expect(result).toHaveLength(1);
        
        await expect(
          UserService.getUsers('user' as UserRole)
        ).rejects.toThrow('Access denied. Only administrators and managers can view all users.');
      });
    });

    describe('getUser access control', () => {
      test('should allow admin to view any user profile', async () => {
        mockUserRepository.getUser.mockResolvedValue(mockUser);
        
        const result = await UserService.getUser(
          'target-user-id',
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        );
        
        expect(result).toBeTruthy();
        expect(mockUserRepository.getUser).toHaveBeenCalledWith('target-user-id');
      });

      test('should allow manager to view any user profile', async () => {
        mockUserRepository.getUser.mockResolvedValue(mockUser);
        
        const result = await UserService.getUser(
          'target-user-id',
          UserRole.MANAGER,
          TEST_ACCOUNTS.MANAGER.uid
        );
        
        expect(result).toBeTruthy();
        expect(mockUserRepository.getUser).toHaveBeenCalledWith('target-user-id');
      });

      test('should allow user to view their own profile', async () => {
        mockUserRepository.getUser.mockResolvedValue(mockUser);
        
        const result = await UserService.getUser(
          TEST_ACCOUNTS.USER.uid,
          UserRole.USER,
          TEST_ACCOUNTS.USER.uid
        );
        
        expect(result).toBeTruthy();
        expect(mockUserRepository.getUser).toHaveBeenCalledWith(TEST_ACCOUNTS.USER.uid);
      });

      test('should deny user access to other user profiles', async () => {
        await expect(
          UserService.getUser(
            'other-user-id',
            UserRole.USER,
            TEST_ACCOUNTS.USER.uid
          )
        ).rejects.toThrow('Access denied. You can only view your own profile.');
      });
    });

    describe('updateUser access control', () => {
      test('should allow admin to update any user', async () => {
        mockUserRepository.getUser.mockResolvedValue(mockUser);
        mockUserRepository.updateUser.mockResolvedValue(undefined);
        
        await UserService.updateUser(
          'target-user-id',
          { firstname: 'Updated' },
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        );
        
        expect(mockUserRepository.updateUser).toHaveBeenCalled();
      });

      test('should allow user to update their own profile', async () => {
        mockUserRepository.getUser.mockResolvedValue(mockUser);
        mockUserRepository.updateUser.mockResolvedValue(undefined);
        
        await UserService.updateUser(
          TEST_ACCOUNTS.USER.uid,
          { firstname: 'Updated' },
          UserRole.USER,
          TEST_ACCOUNTS.USER.uid
        );
        
        expect(mockUserRepository.updateUser).toHaveBeenCalled();
      });

      test('should deny user access to update other users', async () => {
        await expect(
          UserService.updateUser(
            'other-user-id',
            { firstname: 'Updated' },
            UserRole.USER,
            TEST_ACCOUNTS.USER.uid
          )
        ).rejects.toThrow('Access denied. You can only update your own profile.');
      });

      test('should deny non-admin users from changing roles', async () => {
        await expect(
          UserService.updateUser(
            TEST_ACCOUNTS.USER.uid,
            { role: UserRole.ADMIN },
            UserRole.USER,
            TEST_ACCOUNTS.USER.uid
          )
        ).rejects.toThrow('Access denied. Only administrators can change user roles.');
      });

      test('should allow admin to change user roles', async () => {
        mockUserRepository.getUser.mockResolvedValue(mockUser);
        mockUserRepository.updateUser.mockResolvedValue(undefined);
        
        await UserService.updateUser(
          'target-user-id',
          { role: UserRole.MANAGER },
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        );
        
        expect(mockUserRepository.updateUser).toHaveBeenCalled();
      });
    });
  });

  describe('Business Logic Tests', () => {
    test('should return null when user not found', async () => {
      mockUserRepository.getUser.mockResolvedValue(null);
      
      const result = await UserService.getUser(
        'non-existent',
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(result).toBeNull();
    });

    test('should handle empty users list', async () => {
      mockUserRepository.getUsers.mockResolvedValue([]);
      
      const result = await UserService.getUsers(UserRole.ADMIN);
      
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling and Side Effects', () => {
    test('should handle repository errors gracefully', async () => {
      mockUserRepository.getUsers.mockRejectedValue(new Error('Database error'));
      
      await expect(
        UserService.getUsers(UserRole.ADMIN)
      ).rejects.toThrow('Database error');
    });

    test('should create audit log on user update', async () => {
      const currentUser = { ...mockUser, firstname: 'Original' };
      const updatedData = { firstname: 'Updated' };
      
      mockUserRepository.getUser.mockResolvedValue(currentUser);
      mockUserRepository.updateUser.mockResolvedValue(undefined);
      
      await UserService.updateUser(
        TEST_ACCOUNTS.USER.uid,
        updatedData,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'user',
          entityId: TEST_ACCOUNTS.USER.uid,
          action: 'edit',
          userId: TEST_ACCOUNTS.ADMIN.uid,
        })
      );
    });

    test('should throw error when trying to update non-existent user', async () => {
      mockUserRepository.getUser.mockResolvedValue(null);
      
      await expect(
        UserService.updateUser(
          'non-existent',
          { firstname: 'Updated' },
          UserRole.ADMIN,
          TEST_ACCOUNTS.ADMIN.uid
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('Role-based Access Scenarios', () => {
    test('admin@example.com should have full access to all operations', async () => {
      mockUserRepository.getUsers.mockResolvedValue([mockUser]);
      mockUserRepository.getUser.mockResolvedValue(mockUser);
      
      // Can get all users  
      const allUsers = await UserService.getUsers(UserRole.ADMIN);
      expect(allUsers).toHaveLength(1);
      
      // Can view any user
      const anyUser = await UserService.getUser(
        'any-user-id',
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      expect(anyUser).toBeTruthy();
    });

    test('manager@example.com should have admin-like access except role changes', async () => {
      mockUserRepository.getUsers.mockResolvedValue([mockUser]);
      mockUserRepository.getUser.mockResolvedValue(mockUser);
      
      // Can get all users
      const allUsers = await UserService.getUsers(UserRole.MANAGER);
      expect(allUsers).toHaveLength(1);
      
      // Can view any user
      const anyUser = await UserService.getUser(
        'any-user-id',
        UserRole.MANAGER,
        TEST_ACCOUNTS.MANAGER.uid
      );
      expect(anyUser).toBeTruthy();
      
      // Cannot change roles
      await expect(
        UserService.updateUser(
          'target-user-id',
          { role: UserRole.ADMIN },
          UserRole.MANAGER,
          TEST_ACCOUNTS.MANAGER.uid
        )
      ).rejects.toThrow('Access denied. Only administrators can change user roles.');
    });

    test('user@example.com should have limited access', async () => {
      mockUserRepository.getUser.mockResolvedValue(mockUser);
      
      // Cannot get all users
      await expect(
        UserService.getUsers(UserRole.USER)
      ).rejects.toThrow('Access denied. Only administrators and managers can view all users.');
      
      // Can view own profile
      const ownProfile = await UserService.getUser(
        TEST_ACCOUNTS.USER.uid,
        UserRole.USER,
        TEST_ACCOUNTS.USER.uid
      );
      expect(ownProfile).toBeTruthy();
      
      // Cannot view other profiles
      await expect(
        UserService.getUser(
          'other-user-id',
          UserRole.USER,
          TEST_ACCOUNTS.USER.uid
        )
      ).rejects.toThrow('Access denied. You can only view your own profile.');
    });
  });

  describe('Audit Trail Verification', () => {
    test('should include change details in audit log', async () => {
      const currentUser = { ...mockUser, firstname: 'Original', surname: 'Name' };
      const updatedData = { firstname: 'Updated', surname: 'NewName' };
      
      mockUserRepository.getUser.mockResolvedValue(currentUser);
      mockUserRepository.updateUser.mockResolvedValue(undefined);
      
      await UserService.updateUser(
        TEST_ACCOUNTS.USER.uid,
        updatedData,
        UserRole.ADMIN,
        TEST_ACCOUNTS.ADMIN.uid
      );
      
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'user',
          entityId: TEST_ACCOUNTS.USER.uid,
          action: 'edit',
          userId: TEST_ACCOUNTS.ADMIN.uid,
          previousValues: expect.objectContaining({
            firstname: 'Original',
            surname: 'Name',
          }),
          newValues: expect.objectContaining({
            firstname: 'Updated',
            surname: 'NewName',
          }),
        })
      );
    });
  });
});