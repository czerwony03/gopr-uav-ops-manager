import { FlightCategory, ActivityType } from './Flight';

/**
 * Report type options
 */
export type ReportType = 'flight-summary' | 'drone-summary';

/**
 * Time range filter options
 */
export type TimeRangeType = 'all' | 'month' | 'year' | 'custom';

/**
 * Report filter parameters
 */
export interface ReportFilter {
  timeRange: TimeRangeType;
  month?: number; // 1-12
  year?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  userId?: string;
  droneId?: string;
  flightCategory?: FlightCategory;
  activityType?: ActivityType;
}

/**
 * Flight summary statistics
 */
export interface FlightSummary {
  totalFlights: number;
  totalDuration: number; // in minutes
  totalDurationFormatted: string; // e.g., "12h 30min"
  averageDuration: number; // in minutes
  averageDurationFormatted: string;
  flightsByCategory: Record<FlightCategory, number>;
  flightsByActivity: Record<ActivityType, number>;
  flightsByUser: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    totalFlights: number;
    totalDuration: number;
    totalDurationFormatted: string;
  }>;
  flightsByDrone: Array<{
    droneId: string;
    droneName: string;
    totalFlights: number;
    totalDuration: number;
    totalDurationFormatted: string;
  }>;
  flightsByMonth: Array<{
    month: string; // YYYY-MM
    totalFlights: number;
    totalDuration: number;
    totalDurationFormatted: string;
  }>;
}

/**
 * Drone summary statistics
 */
export interface DroneSummary {
  droneId: string;
  droneName: string;
  inventoryCode: string;
  totalFlights: number;
  totalDuration: number; // in minutes
  totalDurationFormatted: string;
  lastFlightDate?: string;
  flightsByCategory: Record<FlightCategory, number>;
  flightsByActivity: Record<ActivityType, number>;
  averageDuration: number;
  averageDurationFormatted: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'xlsx' | 'pdf';

/**
 * Report data for export
 */
export interface ReportExportData {
  reportType: ReportType;
  filter: ReportFilter;
  flightSummary?: FlightSummary;
  droneSummaries?: DroneSummary[];
  generatedAt: Date;
  generatedBy: string;
}
