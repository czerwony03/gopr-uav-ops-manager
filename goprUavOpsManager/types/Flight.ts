// Flight category options
export type FlightCategory = 
  | 'A1' | 'A2' | 'A3' 
  | 'NSTS01' | 'NSTS02' | 'NSTS03' | 'NSTS04' | 'NSTS05' | 'NSTS06'
  | 'STS01' | 'STS02';

// Operation type options  
export type OperationType = 'IR' | 'WIDE' | 'CARGO' | 'SARUAV' | 'TERMO';

// Activity type options
export type ActivityType = 'Individual training' | 'Group training' | 'Rescue';

// Available flight categories for select field
export const AVAILABLE_FLIGHT_CATEGORIES: FlightCategory[] = [
  'A1', 'A2', 'A3',
  'NSTS01', 'NSTS02', 'NSTS03', 'NSTS04', 'NSTS05', 'NSTS06',
  'STS01', 'STS02'
];

// Available operation types for select field
export const AVAILABLE_OPERATION_TYPES: OperationType[] = [
  'IR', 'WIDE', 'CARGO', 'SARUAV', 'TERMO'
];

// Available activity types for select field
export const AVAILABLE_ACTIVITY_TYPES: ActivityType[] = [
  'Individual training', 'Group training', 'Rescue'
];

export interface Flight {
  id: string;
  userId: string; // owner's Firebase Auth UID
  userEmail?: string; // snapshot for reference
  date: string; // YYYY-MM-DD
  location: string;
  flightCategory: FlightCategory; // Kategoria lotu
  operationType: OperationType; // Rodzaj operacji
  activityType: ActivityType; // Rodzaj działań
  droneId: string; // reference to drones.id
  droneName?: string; // snapshot for easy list display
  startTime: string; // ISO datetime string for flights that can cross midnight
  endTime: string; // ISO datetime string for flights that can cross midnight
  conditions: string; // Warunki
  createdAt?: Date; // timestamp when created
  updatedAt?: Date; // timestamp when last updated
  createdBy?: string; // user ID who created it
  updatedBy?: string; // user ID who last updated it
}

// Query parameters for fetching flights with filtering and pagination
export interface FlightQuery {
  pageSize?: number;
  pageNumber?: number;
  startDate?: Date;
  endDate?: Date;
  flightCategory?: FlightCategory;
  activityType?: ActivityType;
  userEmail?: string; // For admin/manager to filter by operator
  droneId?: string;
  lastDocumentSnapshot?: any; // Firestore DocumentSnapshot for pagination
}

// Paginated flight response
export interface PaginatedFlightResponse {
  flights: Flight[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
  lastDocumentSnapshot?: any;
}