import {User} from '@/types/User';
import {UserRole} from "@/types/UserRole";
import {toDateIfTimestamp, toFirestoreTimestamp} from "@/utils/dateUtils";
import {AuditLogService} from "@/services/auditLogService";
import {UserRepository} from "@/repositories/UserRepository";

export class UserService {
  // Get all users (admin and manager)
  static async getUsers(userRole: UserRole): Promise<User[]> {
    if (userRole !== 'admin' && userRole !== 'manager') {
      throw new Error('Access denied. Only administrators and managers can view all users.');
    }

    return UserRepository.getUsers();
  }

  // Get a single user by ID
  static async getUser(uid: string, requestorRole: UserRole, requestorUid: string): Promise<User | null> {
    // Users can view their own profile, managers and admins can view any profile
    if (requestorRole !== 'admin' && requestorRole !== 'manager' && requestorUid !== uid) {
      throw new Error('Access denied. You can only view your own profile.');
    }

    return UserRepository.getUser(uid);
  }

  // Update an existing user
  static async updateUser(
    uid: string, 
    userData: Partial<User>, 
    requestorRole: UserRole, 
    requestorUid: string
  ): Promise<void> {
    // Users can update their own profile (except role), managers and admins can update any profile
    if (requestorRole !== UserRole.ADMIN && requestorRole !== UserRole.MANAGER && requestorUid !== uid) {
      throw new Error('Access denied. You can only update your own profile.');
    }

    // Only admins can change roles
    if (userData.role && requestorRole !== UserRole.ADMIN) {
      throw new Error('Access denied. Only administrators can change user roles.');
    }

    try {
      // Get current user data for audit logging
      const currentUser = await UserRepository.getUser(uid);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Store previous values for audit log - convert existing Firestore timestamps to Date objects for proper comparison
      const previousValues = {
        ...currentUser,
        operatorValidityDate: toDateIfTimestamp(currentUser.operatorValidityDate),
        pilotValidityDate: toDateIfTimestamp(currentUser.pilotValidityDate),
        insurance: toDateIfTimestamp(currentUser.insurance),
      };
      
      // Store new values for audit log - ensure date fields are properly converted
      const newValues = { ...previousValues }; // Start with current state
      
      // Apply updates - convert the data that will be saved to what it will look like after save
      Object.keys(userData).forEach(key => {
        if (key === 'operatorValidityDate' || key === 'pilotValidityDate' || key === 'insurance') {
          // Convert to Date object for audit log (what will be displayed) - handling undefined to null conversion
          const inputValue = userData[key as keyof typeof userData];
          const timestampValue = toFirestoreTimestamp(inputValue);
          (newValues as any)[key] = timestampValue ? timestampValue.toDate() : null;
        } else {
          (newValues as any)[key] = userData[key as keyof typeof userData];
        }
      });

      // Update user in repository
      await UserRepository.updateUser(uid, userData);

      // Create audit log entry
      const requestorEmail = await UserRepository.getUserEmail(requestorUid);
      await AuditLogService.createAuditLog({
        entityType: 'user',
        entityId: uid,
        action: 'edit',
        userId: requestorUid,
        userEmail: requestorEmail,
        details: AuditLogService.createChangeDetails('edit', 'user', { previous: previousValues, new: newValues }),
        previousValues,
        newValues
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Get user email by UID (for audit trail display)
  static async getUserEmail(uid: string): Promise<string> {
    return UserRepository.getUserEmail(uid);
  }

  // Get user public info (firstname, surname) for audit trail display
  // Available to all authenticated users via publicUsers collection
  static async getUserPublicInfo(uid: string): Promise<UserPublicInfo> {
    try {
      const publicInfo = await UserRepository.getUserPublicInfo(uid);
      
      // Generate display name from available data
      const displayName = publicInfo.firstname && publicInfo.surname 
        ? `${publicInfo.firstname} ${publicInfo.surname}`
        : await UserRepository.getUserEmail(uid); // Fallback to email if names not available

      return {
        uid,
        firstname: publicInfo.firstname,
        surname: publicInfo.surname,
        displayName
      };
    } catch (error) {
      console.error('Error fetching user public info:', error);
      // Final fallback
      const email = await UserRepository.getUserEmail(uid);
      return {
        uid,
        firstname: null,
        surname: null,
        displayName: email
      };
    }
  }

  // Get display name for user (firstname + surname or email fallback)
  // This method provides the best available display name for any user
  static async getUserDisplayName(uid: string): Promise<string> {
    const publicInfo = await UserService.getUserPublicInfo(uid);
    return publicInfo.displayName;
  }

  // Update last login timestamp
  static async updateLastLogin(uid: string): Promise<void> {
    await UserRepository.updateLastLogin(uid);
  }
}
