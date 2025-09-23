import { 
  getCollection, 
  getDocument, 
  getDocumentData, 
  updateDocument, 
  setDocument,
  timestampNow 
} from '@/utils/firebaseUtils';
import { firestore } from '@/firebaseConfig';

/**
 * AppSettings service for managing application-level settings in Firestore
 * Tracks last update timestamps for categories and procedures to enable efficient cache synchronization
 */
export class AppSettingsService {
  private static readonly COLLECTION_NAME = 'appsettings';
  private static readonly CATEGORIES_LAST_UPDATE_DOC = 'categoriesLastUpdate';
  private static readonly PROCEDURES_LAST_UPDATE_DOC = 'proceduresLastUpdate';

  /**
   * Get the last update timestamp for categories
   */
  static async getCategoriesLastUpdate(): Promise<Date | null> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, this.CATEGORIES_LAST_UPDATE_DOC);
      const docData = await getDocumentData(docRef);
      
      if (docData.exists && docData.data?.timestamp) {
        return docData.data.timestamp.toDate();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting categories last update timestamp:', error);
      return null;
    }
  }

  /**
   * Get the last update timestamp for procedures
   */
  static async getProceduresLastUpdate(): Promise<Date | null> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, this.PROCEDURES_LAST_UPDATE_DOC);
      const docData = await getDocumentData(docRef);
      
      if (docData.exists && docData.data?.timestamp) {
        return docData.data.timestamp.toDate();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting procedures last update timestamp:', error);
      return null;
    }
  }

  /**
   * Update the last update timestamp for categories
   */
  static async updateCategoriesLastUpdate(): Promise<void> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, this.CATEGORIES_LAST_UPDATE_DOC);
      const timestamp = timestampNow();
      
      await setDocument(docRef, { 
        timestamp,
        updatedAt: timestamp
      });
      
      console.log('[AppSettings] Categories last update timestamp updated');
    } catch (error) {
      console.error('Error updating categories last update timestamp:', error);
      throw error;
    }
  }

  /**
   * Update the last update timestamp for procedures
   */
  static async updateProceduresLastUpdate(): Promise<void> {
    try {
      const docRef = getDocument(this.COLLECTION_NAME, this.PROCEDURES_LAST_UPDATE_DOC);
      const timestamp = timestampNow();
      
      await setDocument(docRef, { 
        timestamp,
        updatedAt: timestamp
      });
      
      console.log('[AppSettings] Procedures last update timestamp updated');
    } catch (error) {
      console.error('Error updating procedures last update timestamp:', error);
      throw error;
    }
  }

  /**
   * Get both timestamps in a single call for efficiency
   */
  static async getLastUpdateTimestamps(): Promise<{
    categoriesLastUpdate: Date | null;
    proceduresLastUpdate: Date | null;
  }> {
    try {
      const [categoriesTimestamp, proceduresTimestamp] = await Promise.all([
        this.getCategoriesLastUpdate(),
        this.getProceduresLastUpdate()
      ]);

      return {
        categoriesLastUpdate: categoriesTimestamp,
        proceduresLastUpdate: proceduresTimestamp
      };
    } catch (error) {
      console.error('Error getting last update timestamps:', error);
      return {
        categoriesLastUpdate: null,
        proceduresLastUpdate: null
      };
    }
  }

  /**
   * Initialize app settings with default timestamps if they don't exist
   */
  static async initializeAppSettings(): Promise<void> {
    try {
      const timestamps = await this.getLastUpdateTimestamps();
      
      // Initialize categories timestamp if it doesn't exist
      if (!timestamps.categoriesLastUpdate) {
        await this.updateCategoriesLastUpdate();
      }
      
      // Initialize procedures timestamp if it doesn't exist
      if (!timestamps.proceduresLastUpdate) {
        await this.updateProceduresLastUpdate();
      }
      
      console.log('[AppSettings] App settings initialized');
    } catch (error) {
      console.error('Error initializing app settings:', error);
      throw error;
    }
  }
}