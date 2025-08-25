import {collection, doc, getDoc, getDocs, orderBy, query, Timestamp, updateDoc} from 'firebase/firestore';
import {db} from '@/firebaseConfig';
import {User} from '@/types/User';
import {UserRole} from "@/types/UserRole";
import {toDateIfTimestamp, toFirestoreTimestamp} from "@/utils/dateUtils";
import {filterUndefinedProperties} from "@/utils/filterUndefinedProperties";
import {AuditLogService} from "@/services/auditLogService";
import {Drone} from "@/types/Drone";

export class UserService {
  private static readonly COLLECTION_NAME = 'users';

  // Get all users (admin and manager)
  static async getUsers(userRole: UserRole): Promise<User[]> {
    if (userRole !== 'admin' && userRole !== 'manager') {
      throw new Error('Access denied. Only administrators and managers can view all users.');
    }

    try {
      const usersCollection = collection(db, this.COLLECTION_NAME);
      const q = query(usersCollection, orderBy('email', 'asc'));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to Dates
        operatorValidityDate: toDateIfTimestamp(doc.data().operatorValidityDate),
        pilotValidityDate: toDateIfTimestamp(doc.data().pilotValidityDate),
        insurance: toDateIfTimestamp(doc.data().insurance),
        createdAt: toDateIfTimestamp(doc.data().createdAt),
        updatedAt: toDateIfTimestamp(doc.data().updatedAt),
        lastLoginAt: toDateIfTimestamp(doc.data().lastLoginAt),
      } as User));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Get a single user by ID
  static async getUser(uid: string, requestorRole: UserRole, requestorUid: string): Promise<User | null> {
    // Users can view their own profile, managers and admins can view any profile
    if (requestorRole !== 'admin' && requestorRole !== 'manager' && requestorUid !== uid) {
      throw new Error('Access denied. You can only view your own profile.');
    }

    try {
      const userDoc = doc(db, this.COLLECTION_NAME, uid);
      const snapshot = await getDoc(userDoc);
      
      if (!snapshot.exists()) {
        return null;
      }

      const userData = snapshot.data();
      return {
        uid: snapshot.id,
        ...userData,
        // Convert Firestore Timestamps to Dates
        operatorValidityDate: toDateIfTimestamp(userData.operatorValidityDate),
        pilotValidityDate: toDateIfTimestamp(userData.pilotValidityDate),
        insurance: toDateIfTimestamp(userData.insurance),
        createdAt: toDateIfTimestamp(userData.createdAt),
        updatedAt: toDateIfTimestamp(userData.updatedAt),
        lastLoginAt: toDateIfTimestamp(userData.lastLoginAt),
      } as User;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
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
      const userRef = doc(db, this.COLLECTION_NAME, uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentUser = userDoc.data() as User;
      
      // Prepare data for Firestore (convert dates to Timestamps)
      const firestoreData: any = {
        ...userData,
        updatedAt: Timestamp.now(),
      };

      // Convert Date objects to Firestore Timestamps using the utility function
      // This fixes the issue where form date fields come as strings (YYYY-MM-DD) 
      // and need to be converted to proper Firestore Timestamps to avoid 
      // { seconds, nanoseconds } objects being saved to the database
      // 
      // Process date fields even when undefined to allow clearing them (undefined -> null)
      // Manual test: Edit a user profile with date fields, save, check Firestore console
      if ('operatorValidityDate' in userData) {
        firestoreData.operatorValidityDate = toFirestoreTimestamp(userData.operatorValidityDate);
      }
      if ('pilotValidityDate' in userData) {
        firestoreData.pilotValidityDate = toFirestoreTimestamp(userData.pilotValidityDate);
      }
      if ('insurance' in userData) {
        firestoreData.insurance = toFirestoreTimestamp(userData.insurance);
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

      await updateDoc(userRef, filterUndefinedProperties(firestoreData));

      const requestorEmail = await UserService.getUserEmail(requestorUid);
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
    try {
      const userDoc = await getDoc(doc(db, this.COLLECTION_NAME, uid));
      
      if (!userDoc.exists()) {
        return 'Unknown User';
      }

      const userData = userDoc.data();
      return userData.email || 'Unknown User';
    } catch (error) {
      console.error('Error fetching user email:', error);
      return 'Unknown User';
    }
  }

  // Update last login timestamp
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userDoc = doc(db, this.COLLECTION_NAME, uid);
      await updateDoc(userDoc, {
        lastLoginAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating last login timestamp:', error);
      // Don't throw error to avoid breaking login flow
    }
  }
}
