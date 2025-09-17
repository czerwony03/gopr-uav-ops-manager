import { testCredentials, mockUsers } from './test-utils';
import { UserRole } from '@/types/UserRole';

describe('Smoke Tests', () => {
  it('should have test credentials for all user roles', () => {
    expect(testCredentials.admin).toBeDefined();
    expect(testCredentials.manager).toBeDefined();
    expect(testCredentials.user).toBeDefined();
    
    expect(testCredentials.admin.email).toBe('admin@example.com');
    expect(testCredentials.admin.password).toBe('admin123');
    
    expect(testCredentials.manager.email).toBe('manager@example.com');
    expect(testCredentials.manager.password).toBe('manager123');
    
    expect(testCredentials.user.email).toBe('user@example.com');
    expect(testCredentials.user.password).toBe('user123');
  });

  it('should have mock users for all roles', () => {
    expect(mockUsers.admin).toBeDefined();
    expect(mockUsers.manager).toBeDefined();
    expect(mockUsers.user).toBeDefined();
    
    expect(mockUsers.admin.role).toBe(UserRole.ADMIN);
    expect(mockUsers.manager.role).toBe(UserRole.MANAGER);
    expect(mockUsers.user.role).toBe(UserRole.USER);
  });

  it('should have correct user role enum values', () => {
    expect(UserRole.ADMIN).toBe('admin');
    expect(UserRole.MANAGER).toBe('manager');
    expect(UserRole.USER).toBe('user');
  });
});