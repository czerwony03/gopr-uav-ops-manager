import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { ImageCacheService } from '@/utils/imageCache';
import { NetworkConnectivity } from '@/utils/networkConnectivity';
import { UserRole } from '@/types/UserRole';

/**
 * Cache metadata interface
 */
interface CacheMetadata {
  version: number;
  lastUpdated: number;
  userRole: UserRole;
  procedureCount: number;
}

/**
 * Service for managing offline access to procedures and checklists
 * Handles pre-downloading, caching, and serving cached data when offline
 */
export class OfflineProcedureChecklistService {
  private static readonly CACHE_KEY = 'cached_procedures';
  private static readonly CACHE_METADATA_KEY = 'cached_procedures_metadata';
  private static readonly CACHE_VERSION = 1;
  private static readonly CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

  /**
   * Pre-download and cache all procedures with their images
   * Should be called after successful user login
   */
  static async preDownloadProcedures(userRole: UserRole): Promise<void> {
    try {
      console.log('[OfflineProcedureService] Starting pre-download of procedures for role:', userRole);
      
      // Initialize image cache if not already done
      await ImageCacheService.initialize();
      
      // Fetch all procedures from Firestore
      const procedures = await ProcedureChecklistService.getProcedureChecklists(userRole);
      console.log(`[OfflineProcedureService] Fetched ${procedures.length} procedures`);
      
      // Cache procedures data
      await this.cacheProcedures(procedures, userRole);
      
      // Pre-download all images
      await this.preDownloadProcedureImages(procedures);
      
      console.log('[OfflineProcedureService] Pre-download completed successfully');
    } catch (error) {
      console.error('[OfflineProcedureService] Error during pre-download:', error);
      throw error;
    }
  }

  /**
   * Get procedures from cache or fallback to network
   * Returns cached data if offline or if fresh cache is available
   */
  static async getProcedureChecklists(userRole: UserRole, forceOffline: boolean = false): Promise<{
    procedures: ProcedureChecklist[];
    isFromCache: boolean;
  }> {
    try {
      // Check if we have valid cached data
      const cachedData = await this.getCachedProcedures(userRole);
      
      if (forceOffline || !(await NetworkConnectivity.getConnectionStatus())) {
        // We're offline, return cached data or empty array
        if (cachedData) {
          console.log('[OfflineProcedureService] Returning cached procedures (offline mode)');
          return { procedures: cachedData, isFromCache: true };
        } else {
          console.log('[OfflineProcedureService] No cached data available in offline mode');
          return { procedures: [], isFromCache: true };
        }
      }
      
      // We're online, check if cache is fresh
      if (cachedData && await this.isCacheFresh()) {
        console.log('[OfflineProcedureService] Returning fresh cached procedures');
        return { procedures: cachedData, isFromCache: true };
      }
      
      // Cache is stale or doesn't exist, fetch from network
      console.log('[OfflineProcedureService] Fetching fresh procedures from network');
      const procedures = await ProcedureChecklistService.getProcedureChecklists(userRole);
      
      // Update cache in background
      this.cacheProcedures(procedures, userRole).catch(error => {
        console.error('[OfflineProcedureService] Error updating cache:', error);
      });
      
      return { procedures, isFromCache: false };
    } catch (error) {
      console.error('[OfflineProcedureService] Error getting procedures:', error);
      
      // Fallback to cached data if available
      const cachedData = await this.getCachedProcedures(userRole);
      if (cachedData) {
        console.log('[OfflineProcedureService] Fallback to cached procedures due to error');
        return { procedures: cachedData, isFromCache: true };
      }
      
      throw error;
    }
  }

  /**
   * Get a specific procedure from cache or network
   */
  static async getProcedureChecklist(id: string, userRole: UserRole, forceOffline: boolean = false): Promise<{
    procedure: ProcedureChecklist | null;
    isFromCache: boolean;
  }> {
    try {
      // Check cache first
      const cachedProcedures = await this.getCachedProcedures(userRole);
      const cachedProcedure = cachedProcedures?.find(p => p.id === id) || null;
      
      if (forceOffline || !(await NetworkConnectivity.getConnectionStatus())) {
        console.log('[OfflineProcedureService] Returning cached procedure (offline mode)');
        return { procedure: cachedProcedure, isFromCache: true };
      }
      
      // If we have fresh cache, use it
      if (cachedProcedure && await this.isCacheFresh()) {
        console.log('[OfflineProcedureService] Returning cached procedure (fresh cache)');
        return { procedure: cachedProcedure, isFromCache: true };
      }
      
      // Fetch from network
      console.log('[OfflineProcedureService] Fetching procedure from network');
      const procedure = await ProcedureChecklistService.getProcedureChecklist(id, userRole);
      
      return { procedure, isFromCache: false };
    } catch (error) {
      console.error('[OfflineProcedureService] Error getting procedure:', error);
      
      // Fallback to cached data
      const cachedProcedures = await this.getCachedProcedures(userRole);
      const cachedProcedure = cachedProcedures?.find(p => p.id === id) || null;
      
      if (cachedProcedure) {
        console.log('[OfflineProcedureService] Fallback to cached procedure due to error');
        return { procedure: cachedProcedure, isFromCache: true };
      }
      
      throw error;
    }
  }

