import { User } from '@/types/User';
import { UserRole } from '@/types/UserRole';
import { toDateIfTimestamp, toFirestoreTimestamp } from '@/utils/dateUtils';
import { filterUndefinedProperties } from '@/utils/filterUndefinedProperties';
import {
  getCollection,
  getDocument,
  getDocumentData,
  updateDocument,
  createQuery,
  orderBy,
  getDocs,
  getDocsArray,
  timestampNow,
} from '@/utils/firebaseUtils';

export class UserRepository {
  private static readonly COLLECTION_NAME = 'users';

  /**
   * Get all users with date conversion
   */
  static async getUsers(): Promise<User[]> {
    try {
      const usersCollection = getCollection(this.COLLECTION_NAME);
      const q = createQuery(usersCollection, orderBy('email', 'asc'));
      
      const snapshot = await getDocs(q);
      const docs = getDocsArray(snapshot);
      
      return docs.map((doc: any) => this.convertFromFirestore(doc.id, doc.data));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get a single user by ID with date conversion
   */
  static async getUser(uid: string): Promise<User | null> {
    try {
      const userDoc = getDocument(this.COLLECTION_NAME, uid);
      const snapshot = await getDocumentData(userDoc);
      
      if (!snapshot.exists) {
        return null;
      }

      return this.convertFromFirestore(uid, snapshot.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Update an existing user with date conversion
   */
  static async updateUser(uid: string, userData: Partial<User>): Promise<void> {
    try {
      const userRef = getDocument(this.COLLECTION_NAME, uid);
      
      // Prepare data for Firestore (convert dates to Timestamps)
      const firestoreData: any = {
        ...userData,
        updatedAt: timestampNow(),
      };

      // Convert Date objects to Firestore Timestamps using the utility function
      if ('operatorValidityDate' in userData) {
        firestoreData.operatorValidityDate = toFirestoreTimestamp(userData.operatorValidityDate);
      }
      if ('pilotValidityDate' in userData) {
        firestoreData.pilotValidityDate = toFirestoreTimestamp(userData.pilotValidityDate);
      }
      if ('insurance' in userData) {
        firestoreData.insurance = toFirestoreTimestamp(userData.insurance);
      }

      await updateDocument(userRef, filterUndefinedProperties(firestoreData));
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Get user email by UID
   */
  static async getUserEmail(uid: string): Promise<string> {
    try {
      const userDoc = await getDocumentData(getDocument(this.COLLECTION_NAME, uid));
      
      if (!userDoc.exists) {
        return 'Unknown User';
      }

      const userData = userDoc.data;
      return userData.email || 'Unknown User';
    } catch (error) {
      console.error('Error fetching user email:', error);
      return 'Unknown User';
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const userDoc = getDocument(this.COLLECTION_NAME, uid);
      await updateDocument(userDoc, {
        lastLoginAt: timestampNow(),
      });
    } catch (error) {
      console.error('Error updating last login timestamp:', error);
      // Don't throw error to avoid breaking login flow
    }
  }

  /**
   * Get user public info (firstname, surname) by UID from publicUsers collection
   * Available to all authenticated users for audit trail display
   */
  static async getUserPublicInfo(uid: string): Promise<{firstname: string | null, surname: string | null}> {
    try {
      const publicUserDoc = await getDocumentData(getDocument('publicUsers', uid));
      
      if (!publicUserDoc.exists) {
        return { firstname: null, surname: null };
      }

      const publicUserData = publicUserDoc.data;
      return {
        firstname: publicUserData.firstname || null,
        surname: publicUserData.surname || null
      };
    } catch (error) {
      console.error('Error fetching user public info:', error);
      return { firstname: null, surname: null };
    }
  }

  /**
   * Convert Firestore document data to User domain object
   */
  private static convertFromFirestore(uid: string, data: any): User {
    return {
      uid: uid,
      ...data,
      // Convert Firestore Timestamps to Dates
      operatorValidityDate: toDateIfTimestamp(data.operatorValidityDate),
      pilotValidityDate: toDateIfTimestamp(data.pilotValidityDate),
      insurance: toDateIfTimestamp(data.insurance),
      createdAt: toDateIfTimestamp(data.createdAt),
      updatedAt: toDateIfTimestamp(data.updatedAt),
      lastLoginAt: toDateIfTimestamp(data.lastLoginAt),
    } as User;
  }
}