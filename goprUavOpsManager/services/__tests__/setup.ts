// Jest setup file for service tests
// This file runs before each test suite

import { UserRole } from '@/types/UserRole';

// Global test constants
export const TEST_ACCOUNTS = {
  ADMIN: {
    uid: 'admin-uid-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    password: 'admin123',
  },
  MANAGER: {
    uid: 'manager-uid-456', 
    email: 'manager@example.com',
    role: UserRole.MANAGER,
    password: 'manager123',
  },
  USER: {
    uid: 'user-uid-789',
    email: 'user@example.com', 
    role: UserRole.USER,
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
export const mockDrone: any = {
  id: 'drone-123',
  name: 'Test Drone',
  inventoryCode: 'INV-123',
  location: 'Test Location', 
  registrationNumber: 'REG-123',
  totalFlightTime: 120,
  equipmentRegistrationNumber: 'EQ-REG-123',
  yearOfCommissioning: 2023,
  yearOfManufacture: 2023,
  insurance: 'Test Insurance',
  callSign: 'TEST-123',
  weight: 400,
  maxTakeoffWeight: 500,
  operatingTime: 30,
  range: 1000,
  dimensions: {
    length: 200,
    width: 200,
    height: 50,
  },
  battery: {
    type: 'LiPo',
    capacity: 5000,
    voltage: 11.1,
  },
  maxSpeed: 50,
  serialNumber: 'SN123456',
  model: 'Test Model',
  manufacturer: 'Test Manufacturer',
  category: 'C1' as const,
  registrationMark: 'REG-MARK-123',
  operatorNumber: 'OP-001',
  images: [],
  equipment: {
    camera: false,
    gps: true,
    gimbal: false,
    obstacles: false,
    lighting: false,
    parachute: false,
    speaker: false,
    other: '',
  },
  equipmentList: [],
  droneEquipment: [],
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: TEST_ACCOUNTS.ADMIN.uid,
  updatedBy: TEST_ACCOUNTS.ADMIN.uid,
};

export const mockFlight: any = {
  id: 'flight-123',
  droneId: 'drone-123',
  userId: TEST_ACCOUNTS.USER.uid,
  userEmail: TEST_ACCOUNTS.USER.email,
  date: '2024-01-01',
  startTime: new Date(),
  endTime: new Date(),
  duration: 60,
  location: 'Test Location',
  flightCategory: 'A1',
  operationType: 'IR',
  activityType: 'Individual training',
  purpose: 'Test flight',
  conditions: {
    weather: 'Clear',
    wind: '5 km/h',
    temperature: '20°C',
    visibility: 'Good',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUser: any = {
  uid: TEST_ACCOUNTS.USER.uid,
  email: TEST_ACCOUNTS.USER.email,
  role: UserRole.USER,
  firstname: 'Test',
  surname: 'User',
  phone: '+48123456789',
  residentialAddress: 'Test Address 123',
  operatorNumber: 'OP-001',
  pilotNumber: 'PI-001',
  qualifications: ['A1'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockProcedureChecklist: any = {
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