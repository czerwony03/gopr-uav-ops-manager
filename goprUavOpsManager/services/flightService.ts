import { Flight, FlightQuery, PaginatedFlightResponse } from '@/types/Flight';
import { AuditLogService } from './auditLogService';
import { UserService } from './userService';
import {UserRole} from "@/types/UserRole";
import {FlightRepository} from "@/repositories/FlightRepository";

export class FlightService {
  // Get flights based on user role
  static async getFlights(userRole: UserRole, currentUserId: string): Promise<Flight[]> {
    return FlightRepository.getFlights(userRole, currentUserId);
  }

  // Get a single flight by ID with access control
  static async getFlight(id: string, userRole: UserRole, currentUserId: string): Promise<Flight | null> {
    const flight = await FlightRepository.getFlight(id);
    
    if (!flight) {
      return null;
    }

    // Check access control - owner or admin/manager
    if (userRole !== 'admin' && userRole !== 'manager' && flight.userId !== currentUserId) {
      throw new Error('Insufficient permissions to access this flight');
    }

    return flight;
  }

  // Create a new flight
  static async createFlight(
    flightData: Omit<Flight, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, 
    currentUserId: string, 
    currentUserEmail?: string
  ): Promise<string> {
    try {
      // Create flight in repository
      const docId = await FlightRepository.createFlight({
        ...flightData,
        userId: currentUserId,
        userEmail: currentUserEmail || '',
      }, currentUserId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(currentUserId);
      await AuditLogService.createAuditLog({
        entityType: 'flight',
        entityId: docId,
        action: 'create',
        userId: currentUserId,
        userEmail,
        details: AuditLogService.createChangeDetails('create', 'flight'),
        newValues: { ...flightData, userId: currentUserId, userEmail: currentUserEmail || '' }
      });

      return docId;
    } catch (error) {
      console.error('Error creating flight:', error);
      throw new Error('Failed to create flight');
    }
  }

  // Update an existing flight with access control
  static async updateFlight(
    id: string, 
    patch: Partial<Flight>, 
    userRole: UserRole, 
    currentUserId: string
  ): Promise<void> {
    try {
      // Get current flight data for access control and audit logging
      const currentFlight = await FlightRepository.getFlight(id);
      if (!currentFlight) {
        throw new Error('Flight not found');
      }
      
      // Check access control - owner or admin/manager
      if (userRole !== 'admin' && userRole !== 'manager' && currentFlight.userId !== currentUserId) {
        throw new Error('Insufficient permissions to update this flight');
      }

      // Store previous values for audit log
      const previousValues = { ...currentFlight };
      const newValues = { ...currentFlight, ...patch };

      // Update flight in repository
      await FlightRepository.updateFlight(id, patch, currentUserId);

      // Create audit log entry
      const userEmail = await UserService.getUserEmail(currentUserId);
      await AuditLogService.createAuditLog({
        entityType: 'flight',
        entityId: id,
        action: 'edit',
        userId: currentUserId,
        userEmail,
        details: AuditLogService.createChangeDetails('edit', 'flight', { previous: previousValues, new: newValues }),
        previousValues,
        newValues
      });
    } catch (error) {
      console.error('Error updating flight:', error);
      throw new Error('Failed to update flight');
    }
  }

  // Get paginated flights with filtering
  static async getPaginatedFlights(
    userRole: UserRole, 
    currentUserId: string, 
    queryParams?: FlightQuery
  ): Promise<PaginatedFlightResponse> {
    return FlightRepository.getPaginatedFlights(queryParams || {}, userRole, currentUserId);
  }
}
