import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { ImageCacheService } from '@/utils/imageCache';
import { NetworkConnectivity } from '@/utils/networkConnectivity';
import { UserRole } from '@/types/UserRole';
import { AppSettingsService } from './appSettingsService';

/**
 * Cache metadata interface
 */
interface CacheMetadata {
  version: number;
  lastUpdated: number;
  userRole: UserRole;
  procedureCount: number;
  firestoreTimestamp: number | null;
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
   * Only downloads if cache is stale based on Firestore timestamps or doesn't exist for the user role
   */
  static async preDownloadProcedures(userRole: UserRole): Promise<void> {
    try {
      console.log('[OfflineProcedureService] Starting pre-download check for role:', userRole);
      
      // Check if we need to update cache based on timestamps
      const needsUpdate = await this.shouldUpdateCache(userRole);
      
      if (!needsUpdate) {
        console.log('[OfflineProcedureService] Cache is up to date, skipping pre-download');
        return;
      }
      
      console.log('[OfflineProcedureService] Cache needs update, starting pre-download');
      
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
   * Force refresh of cached procedures regardless of cache freshness
   * Useful when user explicitly wants to update procedures
   * @param userRole - The user role to refresh procedures for
   * @param procedures - Optional pre-fetched procedures to avoid double download
   */
  static async forceRefreshProcedures(userRole: UserRole, procedures?: ProcedureChecklist[]): Promise<void> {
    try {
      console.log('[OfflineProcedureService] Force refreshing procedures for role:', userRole);
      
      // Initialize image cache if not already done
      await ImageCacheService.initialize();
      
      // Use provided procedures or fetch from Firestore
      let proceduresToCache: ProcedureChecklist[];
      if (procedures) {
        console.log(`[OfflineProcedureService] Using provided ${procedures.length} procedures`);
        proceduresToCache = procedures;
      } else {
        console.log('[OfflineProcedureService] Fetching procedures from Firestore');
        proceduresToCache = await ProcedureChecklistService.getProcedureChecklists(userRole);
        console.log(`[OfflineProcedureService] Fetched ${proceduresToCache.length} procedures`);
      }
      
      // Cache procedures data
      await this.cacheProcedures(proceduresToCache, userRole);
      
      // Pre-download all images
      await this.preDownloadProcedureImages(proceduresToCache);
      
      console.log('[OfflineProcedureService] Force refresh completed successfully');
    } catch (error) {
      console.error('[OfflineProcedureService] Error during force refresh:', error);
      throw error;
    }
  }

  /**
   * Check if procedures need to be updated
   * Returns true if cache is stale based on Firestore timestamps or doesn't exist for the user role
   */
  static async needsUpdate(userRole: UserRole): Promise<boolean> {
    return this.shouldUpdateCache(userRole);
  }

  /**
   * Get procedures from cache or network with configurable behavior
   * Returns cached data for display (cache-first), fresh data for editing (force refresh)
   */
  static async getProcedureChecklists(
    userRole: UserRole, 
    options: { forceOffline?: boolean; forceRefresh?: boolean } = {}
  ): Promise<{
    procedures: ProcedureChecklist[];
    isFromCache: boolean;
  }> {
    try {
      const { forceOffline = false, forceRefresh = false } = options;

      // If force refresh is requested (e.g., for editing), always fetch from Firestore
      if (forceRefresh) {
        console.log('[OfflineProcedureService] Force refresh requested, fetching from Firestore');
        const freshProcedures = await ProcedureChecklistService.getProcedureChecklists(userRole);
        // Update cache with fresh data
        await this.cacheProcedures(freshProcedures, userRole);
        return { procedures: freshProcedures, isFromCache: false };
      }

      // Try to get cached data first (cache-first approach)
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

      // Online mode - return cached data if available (cache-first for display)
      if (cachedData) {
        console.log('[OfflineProcedureService] Returning cached procedures (cache-first)');
        return { procedures: cachedData, isFromCache: true };
      }

      // No cache available, fetch from network
      console.log('[OfflineProcedureService] No cache available, fetching fresh procedures from network');
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
  static async getProcedureChecklist(
    id: string, 
    userRole: UserRole, 
    options: { forceOffline?: boolean; forceRefresh?: boolean } = {}
  ): Promise<{
    procedure: ProcedureChecklist | null;
    isFromCache: boolean;
  }> {
    try {
      const { forceOffline = false, forceRefresh = false } = options;

      // If force refresh is requested (e.g., for editing), always fetch from Firestore
      if (forceRefresh) {
        console.log('[OfflineProcedureService] Force refresh requested for procedure:', id);
        const procedure = await ProcedureChecklistService.getProcedureChecklist(id, userRole);
        return { procedure, isFromCache: false };
      }

      // Check cache first
      const cachedProcedures = await this.getCachedProcedures(userRole);
      const cachedProcedure = cachedProcedures?.find(p => p.id === id) || null;
      
      if (forceOffline || !(await NetworkConnectivity.getConnectionStatus())) {
        console.log('[OfflineProcedureService] Returning cached procedure (offline mode)');
        return { procedure: cachedProcedure, isFromCache: true };
      }
      
      // Online mode - return cached procedure if available (cache-first for display)
      if (cachedProcedure) {
        console.log('[OfflineProcedureService] Returning cached procedure (cache-first)');
        return { procedure: cachedProcedure, isFromCache: true };
      }
      
      // No cached procedure, fetch from network
      console.log('[OfflineProcedureService] No cached procedure, fetching from network');
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
  /**
   * Cache procedures data to AsyncStorage
   */
  private static async cacheProcedures(procedures: ProcedureChecklist[], userRole: UserRole): Promise<void> {
    try {
      // Validate and sanitize procedures before caching
      const sanitizedProcedures = procedures.map(proc => ({
        ...proc,
        items: proc.items.map(item => ({
          ...item,
          // Ensure image URLs are Firebase URLs, not blob URLs
          image: item.image && item.image.startsWith('blob:') 
            ? undefined // Remove blob URLs from cached data
            : item.image
        }))
      }));

      // Serialize procedures with Date objects converted to ISO strings
      const serializedProcedures = sanitizedProcedures.map(proc => ({
        ...proc,
        createdAt: proc.createdAt?.toISOString(),
        updatedAt: proc.updatedAt?.toISOString(),
        deletedAt: proc.deletedAt?.toISOString(),
      }));

      // Get current Firestore timestamp for cache validation
      const firestoreTimestamp = await AppSettingsService.getProceduresLastUpdate();
      
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(serializedProcedures));
      
      // Save metadata with Firestore timestamp
      const metadata: CacheMetadata = {
        version: this.CACHE_VERSION,
        lastUpdated: Date.now(),
        userRole,
        procedureCount: procedures.length,
        firestoreTimestamp: firestoreTimestamp ? firestoreTimestamp.getTime() : null,
      };
      
      await AsyncStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata));
      console.log(`[OfflineProcedureService] Cached ${procedures.length} procedures for role: ${userRole}`);
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
   * Check if cache should be updated based on Firestore timestamps
   */
  private static async shouldUpdateCache(userRole: UserRole): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();
      
      // No cache exists or wrong user role
      if (!metadata || metadata.userRole !== userRole || metadata.version !== this.CACHE_VERSION) {
        return true;
      }

      // Get latest timestamp from Firestore
      const firestoreTimestamp = await AppSettingsService.getProceduresLastUpdate();
      const firestoreTimestampMs = firestoreTimestamp ? firestoreTimestamp.getTime() : 0;

      // Compare with cached timestamp
      if (!metadata.firestoreTimestamp || firestoreTimestampMs > metadata.firestoreTimestamp) {
        console.log('[OfflineProcedureService] Firestore timestamp is newer than cache');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[OfflineProcedureService] Error checking cache update need:', error);
      // If we can't check timestamps, assume cache needs update
      return true;
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
          if (item.image && !item.image.startsWith('blob:')) {
            // Only include Firebase storage URLs, skip blob URLs
            imageUrls.push(item.image);
          } else if (item.image && item.image.startsWith('blob:')) {
            console.warn('[OfflineProcedureService] Found blob URL in procedure data, skipping:', item.image);
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