import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Configuration for image caching
 */
export interface ImageCacheConfig {
  maxCacheSize?: number; // Maximum cache size in MB
  maxAge?: number; // Maximum age of cached images in milliseconds
  cacheDirectory?: string; // Custom cache directory name
}

/**
 * Default configuration for image caching
 */
const DEFAULT_CONFIG: Required<ImageCacheConfig> = {
  maxCacheSize: 100, // 100 MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  cacheDirectory: 'ImageCache',
};

/**
 * Cached image metadata
 */
interface CachedImageMetadata {
  uri: string;
  localPath: string;
  cachedAt: number;
  size: number;
  originalUrl: string;
}

/**
 * Cross-platform image caching utility
 * Uses expo-file-system for mobile and IndexedDB/localStorage for web
 */
export class ImageCacheService {
  private static config: Required<ImageCacheConfig> = DEFAULT_CONFIG;
  private static cacheDirectory: string = '';
  private static isInitialized: boolean = false;

  /**
   * Initialize the image cache service
   */
  static async initialize(config: ImageCacheConfig = {}): Promise<void> {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (Platform.OS === 'web') {
      await this.initializeWebCache();
    } else {
      await this.initializeMobileCache();
    }
    
    this.isInitialized = true;
    
    // Clean up old cache entries
    await this.cleanupCache();
  }

