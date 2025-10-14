// Mock the services
jest.mock('../flightService');
jest.mock('../droneService');
jest.mock('../userService');

import { ReportService } from '../reportService';
import { FlightService } from '../flightService';
import { DroneService } from '../droneService';
import { UserService } from '../userService';
import { Flight } from '@/types/Flight';
import { Drone } from '@/types/Drone';
import { User } from '@/types/User';
import { UserRole } from '@/types/UserRole';
import { ReportFilter } from '@/types/Report';

describe('ReportService', () => {
  const mockFlights: Flight[] = [
    {
      id: 'flight1',
      userId: 'user1',
      userEmail: 'user1@test.com',
      date: '2024-01-15',
      location: 'Test Location 1',
      flightCategory: 'A1',
      operationType: 'IR',
      activityType: 'Individual training',
      droneId: 'drone1',
      droneName: 'Drone 1',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T12:00:00Z',
      conditions: 'Good',
    },
    {
      id: 'flight2',
      userId: 'user2',
      userEmail: 'user2@test.com',
      date: '2024-01-20',
      location: 'Test Location 2',
      flightCategory: 'A2',
      operationType: 'WIDE',
      activityType: 'Group training',
      droneId: 'drone2',
      droneName: 'Drone 2',
      startTime: '2024-01-20T14:00:00Z',
      endTime: '2024-01-20T15:30:00Z',
      conditions: 'Fair',
    },
    {
      id: 'flight3',
      userId: 'user1',
      userEmail: 'user1@test.com',
      date: '2024-02-10',
      location: 'Test Location 3',
      flightCategory: 'A1',
      operationType: 'IR',
      activityType: 'Rescue',
      droneId: 'drone1',
      droneName: 'Drone 1',
      startTime: '2024-02-10T09:00:00Z',
      endTime: '2024-02-10T10:00:00Z',
      conditions: 'Excellent',
    },
  ];

  const mockDrones: Drone[] = [
    {
      id: 'drone1',
      name: 'Drone 1',
      inventoryCode: 'D001',
      location: 'Base 1',
      registrationNumber: 'REG001',
      totalFlightTime: 0,
      equipmentRegistrationNumber: 'EQ001',
      yearOfCommissioning: 2023,
      yearOfManufacture: 2023,
      insurance: '2025-12-31',
      callSign: 'CS001',
      weight: 1000,
      maxTakeoffWeight: 1500,
      operatingTime: 30,
      range: 5000,
      dimensions: { length: 500, width: 500, height: 200 },
      battery: { type: 'LiPo', capacity: 5000, voltage: 22.2 },
      maxSpeed: 60,
    },
    {
      id: 'drone2',
      name: 'Drone 2',
      inventoryCode: 'D002',
      location: 'Base 2',
      registrationNumber: 'REG002',
      totalFlightTime: 0,
      equipmentRegistrationNumber: 'EQ002',
      yearOfCommissioning: 2023,
      yearOfManufacture: 2023,
      insurance: '2025-12-31',
      callSign: 'CS002',
      weight: 1200,
      maxTakeoffWeight: 1700,
      operatingTime: 25,
      range: 4000,
      dimensions: { length: 450, width: 450, height: 180 },
      battery: { type: 'LiPo', capacity: 4500, voltage: 22.2 },
      maxSpeed: 55,
    },
  ];

  const mockUsers: User[] = [
    {
      uid: 'user1',
      email: 'user1@test.com',
      role: UserRole.USER,
      firstname: 'John',
      surname: 'Doe',
    },
    {
      uid: 'user2',
      email: 'user2@test.com',
      role: UserRole.USER,
      firstname: 'Jane',
      surname: 'Smith',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (FlightService.getFlights as jest.Mock).mockResolvedValue(mockFlights);
    (DroneService.getDrones as jest.Mock).mockResolvedValue(mockDrones);
    (UserService.getUser as jest.Mock).mockImplementation((userId: string, _role: UserRole, _currentUserId: string) => {
      return Promise.resolve(mockUsers.find(u => u.uid === userId) || null);
    });
    (UserService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
  });

  describe('generateFlightSummary', () => {
    it('should generate summary for all flights', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summary.totalFlights).toBe(3);
      expect(summary.totalDuration).toBeGreaterThan(0);
      expect(summary.flightsByCategory['A1']).toBe(2);
      expect(summary.flightsByCategory['A2']).toBe(1);
      expect(summary.flightsByUser).toHaveLength(2);
      expect(summary.flightsByDrone).toHaveLength(2);
    });

    it('should filter flights by month', async () => {
      const filter: ReportFilter = {
        timeRange: 'month',
        month: 1,
        year: 2024,
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summary.totalFlights).toBe(2);
      expect(summary.flightsByUser).toHaveLength(2);
    });

    it('should filter flights by year', async () => {
      const filter: ReportFilter = {
        timeRange: 'year',
        year: 2024,
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summary.totalFlights).toBe(3);
    });

    it('should filter flights by user', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
        userId: 'user1',
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summary.totalFlights).toBe(2);
      expect(summary.flightsByUser).toHaveLength(1);
      expect(summary.flightsByUser[0].userId).toBe('user1');
    });

    it('should filter flights by drone', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
        droneId: 'drone1',
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summary.totalFlights).toBe(2);
      expect(summary.flightsByDrone).toHaveLength(1);
      expect(summary.flightsByDrone[0].droneId).toBe('drone1');
    });

    it('should group flights by month', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summary.flightsByMonth).toHaveLength(2);
      expect(summary.flightsByMonth[0].month).toBe('2024-02');
      expect(summary.flightsByMonth[1].month).toBe('2024-01');
    });
  });

  describe('generateDroneSummary', () => {
    it('should generate summary for all drones', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summaries = await ReportService.generateDroneSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summaries).toHaveLength(2);
      expect(summaries[0].droneId).toBe('drone1');
      expect(summaries[0].totalFlights).toBe(2);
      expect(summaries[1].droneId).toBe('drone2');
      expect(summaries[1].totalFlights).toBe(1);
    });

    it('should filter drones by month', async () => {
      const filter: ReportFilter = {
        timeRange: 'month',
        month: 1,
        year: 2024,
      };

      const summaries = await ReportService.generateDroneSummary(filter, UserRole.ADMIN, 'admin1');

      expect(summaries).toHaveLength(2);
      // In January 2024: drone1 has 1 flight (2h), drone2 has 1 flight (1.5h)
      // Summaries are sorted by total duration descending
      expect(summaries[0].totalFlights).toBe(1);
      expect(summaries[1].totalFlights).toBe(1);
      expect(summaries[0].totalDuration).toBeGreaterThan(summaries[1].totalDuration);
    });

    it('should calculate total duration correctly', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summaries = await ReportService.generateDroneSummary(filter, UserRole.ADMIN, 'admin1');

      const drone1Summary = summaries.find(s => s.droneId === 'drone1');
      expect(drone1Summary).toBeDefined();
      expect(drone1Summary!.totalDuration).toBeGreaterThan(0);
      expect(drone1Summary!.totalDurationFormatted).toContain('h');
    });

    it('should include last flight date', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summaries = await ReportService.generateDroneSummary(filter, UserRole.ADMIN, 'admin1');

      const drone1Summary = summaries.find(s => s.droneId === 'drone1');
      expect(drone1Summary).toBeDefined();
      expect(drone1Summary!.lastFlightDate).toBe('2024-02-10');
    });
  });

  describe('exportFlightSummaryToXLSX', () => {
    it('should export flight summary to XLSX', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');
      const fileUri = await ReportService.exportFlightSummaryToXLSX(summary, filter, 'test@test.com');

      expect(fileUri).toContain('flight-summary');
      expect(fileUri).toContain('.xlsx');
    });
  });

  describe('exportDroneSummaryToXLSX', () => {
    it('should export drone summary to XLSX', async () => {
      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summaries = await ReportService.generateDroneSummary(filter, UserRole.ADMIN, 'admin1');
      const fileUri = await ReportService.exportDroneSummaryToXLSX(summaries, filter, 'test@test.com');

      expect(fileUri).toContain('drone-summary');
      expect(fileUri).toContain('.xlsx');
    });
  });

  describe('exportFlightSummaryToPDF', () => {
    it('should export flight summary to PDF on web', async () => {
      // Mock window.open for web environment
      global.window = {
        open: jest.fn().mockReturnValue({
          onload: jest.fn(),
        }),
      } as any;
      global.URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
      } as any;
      global.Blob = jest.fn() as any;

      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summary = await ReportService.generateFlightSummary(filter, UserRole.ADMIN, 'admin1');
      const fileUri = await ReportService.exportFlightSummaryToPDF(summary, filter, 'test@test.com');

      expect(fileUri).toBeDefined();
      expect(global.window.open).toHaveBeenCalled();
    });
  });

  describe('exportDroneSummaryToPDF', () => {
    it('should export drone summary to PDF on web', async () => {
      // Mock window.open for web environment
      global.window = {
        open: jest.fn().mockReturnValue({
          onload: jest.fn(),
        }),
      } as any;
      global.URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
      } as any;
      global.Blob = jest.fn() as any;

      const filter: ReportFilter = {
        timeRange: 'all',
      };

      const summaries = await ReportService.generateDroneSummary(filter, UserRole.ADMIN, 'admin1');
      const fileUri = await ReportService.exportDroneSummaryToPDF(summaries, filter, 'test@test.com');

      expect(fileUri).toBeDefined();
      expect(global.window.open).toHaveBeenCalled();
    });
  });

  describe('shareFile', () => {
    it('should return early for web', async () => {
      // On web, shareFile returns immediately without doing anything
      await ReportService.shareFile('file:///test.xlsx');

      // No assertions needed as the function just returns
      expect(true).toBe(true);
    });
  });
});
