// Jest setup file for service tests
// This file runs before each test suite

// Global test constants
export const TEST_ACCOUNTS = {
  ADMIN: {
    uid: 'admin-uid-123',
    email: 'admin@example.com',
    role: 'admin' as const,
    password: 'admin123',
  },
  MANAGER: {
    uid: 'manager-uid-456', 
    email: 'manager@example.com',
    role: 'manager' as const,
    password: 'manager123',
  },
  USER: {
    uid: 'user-uid-789',
    email: 'user@example.com', 
    role: 'user' as const,
    password: 'user123',
  },
};

// Mock console methods to avoid noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test helpers
export const mockAuditLogService = {
  createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
};

export const mockUserService = {
  getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
};

// Common mock data
export const mockDrone = {
  id: 'drone-123',
  serialNumber: 'SN123456',
  model: 'Test Drone',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: TEST_ACCOUNTS.ADMIN.uid,
  updatedBy: TEST_ACCOUNTS.ADMIN.uid,
};

export const mockFlight = {
  id: 'flight-123',
  droneId: 'drone-123',
  userId: TEST_ACCOUNTS.USER.uid,
  userEmail: TEST_ACCOUNTS.USER.email,
  startTime: new Date(),
  endTime: new Date(),
  duration: 60,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUser = {
  uid: TEST_ACCOUNTS.USER.uid,
  email: TEST_ACCOUNTS.USER.email,
  role: TEST_ACCOUNTS.USER.role,
  firstname: 'Test',
  surname: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockProcedureChecklist = {
  id: 'checklist-123',
  title: 'Test Checklist',
  description: 'Test Description',
  items: [],
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: TEST_ACCOUNTS.ADMIN.uid,
  updatedBy: TEST_ACCOUNTS.ADMIN.uid,
};