  /**
   * Get a cached image or download and cache it
   */
  static async getCachedImage(imageUrl: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check if image is already cached
      const cachedImage = await this.getCachedImageMetadata(imageUrl);
      
      if (cachedImage && await this.isCacheValid(cachedImage)) {
        if (Platform.OS === 'web') {
          return cachedImage.uri; // For web, this is a blob URL
        } else {
          return cachedImage.localPath; // For mobile, this is a file path
        }
      }

      // Image not cached or cache invalid, download and cache it
      return await this.downloadAndCacheImage(imageUrl);
    } catch (error) {
      console.error('Error getting cached image:', error);
      // Fallback to original URL
      return imageUrl;
    }
  }

  /**
   * Preload and cache an image
   */
  static async preloadImage(imageUrl: string): Promise<void> {
    try {
      await this.getCachedImage(imageUrl);
    } catch (error) {
      console.error('Error preloading image:', error);
    }
  }

  /**
   * Clear the entire image cache
   */
  static async clearCache(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await this.clearWebCache();
      } else {
        await this.clearMobileCache();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ size: number; count: number }> {
    try {
      if (Platform.OS === 'web') {
        return await this.getWebCacheStats();
      } else {
        return await this.getMobileCacheStats();
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { size: 0, count: 0 };
    }
  }

  /**
   * Remove a specific image from cache
   */
  static async removeFromCache(imageUrl: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(imageUrl);
      
      if (Platform.OS === 'web') {
        await this.removeFromWebCache(cacheKey);
      } else {
        await this.removeFromMobileCache(cacheKey);
      }
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }

  // Private methods

  /**
   * Initialize mobile cache
   */
  private static async initializeMobileCache(): Promise<void> {
    if (!FileSystem.cacheDirectory) {
      throw new Error('Cache directory not available');
    }

    this.cacheDirectory = `${FileSystem.cacheDirectory}${this.config.cacheDirectory}/`;
    
    // Create cache directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
    }
  }

  /**
   * Initialize web cache
   */
  private static async initializeWebCache(): Promise<void> {
    // Check if IndexedDB is supported and working
    const indexedDBSupported = await this.checkIndexedDBSupport();
    
    if (indexedDBSupported) {
      try {
        // Initialize IndexedDB database
        const db = await this.openIndexedDB();
        db.close(); // Close immediately after successful initialization
        console.log('[ImageCache] IndexedDB initialized successfully');
        return;
      } catch (error) {
        console.warn('Failed to initialize IndexedDB, falling back to localStorage:', error);
        this.resetIndexedDBState(); // Reset state on failure
      }
    }
    
    // Fallback to localStorage (limited storage)
    if (typeof window !== 'undefined' && window.localStorage) {
      console.log('[ImageCache] Using localStorage fallback');
      return;
    }
    
    throw new Error('No storage mechanism available for web cache');
  }

  /**
   * Download and cache an image
   */
  private static async downloadAndCacheImage(imageUrl: string): Promise<string> {
    if (Platform.OS === 'web') {
      return await this.downloadAndCacheImageWeb(imageUrl);
    } else {
      return await this.downloadAndCacheImageMobile(imageUrl);
    }
  }

  /**
   * Download and cache image on mobile
   */
  private static async downloadAndCacheImageMobile(imageUrl: string): Promise<string> {
    const cacheKey = this.getCacheKey(imageUrl);
    const localPath = `${this.cacheDirectory}${cacheKey}`;

    try {
      // Download the image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const size = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size || 0 : 0;

      // Save metadata
      const metadata: CachedImageMetadata = {
        uri: localPath,
        localPath,
        cachedAt: Date.now(),
        size,
        originalUrl: imageUrl,
      };

      await this.saveCacheMetadata(cacheKey, metadata);

      return localPath;
    } catch (error) {
      console.error('Error downloading and caching image on mobile:', error);
      // Clean up partial download
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Download and cache image on web
   */
  private static async downloadAndCacheImageWeb(imageUrl: string): Promise<string> {
    const cacheKey = this.getCacheKey(imageUrl);

    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Save to IndexedDB or localStorage
      const metadata: CachedImageMetadata = {
        uri: blobUrl,
        localPath: blobUrl,
        cachedAt: Date.now(),
        size: blob.size,
        originalUrl: imageUrl,
      };

      // Store reference to prevent garbage collection
      this.activeBlobUrls.set(cacheKey, {
        url: blobUrl,
        blob: blob,
        created: Date.now()
      });

      await this.saveCacheMetadataWeb(cacheKey, metadata, blob);

      console.log(`[ImageCache] Downloaded and cached image: ${imageUrl}`);
      return blobUrl;
    } catch (error) {
      console.error('Error downloading and caching image on web:', error);
      throw error;
    }
  }

  /**
   * Get cached image metadata
   */
  private static async getCachedImageMetadata(imageUrl: string): Promise<CachedImageMetadata | null> {
    const cacheKey = this.getCacheKey(imageUrl);
    
    try {
      if (Platform.OS === 'web') {
        return await this.getCachedImageMetadataWeb(cacheKey);
      } else {
        return await this.getCachedImageMetadataMobile(cacheKey);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cached image metadata on mobile
   */
  private static async getCachedImageMetadataMobile(cacheKey: string): Promise<CachedImageMetadata | null> {
    try {
      const metadataString = await AsyncStorage.getItem(`ImageCache_${cacheKey}`);
      if (!metadataString) {
        return null;
      }

      const metadata: CachedImageMetadata = JSON.parse(metadataString);
      
      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(metadata.localPath);
      if (!fileInfo.exists) {
        // File was deleted, remove metadata
        await AsyncStorage.removeItem(`ImageCache_${cacheKey}`);
        return null;
      }

      return metadata;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cached image metadata on web
   */
  private static async getCachedImageMetadataWeb(cacheKey: string): Promise<CachedImageMetadata | null> {
    try {
      // First check if we have an active blob URL for this cache key
      const existingBlob = this.activeBlobUrls.get(cacheKey);
      if (existingBlob) {
        return {
          uri: existingBlob.url,
          localPath: existingBlob.url,
          cachedAt: Date.now(), // Use current time since it's actively available
          size: existingBlob.blob.size,
          originalUrl: '', // Will be filled in by caller if needed
        };
      }

      // Check if IndexedDB is supported and working
      if (this.isIndexedDBSupported !== false && await this.checkIndexedDBSupport()) {
        try {
          return await this.getFromIndexedDB(cacheKey);
        } catch (error) {
          console.warn('Failed to get from IndexedDB, falling back to localStorage:', error);
          this.isIndexedDBSupported = false; // Mark as unsupported
          this.dbPromise = null; // Reset promise
        }
      }
      
      // Fallback to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const metadataString = localStorage.getItem(`ImageCache_${cacheKey}`);
        if (!metadataString) {
          return null;
        }
        return JSON.parse(metadataString);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save cache metadata
   */
  private static async saveCacheMetadata(cacheKey: string, metadata: CachedImageMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(`ImageCache_${cacheKey}`, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error saving cache metadata:', error);
    }
  }

  /**
   * Save cache metadata on web
   */
  private static async saveCacheMetadataWeb(
    cacheKey: string,
    metadata: CachedImageMetadata,
    blob: Blob
  ): Promise<void> {
    try {
      // Check if IndexedDB is supported and working
      if (this.isIndexedDBSupported !== false && await this.checkIndexedDBSupport()) {
        try {
          await this.saveToIndexedDB(cacheKey, metadata, blob);
          console.log(`[ImageCache] Saved to IndexedDB: ${cacheKey}`);
          return;
        } catch (error) {
          console.warn('Failed to save to IndexedDB, falling back to localStorage:', error);
          this.resetIndexedDBState(); // Reset state on failure
        }
      }
      
      // Fallback to localStorage (without blob data)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`ImageCache_${cacheKey}`, JSON.stringify(metadata));
        console.log(`[ImageCache] Saved to localStorage: ${cacheKey}`);
      }
    } catch (error) {
      console.error('Error saving cache metadata on web:', error);
    }
  }

  /**
   * Check if cache is valid (not expired)
   */
  private static async isCacheValid(metadata: CachedImageMetadata): Promise<boolean> {
    const age = Date.now() - metadata.cachedAt;
    return age < this.config.maxAge;
  }

  /**
   * Generate cache key from URL
   */
  private static getCacheKey(url: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean up old cache entries
   */
  private static async cleanupCache(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await this.cleanupWebCache();
      } else {
        await this.cleanupMobileCache();
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  /**
   * Clean up mobile cache
   */
  private static async cleanupMobileCache(): Promise<void> {
    try {
      // Get all cache keys
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('ImageCache_'));

      const now = Date.now();
      let totalSize = 0;
      const entries: Array<{ key: string; metadata: CachedImageMetadata }> = [];

      // Collect metadata for all cached images
      for (const key of cacheKeys) {
        try {
          const metadataString = await AsyncStorage.getItem(key);
          if (metadataString) {
            const metadata: CachedImageMetadata = JSON.parse(metadataString);
            
            // Check if file exists
            const fileInfo = await FileSystem.getInfoAsync(metadata.localPath);
            if (fileInfo.exists) {
              entries.push({ key, metadata });
              totalSize += metadata.size;
            } else {
              // File doesn't exist, remove metadata
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Invalid metadata, remove it
          await AsyncStorage.removeItem(key);
        }
      }

      // Remove expired entries
      for (const entry of entries) {
        const age = now - entry.metadata.cachedAt;
        if (age > this.config.maxAge) {
          await this.removeFromMobileCache(entry.key.replace('ImageCache_', ''));
          totalSize -= entry.metadata.size;
        }
      }

      // If still over size limit, remove oldest entries
      if (totalSize > this.config.maxCacheSize * 1024 * 1024) {
        const sortedEntries = entries
          .filter(entry => now - entry.metadata.cachedAt <= this.config.maxAge)
          .sort((a, b) => a.metadata.cachedAt - b.metadata.cachedAt);

        for (const entry of sortedEntries) {
          if (totalSize <= this.config.maxCacheSize * 1024 * 1024) {
            break;
          }
          await this.removeFromMobileCache(entry.key.replace('ImageCache_', ''));
          totalSize -= entry.metadata.size;
        }
      }
    } catch (error) {
      console.error('Error cleaning up mobile cache:', error);
    }
  }

  /**
   * Clean up web cache
   */
  private static async cleanupWebCache(): Promise<void> {
    try {
      // Clean up old blob URLs
      this.cleanupOldBlobUrls();
      
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('ImageCache_'));
        const now = Date.now();

        for (const key of keys) {
          try {
            const metadataString = localStorage.getItem(key);
            if (metadataString) {
              const metadata: CachedImageMetadata = JSON.parse(metadataString);
              const age = now - metadata.cachedAt;
              
              if (age > this.config.maxAge) {
                localStorage.removeItem(key);
                // Revoke blob URL if it exists
                if (metadata.uri && metadata.uri.startsWith('blob:')) {
                  URL.revokeObjectURL(metadata.uri);
                }
              }
            }
          } catch (error) {
            // Invalid metadata, remove it
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up web cache:', error);
    }
  }

  /**
   * Clean up old blob URLs (older than 1 hour)
   */
  private static cleanupOldBlobUrls(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [key, entry] of this.activeBlobUrls.entries()) {
      if (now - entry.created > maxAge) {
        try {
          URL.revokeObjectURL(entry.url);
        } catch (error) {
          console.warn('[ImageCache] Error revoking blob URL:', error);
        }
        this.activeBlobUrls.delete(key);
      }
    }
  }

  /**
   * Clear mobile cache
   */
  private static async clearMobileCache(): Promise<void> {
    try {
      // Remove all cached files
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      }

      // Remove all metadata
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('ImageCache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing mobile cache:', error);
    }
  }

  /**
   * Clear web cache
   */
  private static async clearWebCache(): Promise<void> {
    try {
      // Clean up all tracked blob URLs
      for (const [key, entry] of this.activeBlobUrls.entries()) {
        try {
          URL.revokeObjectURL(entry.url);
        } catch (error) {
          console.warn('[ImageCache] Error revoking blob URL during clear:', error);
        }
      }
      this.activeBlobUrls.clear();

      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('ImageCache_'));
        
        for (const key of keys) {
          try {
            const metadataString = localStorage.getItem(key);
            if (metadataString) {
              const metadata: CachedImageMetadata = JSON.parse(metadataString);
              // Revoke blob URL if it exists
              if (metadata.uri && metadata.uri.startsWith('blob:')) {
                URL.revokeObjectURL(metadata.uri);
              }
            }
          } catch (error) {
            // Ignore errors when revoking URLs
          }
          localStorage.removeItem(key);
        }
      }

      // Clear IndexedDB cache if supported
      try {
        if (this.isIndexedDBSupported !== false && await this.checkIndexedDBSupport()) {
          const db = await this.openIndexedDB();
          
          const transaction = db.transaction(['images'], 'readwrite');
          const store = transaction.objectStore('images');
          
          const clearRequest = store.clear();
          
          await new Promise<void>((resolve, reject) => {
            clearRequest.onsuccess = () => {
              resolve();
            };
            
            clearRequest.onerror = () => {
              reject(clearRequest.error);
            };
            
            transaction.onerror = () => {
              reject(transaction.error);
            };
          });
        }
      } catch (error) {
        console.warn('[ImageCache] Error clearing IndexedDB during clear:', error);
      }
    } catch (error) {
      console.error('Error clearing web cache:', error);
    }
  }

  /**
   * Remove from mobile cache
   */
  private static async removeFromMobileCache(cacheKey: string): Promise<void> {
    try {
      const metadataString = await AsyncStorage.getItem(`ImageCache_${cacheKey}`);
      if (metadataString) {
        const metadata: CachedImageMetadata = JSON.parse(metadataString);
        
        // Remove file
        await FileSystem.deleteAsync(metadata.localPath, { idempotent: true });
        
        // Remove metadata
        await AsyncStorage.removeItem(`ImageCache_${cacheKey}`);
      }
    } catch (error) {
      console.error('Error removing from mobile cache:', error);
    }
  }

  /**
   * Remove from web cache
   */
  private static async removeFromWebCache(cacheKey: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const metadataString = localStorage.getItem(`ImageCache_${cacheKey}`);
        if (metadataString) {
          const metadata: CachedImageMetadata = JSON.parse(metadataString);
          
          // Revoke blob URL
          if (metadata.uri && metadata.uri.startsWith('blob:')) {
            URL.revokeObjectURL(metadata.uri);
          }
          
          // Remove metadata
          localStorage.removeItem(`ImageCache_${cacheKey}`);
        }
      }
    } catch (error) {
      console.error('Error removing from web cache:', error);
    }
  }

  /**
   * Get mobile cache stats
   */
  private static async getMobileCacheStats(): Promise<{ size: number; count: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('ImageCache_'));

      let totalSize = 0;
      let count = 0;

      for (const key of cacheKeys) {
        try {
          const metadataString = await AsyncStorage.getItem(key);
          if (metadataString) {
            const metadata: CachedImageMetadata = JSON.parse(metadataString);
            totalSize += metadata.size;
            count++;
          }
        } catch (error) {
          // Ignore invalid entries
        }
      }

      return { size: totalSize, count };
    } catch (error) {
      return { size: 0, count: 0 };
    }
  }

  /**
   * Get web cache stats
   */
  private static async getWebCacheStats(): Promise<{ size: number; count: number }> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('ImageCache_'));

        let totalSize = 0;
        let count = 0;

        for (const key of keys) {
          try {
            const metadataString = localStorage.getItem(key);
            if (metadataString) {
              const metadata: CachedImageMetadata = JSON.parse(metadataString);
              totalSize += metadata.size;
              count++;
            }
          } catch (error) {
            // Ignore invalid entries
          }
        }

        return { size: totalSize, count };
      }

      return { size: 0, count: 0 };
    } catch (error) {
      return { size: 0, count: 0 };
    }
  }

  // IndexedDB helper methods
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static isIndexedDBSupported: boolean | null = null;
  private static dbInstance: IDBDatabase | null = null;
  
  // Blob URL tracking to prevent garbage collection
  private static activeBlobUrls: Map<string, { url: string; blob: Blob; created: number }> = new Map();

  /**
   * Check if IndexedDB is supported and working
   */
  private static async checkIndexedDBSupport(): Promise<boolean> {
    if (this.isIndexedDBSupported !== null) {
      return this.isIndexedDBSupported;
    }

    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        this.isIndexedDBSupported = false;
        return false;
      }

      // Test if IndexedDB actually works
      const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('test', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      
      testDB.close();
      indexedDB.deleteDatabase('test');
      
      this.isIndexedDBSupported = true;
      return true;
    } catch (error) {
      this.isIndexedDBSupported = false;
      return false;
    }
  }

  /**
   * Open IndexedDB database with proper initialization (singleton with queuing)
   */
  private static async openIndexedDB(): Promise<IDBDatabase> {
    // Return existing instance if available and connection is valid
    if (this.dbInstance && this.isDBConnectionValid(this.dbInstance)) {
      return this.dbInstance;
    }

    // If already initializing, wait for the current initialization to complete
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (this.isDBConnectionValid(db)) {
          return db;
        }
        // If the connection is invalid, fall through to create a new one
      } catch (error) {
        // If initialization failed, reset and try again
        this.dbPromise = null;
        this.dbInstance = null;
      }
    }

    // Create new database connection
    this.dbPromise = this.createIndexedDBConnection();
    
    try {
      this.dbInstance = await this.dbPromise;
      return this.dbInstance;
    } catch (error) {
      this.dbPromise = null;
      this.dbInstance = null;
      throw error;
    }
  }

  /**
   * Create a new IndexedDB connection
   */
  private static async createIndexedDBConnection(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ImageCache', 1);

      request.onerror = () => {
        this.resetIndexedDBState();
        reject(new Error(`IndexedDB error: ${request.error?.message || 'Unknown error'}`));
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Only create the object store if it doesn't exist
        if (!db.objectStoreNames.contains('images')) {
          try {
            db.createObjectStore('images', { keyPath: 'key' });
            console.log('[ImageCache] Created IndexedDB object store "images"');
          } catch (error) {
            console.error('[ImageCache] Failed to create object store:', error);
            reject(new Error(`Failed to create object store: ${error}`));
            return;
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Verify that the object store exists
        if (!db.objectStoreNames.contains('images')) {
          db.close();
          this.resetIndexedDBState();
          reject(new Error('Object store "images" was not created properly'));
          return;
        }
        
        // Set up minimal database event handlers (avoid aggressive closing)
        db.onerror = (event) => {
          console.error('[ImageCache] IndexedDB error:', event);
        };

        db.onversionchange = () => {
          console.log('[ImageCache] IndexedDB version change detected');
          // Don't automatically close on version change
        };
        
        console.log('[ImageCache] Successfully opened IndexedDB with object store "images"');
        resolve(db);
      };

      request.onblocked = () => {
        console.warn('[ImageCache] IndexedDB open request blocked');
      };
    });
  }

  /**
   * Check if database connection is valid and usable
   */
  private static isDBConnectionValid(db: IDBDatabase): boolean {
    try {
      // Check basic database properties
      if (!db || typeof db.version !== 'number') {
        return false;
      }
      
      // Check if object store exists
      if (!db.objectStoreNames.contains('images')) {
        return false;
      }
      
      // Try to create a test transaction to verify the database is usable
      try {
        const transaction = db.transaction(['images'], 'readonly');
        transaction.abort(); // Abort immediately to avoid side effects
        return true;
      } catch (error) {
        console.warn('[ImageCache] Database connection test failed:', error);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Save to IndexedDB with retry logic
   */
  private static async saveToIndexedDB(
    cacheKey: string,
    metadata: CachedImageMetadata,
    blob: Blob
  ): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.saveToIndexedDBAttempt(cacheKey, metadata, blob);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ImageCache] SaveToIndexedDB attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Reset state and try again with delay
          this.dbPromise = null;
          this.dbInstance = null;
          await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        }
      }
    }
    
    // All attempts failed
    throw new Error(`Failed to save to IndexedDB after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Single attempt to save to IndexedDB
   */
  private static async saveToIndexedDBAttempt(
    cacheKey: string,
    metadata: CachedImageMetadata,
    blob: Blob
  ): Promise<void> {
    const db = await this.openIndexedDB();
    
    return new Promise((resolve, reject) => {
      // Double-check connection before creating transaction
      if (!this.isDBConnectionValid(db)) {
        reject(new Error('Database connection is invalid'));
        return;
      }

      let transaction: IDBTransaction;
      try {
        transaction = db.transaction(['images'], 'readwrite');
      } catch (error) {
        reject(new Error(`Failed to create transaction: ${error}`));
        return;
      }

      const store = transaction.objectStore('images');

      const data = {
        key: cacheKey,
        metadata,
        blob,
      };

      const putRequest = store.put(data);
      
      putRequest.onsuccess = () => {
        resolve();
      };
      
      putRequest.onerror = () => {
        reject(new Error(`Put request failed: ${putRequest.error?.message || 'Unknown error'}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message || 'Unknown error'}`));
      };

      transaction.onabort = () => {
        reject(new Error('Transaction was aborted'));
      };
    });
  }

  /**
   * Get from IndexedDB with retry logic
   */
  private static async getFromIndexedDB(cacheKey: string): Promise<CachedImageMetadata | null> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getFromIndexedDBAttempt(cacheKey);
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ImageCache] GetFromIndexedDB attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Reset state and try again with delay
          this.dbPromise = null;
          this.dbInstance = null;
          await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        }
      }
    }
    
    // All attempts failed
    console.error(`[ImageCache] Failed to get from IndexedDB after ${maxRetries} attempts:`, lastError?.message);
    return null; // Return null instead of throwing for get operations
  }

  /**
   * Single attempt to get from IndexedDB
   */
  private static async getFromIndexedDBAttempt(cacheKey: string): Promise<CachedImageMetadata | null> {
    const db = await this.openIndexedDB();
    
    return new Promise((resolve, reject) => {
      // Double-check connection before creating transaction
      if (!this.isDBConnectionValid(db)) {
        reject(new Error('Database connection is invalid'));
        return;
      }

      let transaction: IDBTransaction;
      try {
        transaction = db.transaction(['images'], 'readonly');
      } catch (error) {
        reject(new Error(`Failed to create transaction: ${error}`));
        return;
      }

      const store = transaction.objectStore('images');
      const getRequest = store.get(cacheKey);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (result && result.metadata && result.blob) {
          try {
            // Create a fresh blob URL from the stored blob
            const blobUrl = URL.createObjectURL(result.blob);
            const metadata = { 
              ...result.metadata, 
              uri: blobUrl, 
              localPath: blobUrl 
            };
            
            // Store a reference to prevent garbage collection
            this.activeBlobUrls.set(cacheKey, {
              url: blobUrl,
              blob: result.blob,
              created: Date.now()
            });
            
            resolve(metadata);
          } catch (blobError) {
            console.error('[ImageCache] Error creating blob URL:', blobError);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => {
        reject(new Error(`Get request failed: ${getRequest.error?.message || 'Unknown error'}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message || 'Unknown error'}`));
      };

      transaction.onabort = () => {
        reject(new Error('Transaction was aborted'));
      };
    });
  }

  /**
   * Reset IndexedDB state (for error recovery)
   */
  private static resetIndexedDBState(): void {
    console.log('[ImageCache] Resetting IndexedDB state for error recovery');
    
    // Don't close database aggressively - let it close naturally
    this.dbPromise = null;
    this.dbInstance = null;
    this.isIndexedDBSupported = false; // Mark as unsupported until next check
  }

  /**
   * Close database connection safely 
   */
  private static closeDatabase(): void {
    if (this.dbInstance) {
      try {
        this.dbInstance.close();
        console.log('[ImageCache] Closed IndexedDB connection');
      } catch (error) {
        console.warn('[ImageCache] Error closing database:', error);
      }
      this.dbInstance = null;
      this.dbPromise = null;
    }
  }

  /**
   * Cleanup method to be called on app shutdown or when appropriate
   */
  static async cleanup(): Promise<void> {
    // Close the database
    this.closeDatabase();
    
    // Clean up blob URLs
    for (const [key, entry] of this.activeBlobUrls.entries()) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch (error) {
        console.warn('[ImageCache] Error revoking blob URL during cleanup:', error);
      }
    }
    this.activeBlobUrls.clear();
  }
}
