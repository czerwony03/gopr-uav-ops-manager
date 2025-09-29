import { DroneClaim, DroneClaimQuery, PaginatedDroneClaimResponse } from '@/types/DroneClaim';
import { UserRole } from '@/types/UserRole';
import { DroneClaimRepository } from '@/repositories/DroneClaimRepository';
import { DroneRepository } from '@/repositories/DroneRepository';
import { AuditLogService } from './auditLogService';
import { UserService } from './userService';

export class DroneClaimService {
  
  /**
   * Check if user can claim/release drones
   */
  private static canClaimDrones(userRole: UserRole): boolean {
    return userRole === 'user' || userRole === 'manager' || userRole === 'admin';
  }

  /**
   * Check if user can override claims (admin only)
   */
  private static canOverrideClaims(userRole: UserRole): boolean {
    return userRole === 'admin';
  }

  /**
   * Claim a drone for a user
   */
  static async claimDrone(
    droneId: string, 
    userId: string, 
    userRole: UserRole, 
    userEmail?: string
  ): Promise<string> {
    if (!this.canClaimDrones(userRole)) {
      throw new Error('Insufficient permissions to claim drone');
    }

    try {
      // Check if drone exists and is shareable
      const drone = await DroneRepository.getDrone(droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      if (!drone.shareable) {
        throw new Error('This drone is not shareable');
      }

      if (drone.isDeleted) {
        throw new Error('Cannot claim a deleted drone');
      }

      // Check if drone is already claimed
      const activeClaim = await DroneClaimRepository.getActiveClaim(droneId);
      if (activeClaim) {
        throw new Error('Drone is already claimed by another user');
      }

      // Get user email if not provided
      const email = userEmail || await UserService.getUserEmail(userId);

      // Create claim
      const claimId = await DroneClaimRepository.createClaim({
        droneId,
        userId,
        userEmail: email,
        startTime: new Date()
      }, userId);

      // Create audit log
      await AuditLogService.createAuditLog({
        entityType: 'droneClaim',
        entityId: claimId,
        action: 'create',
        userId,
        userEmail: email,
        details: AuditLogService.createChangeDetails('create', 'drone claim', {
          new: { droneId, userId, userEmail: email }
        }),
        newValues: { droneId, userId, userEmail: email, startTime: new Date() }
      });

      return claimId;
    } catch (error) {
      console.error('Error claiming drone:', error);
      throw error;
    }
  }

  /**
   * Release a drone claim
   */
  static async releaseClaim(
    claimId: string, 
    userId: string, 
    userRole: UserRole, 
    userEmail?: string
  ): Promise<void> {
    if (!this.canClaimDrones(userRole)) {
      throw new Error('Insufficient permissions to release claim');
    }

    try {
      // Get the claim
      const claim = await DroneClaimRepository.getClaim(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.endTime) {
        throw new Error('Claim is already released');
      }

      // Check if user owns the claim or is admin
      if (claim.userId !== userId && !this.canOverrideClaims(userRole)) {
        throw new Error('You can only release your own claims');
      }

      // Get user email if not provided
      const email = userEmail || await UserService.getUserEmail(userId);

      // Update claim with end time
      await DroneClaimRepository.updateClaim(claimId, {
        endTime: new Date()
      }, userId);

      // Create audit log
      const isAdminOverride = claim.userId !== userId;
      await AuditLogService.createAuditLog({
        entityType: 'droneClaim',
        entityId: claimId,
        action: isAdminOverride ? 'admin_override' : 'release',
        userId,
        userEmail: email,
        details: AuditLogService.createChangeDetails(
          isAdminOverride ? 'admin override' : 'release', 
          'drone claim',
          {
            previous: { endTime: null },
            new: { endTime: new Date() }
          }
        ),
        newValues: { endTime: new Date() }
      });
    } catch (error) {
      console.error('Error releasing claim:', error);
      throw error;
    }
  }

  /**
   * Admin override: End current claim and optionally start new one
   */
  static async adminOverrideClaim(
    droneId: string,
    newUserId: string | null, // null to just end current claim
    adminUserId: string,
    adminUserRole: UserRole,
    adminUserEmail?: string
  ): Promise<string | null> {
    if (!this.canOverrideClaims(adminUserRole)) {
      throw new Error('Insufficient permissions to override claims');
    }

    try {
      // Get current active claim
      const activeClaim = await DroneClaimRepository.getActiveClaim(droneId);
      
      // Get admin email if not provided
      const adminEmail = adminUserEmail || await UserService.getUserEmail(adminUserId);

      // End current claim if exists
      if (activeClaim) {
        await DroneClaimRepository.updateClaim(activeClaim.id, {
          endTime: new Date()
        }, adminUserId);

        // Create audit log for ending claim
        await AuditLogService.createAuditLog({
          entityType: 'droneClaim',
          entityId: activeClaim.id,
          action: 'admin_override_end',
          userId: adminUserId,
          userEmail: adminEmail,
          details: AuditLogService.createChangeDetails('admin override end', 'drone claim', {
            previous: { endTime: null, userId: activeClaim.userId },
            new: { endTime: new Date() }
          }),
          newValues: { endTime: new Date() }
        });
      }

      // Start new claim if specified
      if (newUserId) {
        const newUserEmail = await UserService.getUserEmail(newUserId);
        
        const newClaimId = await DroneClaimRepository.createClaim({
          droneId,
          userId: newUserId,
          userEmail: newUserEmail,
          startTime: new Date()
        }, adminUserId);

        // Create audit log for new claim
        await AuditLogService.createAuditLog({
          entityType: 'droneClaim',
          entityId: newClaimId,
          action: 'admin_override_create',
          userId: adminUserId,
          userEmail: adminEmail,
          details: AuditLogService.createChangeDetails('admin override create', 'drone claim', {
            new: { droneId, userId: newUserId, userEmail: newUserEmail }
          }),
          newValues: { droneId, userId: newUserId, userEmail: newUserEmail, startTime: new Date() }
        });

        return newClaimId;
      }

      return null;
    } catch (error) {
      console.error('Error in admin override:', error);
      throw error;
    }
  }

  /**
   * Get current claim for a drone
   */
  static async getActiveClaim(droneId: string): Promise<DroneClaim | null> {
    return DroneClaimRepository.getActiveClaim(droneId);
  }

  /**
   * Get claim history for a drone
   */
  static async getDroneClaimHistory(droneId: string, limit: number = 50): Promise<DroneClaim[]> {
    return DroneClaimRepository.getDroneClaimHistory(droneId, limit);
  }

  /**
   * Get paginated claim history for a drone
   */
  static async getPaginatedDroneClaimHistory(
    droneId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<PaginatedDroneClaimResponse> {
    return DroneClaimRepository.getPaginatedClaims({
      droneId,
      limit,
      offset
    });
  }

  /**
   * Get claims for a user
   */
  static async getUserClaims(userId: string, limit: number = 50): Promise<DroneClaim[]> {
    return DroneClaimRepository.getUserClaims(userId, limit);
  }

  /**
   * Get all claims with filtering
   */
  static async getClaims(queryParams?: DroneClaimQuery): Promise<DroneClaim[]> {
    return DroneClaimRepository.getClaims(queryParams);
  }

  /**
   * Get paginated claims with filtering
   */
  static async getPaginatedClaims(queryParams?: DroneClaimQuery): Promise<PaginatedDroneClaimResponse> {
    return DroneClaimRepository.getPaginatedClaims(queryParams);
  }

  /**
   * Format claim duration
   */
  static formatClaimDuration(startTime: Date, endTime?: Date): string {
    const end = endTime || new Date();
    const durationMs = end.getTime() - startTime.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Check if user can modify a specific claim
   */
  static canModifyClaim(claim: DroneClaim, userId: string, userRole: UserRole): boolean {
    return claim.userId === userId || this.canOverrideClaims(userRole);
  }

  /**
   * Check if drone is claimable by user
   */
  static async isDroneClaimable(droneId: string, userId: string, userRole: UserRole): Promise<boolean> {
    if (!this.canClaimDrones(userRole)) {
      return false;
    }

    try {
      const drone = await DroneRepository.getDrone(droneId);
      if (!drone || !drone.shareable || drone.isDeleted) {
        return false;
      }

      const activeClaim = await DroneClaimRepository.getActiveClaim(droneId);
      return !activeClaim || activeClaim.userId === userId;
    } catch (error) {
      console.error('Error checking if drone is claimable:', error);
      return false;
    }
  }
}