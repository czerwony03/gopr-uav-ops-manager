import {collection, doc, getDoc, getDocs, orderBy, query, Timestamp, updateDoc} from 'firebase/firestore';
import {db} from '@/firebaseConfig';
import {User} from '@/types/User';
import {UserRole} from "@/types/UserRole";
import {toDateIfTimestamp} from "@/utils/dateUtils";
import {filterUndefinedProperties} from "@/utils/filterUndefinedProperties";

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
        operatorValidityDate: doc.data().operatorValidityDate?.toDate(),
        pilotValidityDate: doc.data().pilotValidityDate?.toDate(),
        insurance: doc.data().insurance?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastLoginAt: doc.data().lastLoginAt?.toDate(),
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
      const userDoc = doc(db, this.COLLECTION_NAME, uid);
      
      // Prepare data for Firestore (convert dates to Timestamps)
      const firestoreData: any = {
        ...userData,
        updatedAt: Timestamp.now(),
      };

      // Convert Date objects to Firestore Timestamps
      if (userData.operatorValidityDate) {
        firestoreData.operatorValidityDate = Timestamp.fromDate(userData.operatorValidityDate);
      }
      if (userData.pilotValidityDate) {
        firestoreData.pilotValidityDate = Timestamp.fromDate(userData.pilotValidityDate);
      }
      if (userData.insurance) {
        firestoreData.insurance = Timestamp.fromDate(userData.insurance);
      }

      await updateDoc(userDoc, filterUndefinedProperties(firestoreData));
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