  /**
   * Clear all cached procedures and images
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      await AsyncStorage.removeItem(this.CACHE_METADATA_KEY);
      await ImageCacheService.clearCache();
      console.log('[OfflineProcedureService] Cache cleared successfully');
    } catch (error) {
      console.error('[OfflineProcedureService] Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    procedureCount: number;
    lastUpdated: Date | null;
    cacheSize: number;
  }> {
    try {
      const metadata = await this.getCacheMetadata();
      const imageStats = await ImageCacheService.getCacheStats();
      
      return {
        procedureCount: metadata?.procedureCount || 0,
        lastUpdated: metadata ? new Date(metadata.lastUpdated) : null,
        cacheSize: imageStats.size,
      };
    } catch (error) {
      console.error('[OfflineProcedureService] Error getting cache stats:', error);
      return {
        procedureCount: 0,
        lastUpdated: null,
        cacheSize: 0,
      };
    }
  }

  /**
   * Cache procedures data to AsyncStorage
   */
  private static async cacheProcedures(procedures: ProcedureChecklist[], userRole: UserRole): Promise<void> {
    try {
      // Serialize procedures with Date objects converted to ISO strings
      const serializedProcedures = procedures.map(proc => ({
        ...proc,
        createdAt: proc.createdAt?.toISOString(),
        updatedAt: proc.updatedAt?.toISOString(),
        deletedAt: proc.deletedAt?.toISOString(),
      }));
      
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(serializedProcedures));
      
      // Save metadata
      const metadata: CacheMetadata = {
        version: this.CACHE_VERSION,
        lastUpdated: Date.now(),
        userRole,
        procedureCount: procedures.length,
      };
      
      await AsyncStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata));
      console.log(`[OfflineProcedureService] Cached ${procedures.length} procedures`);
    } catch (error) {
      console.error('[OfflineProcedureService] Error caching procedures:', error);
      throw error;
    }
  }

  /**
   * Get cached procedures from AsyncStorage
   */
  private static async getCachedProcedures(userRole: UserRole): Promise<ProcedureChecklist[] | null> {
    try {
      const metadata = await this.getCacheMetadata();
      
      // Check if cache exists and is for the correct user role
      if (!metadata || metadata.userRole !== userRole || metadata.version !== this.CACHE_VERSION) {
        return null;
      }
      
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cachedData) {
        return null;
      }
      
      // Deserialize procedures with Date objects restored
      const serializedProcedures = JSON.parse(cachedData);
      const procedures = serializedProcedures.map((proc: any) => ({
        ...proc,
        createdAt: proc.createdAt ? new Date(proc.createdAt) : undefined,
        updatedAt: proc.updatedAt ? new Date(proc.updatedAt) : undefined,
        deletedAt: proc.deletedAt ? new Date(proc.deletedAt) : undefined,
      }));
      
      return procedures;
    } catch (error) {
      console.error('[OfflineProcedureService] Error getting cached procedures:', error);
      return null;
    }
  }

  /**
   * Get cache metadata
   */
  private static async getCacheMetadata(): Promise<CacheMetadata | null> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.CACHE_METADATA_KEY);
      return metadataStr ? JSON.parse(metadataStr) : null;
    } catch (error) {
      console.error('[OfflineProcedureService] Error getting cache metadata:', error);
      return null;
    }
  }

  /**
   * Check if cache is fresh (not expired)
   */
  private static async isCacheFresh(): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();
      if (!metadata) {
        return false;
      }
      
      const cacheAge = Date.now() - metadata.lastUpdated;
      const cacheExpiryMs = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
      
      return cacheAge < cacheExpiryMs;
    } catch (error) {
      console.error('[OfflineProcedureService] Error checking cache freshness:', error);
      return false;
    }
  }

  /**
   * Pre-download all images from procedures
   */
  private static async preDownloadProcedureImages(procedures: ProcedureChecklist[]): Promise<void> {
    try {
      const imageUrls: string[] = [];
      
      // Collect all image URLs from procedure items
      procedures.forEach(procedure => {
        procedure.items.forEach(item => {
          if (item.image) {
            imageUrls.push(item.image);
          }
        });
      });
      
      console.log(`[OfflineProcedureService] Pre-downloading ${imageUrls.length} images`);
      
      // Pre-download images in parallel (with some throttling)
      const batchSize = 5;
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(url => 
            ImageCacheService.preloadImage(url).catch(error => {
              console.warn(`[OfflineProcedureService] Failed to preload image ${url}:`, error);
            })
          )
        );
      }
      
      console.log('[OfflineProcedureService] Image pre-download completed');
    } catch (error) {
      console.error('[OfflineProcedureService] Error pre-downloading images:', error);
      // Don't throw - image pre-download is optional
    }
  }
}