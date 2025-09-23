import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '@/types/Category';
import { UserRole } from '@/types/UserRole';
import { CategoryService } from './categoryService';
import { AppSettingsService } from './appSettingsService';
import { useNetworkStatus } from '@/utils/useNetworkStatus';

/**
 * Cache metadata interface for categories
 */
interface CategoryCacheMetadata {
  version: number;
  lastUpdated: number;
  userRole: UserRole;
  categoryCount: number;
  firestoreTimestamp: number | null;
}

/**
 * Service for managing offline access to categories
 * Handles pre-downloading, caching, and serving cached data when offline
 * Uses timestamp-based cache validation with Firestore appsettings
 */
export class OfflineCategoryService {
  private static readonly CACHE_KEY = 'cached_categories';
  private static readonly CACHE_METADATA_KEY = 'cached_categories_metadata';
  private static readonly CACHE_VERSION = 1;

  /**
   * Pre-download and cache all categories
   * Only downloads if cache is stale based on Firestore timestamps or doesn't exist for the user role
   */
  static async preDownloadCategories(userRole: UserRole): Promise<void> {
    try {
      console.log('[OfflineCategoryService] Checking if categories cache needs update for role:', userRole);
      
      // Check if we need to update cache based on timestamps
      const needsUpdate = await this.shouldUpdateCache(userRole);
      
      if (!needsUpdate) {
        console.log('[OfflineCategoryService] Categories cache is up to date');
        return;
      }

      console.log('[OfflineCategoryService] Cache needs update, refreshing categories');
      await this.forceRefreshCategories(userRole);
    } catch (error) {
      console.error('[OfflineCategoryService] Error in preDownloadCategories:', error);
      // Don't throw error - let app continue with potentially stale cache
    }
  }

  /**
   * Force refresh of cached categories regardless of cache freshness
   */
  static async forceRefreshCategories(userRole: UserRole, categories?: Category[]): Promise<void> {
    try {
      console.log('[OfflineCategoryService] Force refreshing categories for role:', userRole);
      
      // Use provided categories or fetch from Firestore
      let categoriesToCache: Category[];
      if (categories) {
        console.log(`[OfflineCategoryService] Using provided ${categories.length} categories`);
        categoriesToCache = categories;
      } else {
        console.log('[OfflineCategoryService] Fetching categories from Firestore');
        categoriesToCache = await CategoryService.getCategories(userRole);
        console.log(`[OfflineCategoryService] Fetched ${categoriesToCache.length} categories`);
      }
      
      // Cache categories data
      await this.cacheCategories(categoriesToCache, userRole);
      
      console.log('[OfflineCategoryService] Categories cache refresh completed');
    } catch (error) {
      console.error('[OfflineCategoryService] Error in forceRefreshCategories:', error);
      throw error;
    }
  }

  /**
   * Get categories from cache or Firestore
   * Always returns cached data for display, fetches fresh data only when explicitly requested
   */
  static async getCategories(userRole: UserRole, forceRefresh: boolean = false): Promise<Category[]> {
    try {
      // If force refresh is requested (e.g., for editing), always fetch from Firestore
      if (forceRefresh) {
        console.log('[OfflineCategoryService] Force refresh requested, fetching from Firestore');
        const freshCategories = await CategoryService.getCategories(userRole);
        // Update cache with fresh data
        await this.cacheCategories(freshCategories, userRole);
        return freshCategories;
      }

      // Try to get cached categories first (cache-first approach)
      const cachedCategories = await this.getCachedCategories(userRole);
      if (cachedCategories) {
        console.log(`[OfflineCategoryService] Returning ${cachedCategories.length} cached categories`);
        return cachedCategories;
      }

      // No cache available, fetch from Firestore
      console.log('[OfflineCategoryService] No cache available, fetching from Firestore');
      const categories = await CategoryService.getCategories(userRole);
      
      // Cache the fetched data for future use
      await this.cacheCategories(categories, userRole);
      
      return categories;
    } catch (error) {
      console.error('[OfflineCategoryService] Error in getCategories:', error);
      
      // If we have cached data, return it as fallback
      const cachedCategories = await this.getCachedCategories(userRole);
      if (cachedCategories) {
        console.log('[OfflineCategoryService] Error occurred, falling back to cached data');
        return cachedCategories;
      }
      
      throw error;
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
      const firestoreTimestamp = await AppSettingsService.getCategoriesLastUpdate();
      const firestoreTimestampMs = firestoreTimestamp ? firestoreTimestamp.getTime() : 0;

      // Compare with cached timestamp
      if (!metadata.firestoreTimestamp || firestoreTimestampMs > metadata.firestoreTimestamp) {
        console.log('[OfflineCategoryService] Firestore timestamp is newer than cache');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[OfflineCategoryService] Error checking cache update need:', error);
      // If we can't check timestamps, assume cache needs update
      return true;
    }
  }

  /**
   * Cache categories data to AsyncStorage
   */
  private static async cacheCategories(categories: Category[], userRole: UserRole): Promise<void> {
    try {
      // Serialize categories with Date objects converted to ISO strings
      const serializedCategories = categories.map(category => ({
        ...category,
        createdAt: category.createdAt?.toISOString(),
        updatedAt: category.updatedAt?.toISOString(),
        deletedAt: category.deletedAt?.toISOString(),
      }));

      // Get current Firestore timestamp for cache validation
      const firestoreTimestamp = await AppSettingsService.getCategoriesLastUpdate();

      // Create cache metadata
      const metadata: CategoryCacheMetadata = {
        version: this.CACHE_VERSION,
        lastUpdated: Date.now(),
        userRole,
        categoryCount: categories.length,
        firestoreTimestamp: firestoreTimestamp ? firestoreTimestamp.getTime() : null,
      };

      // Save both data and metadata
      await Promise.all([
        AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(serializedCategories)),
        AsyncStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata))
      ]);

      console.log(`[OfflineCategoryService] Cached ${categories.length} categories for role: ${userRole}`);
    } catch (error) {
      console.error('[OfflineCategoryService] Error caching categories:', error);
      throw error;
    }
  }

  /**
   * Get cached categories from AsyncStorage
   */
  private static async getCachedCategories(userRole: UserRole): Promise<Category[] | null> {
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
      
      // Deserialize categories with Date objects restored
      const serializedCategories = JSON.parse(cachedData);
      const categories = serializedCategories.map((category: any) => ({
        ...category,
        createdAt: category.createdAt ? new Date(category.createdAt) : undefined,
        updatedAt: category.updatedAt ? new Date(category.updatedAt) : undefined,
        deletedAt: category.deletedAt ? new Date(category.deletedAt) : undefined,
      }));

      return categories;
    } catch (error) {
      console.error('[OfflineCategoryService] Error getting cached categories:', error);
      return null;
    }
  }

  /**
   * Get cache metadata
   */
  private static async getCacheMetadata(): Promise<CategoryCacheMetadata | null> {
    try {
      const metadataJson = await AsyncStorage.getItem(this.CACHE_METADATA_KEY);
      return metadataJson ? JSON.parse(metadataJson) : null;
    } catch (error) {
      console.error('[OfflineCategoryService] Error getting cache metadata:', error);
      return null;
    }
  }

  /**
   * Clear all cached categories data
   */
  static async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.CACHE_KEY),
        AsyncStorage.removeItem(this.CACHE_METADATA_KEY)
      ]);
      console.log('[OfflineCategoryService] Categories cache cleared');
    } catch (error) {
      console.error('[OfflineCategoryService] Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache by removing metadata
   * This will force a refresh on next access
   */
  static async invalidateCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_METADATA_KEY);
      console.log('[OfflineCategoryService] Categories cache invalidated');
    } catch (error) {
      console.error('[OfflineCategoryService] Error invalidating cache:', error);
      throw error;
    }
  }
}