# Cross-Platform Image Handling Documentation

This document describes the cross-platform image handling utilities implemented for the GOPR UAV Ops Manager app, focusing on procedure/checklist images with utility for other app features.

## Overview

The image handling system consists of two main utilities:

1. **ImageProcessingService** - Handles image resizing, compression, and format conversion
2. **ImageCacheService** - Manages device-side image caching for improved performance

Both utilities are designed to work seamlessly across Android, iOS, and web platforms with appropriate fallbacks.

## ImageProcessingService

Located in `utils/imageProcessing.ts`

### Features

- **Cross-platform image processing** using expo-image-manipulator for mobile and Canvas API for web
- **Intelligent format conversion** - converts to JPEG unless source is PNG with transparency
- **Configurable compression and resizing** - defaults to max 1200px side and 80% quality
- **Automatic optimization** for mobile/web dimensions

### API

#### `processImageForUpload(imageUri, config?)`

Processes an image for upload with optimal settings.

```typescript
const processedImage = await ImageProcessingService.processImageForUpload(
  'file://path/to/image.jpg',
  {
    maxWidth: 1200,    // Maximum width in pixels
    maxHeight: 1200,   // Maximum height in pixels  
    quality: 0.8,      // JPEG quality (0.0 - 1.0)
    format: 'jpeg'     // Target format ('jpeg' | 'png')
  }
);

// Returns: { uri: string, width: number, height: number, size?: number }
```

#### `needsProcessing(imageUri, config?)`

Checks if an image requires processing based on size/format criteria.

```typescript
const needsProcessing = await ImageProcessingService.needsProcessing(imageUri);
```

#### `getEstimatedSizeReduction(config?)`

Returns estimated file size reduction percentage.

```typescript
const reduction = ImageProcessingService.getEstimatedSizeReduction(); // 0.0 - 1.0
```

### Platform-Specific Behavior

#### Mobile (Android/iOS)
- Uses `expo-image-manipulator` for all processing operations
- Preserves PNG format when source appears to be PNG (conservative approach)
- Handles both local file URIs and data URIs

#### Web
- Uses HTML5 Canvas API for image processing
- Checks for actual transparency in PNG images
- Returns blob URLs for processed images
- Automatically cleans up blob URLs to prevent memory leaks

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxWidth` | 1200 | Maximum image width in pixels |
| `maxHeight` | 1200 | Maximum image height in pixels |
| `quality` | 0.8 | JPEG compression quality (0.0-1.0) |
| `format` | 'jpeg' | Target format ('jpeg' \| 'png') |

## ImageCacheService

Located in `utils/imageCache.ts`

### Features

- **Cross-platform caching** using expo-file-system for mobile and IndexedDB/localStorage for web
- **Automatic cache management** with size limits and expiration
- **Background preloading** for improved user experience
- **Intelligent fallbacks** when cache operations fail

### API

#### `initialize(config?)`

Initializes the cache service (called automatically on first use).

```typescript
await ImageCacheService.initialize({
  maxCacheSize: 100,        // Max cache size in MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // Max age in milliseconds (7 days)
  cacheDirectory: 'ImageCache'      // Directory name for mobile cache
});
```

#### `getCachedImage(imageUrl)`

Gets a cached image or downloads and caches it if not available.

```typescript
const cachedUri = await ImageCacheService.getCachedImage(
  'https://example.com/image.jpg'
);
// Returns local file path (mobile) or blob URL (web)
```

#### `preloadImage(imageUrl)`

Preloads and caches an image in the background.

```typescript
await ImageCacheService.preloadImage('https://example.com/image.jpg');
```

#### `clearCache()`

Clears the entire image cache.

```typescript
await ImageCacheService.clearCache();
```

#### `getCacheStats()`

Returns cache statistics.

```typescript
const stats = await ImageCacheService.getCacheStats();
// Returns: { size: number, count: number }
```

#### `removeFromCache(imageUrl)`

Removes a specific image from cache.

```typescript
await ImageCacheService.removeFromCache('https://example.com/image.jpg');
```

### Platform-Specific Behavior

#### Mobile (Android/iOS)
- Uses `expo-file-system` for file storage in app cache directory
- Uses `AsyncStorage` for metadata storage
- Automatically cleans up expired and oversized cache entries
- Handles file system permissions and errors gracefully

#### Web
- Primary storage: IndexedDB for blob data and metadata
- Fallback storage: localStorage for metadata only (limited capacity)
- Uses blob URLs for serving cached images
- Automatically revokes blob URLs when cleaning up

### Cache Management

- **Automatic cleanup** removes expired entries and enforces size limits
- **LRU eviction** removes oldest entries when cache is full
- **Error handling** gracefully falls back to original URLs on cache failures
- **Metadata tracking** stores cache timestamps, file sizes, and original URLs

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxCacheSize` | 100 | Maximum cache size in MB |
| `maxAge` | 7 days | Maximum age of cached images |
| `cacheDirectory` | 'ImageCache' | Cache directory name (mobile only) |

## Integration Examples

### ProcedureChecklistService Integration

The image processing is automatically applied when uploading images:

```typescript
// In ProcedureChecklistService.uploadImage()
const processedImage = await ImageProcessingService.processImageForUpload(imageUri, {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'jpeg'
});

// Upload processed image to Firebase
const response = await fetch(processedImage.uri);
const blob = await response.blob();
// ... upload to Firebase Storage
```

### ImageViewer Integration

The image caching is automatically used when displaying images:

```typescript
// In ImageViewer component
useEffect(() => {
  const loadCachedImages = async () => {
    await ImageCacheService.initialize();
    
    const cachedUris = await Promise.all(
      images.map(image => ImageCacheService.getCachedImage(image.uri))
    );
    
    setCachedImageUris(cachedUris);
  };
  
  loadCachedImages();
}, [images]);
```

### ProcedureForm Integration

Image processing is applied to previews for better performance:

```typescript
// In ProcedureForm.pickImage()
const processedImage = await ImageProcessingService.processImageForUpload(
  selectedImageUri,
  {
    maxWidth: 800,  // Smaller for preview
    maxHeight: 600,
    quality: 0.7,
    format: 'jpeg'
  }
);
```

## Performance Benefits

### Bandwidth Reduction
- **Image compression** typically reduces file sizes by 50-80%
- **Format optimization** converts large PNGs to smaller JPEGs when appropriate
- **Size limits** prevent upload of unnecessarily large images

### Storage Efficiency
- **Client-side caching** reduces repeated downloads
- **Automatic cleanup** prevents cache bloat
- **Intelligent preloading** improves perceived performance

### User Experience
- **Faster image loads** from local cache
- **Reduced data usage** especially important for mobile users
- **Responsive UI** with background image processing

## Error Handling and Fallbacks

### Processing Failures
- Falls back to original image if processing fails
- Logs errors for debugging while maintaining functionality
- Graceful degradation ensures app remains usable

### Cache Failures
- Falls back to network download if cache fails
- Continues operation without caching if initialization fails
- Automatic retry mechanisms for transient failures

### Platform Limitations
- Detects platform capabilities and adjusts behavior
- Provides consistent API across all platforms
- Handles edge cases like missing storage permissions

## Maintenance and Monitoring

### Cache Monitoring
```typescript
// Check cache health
const stats = await ImageCacheService.getCacheStats();
console.log(`Cache: ${stats.count} images, ${stats.size / 1024 / 1024} MB`);

// Clear cache if needed
if (stats.size > 150 * 1024 * 1024) { // 150 MB threshold
  await ImageCacheService.clearCache();
}
```

### Processing Monitoring
```typescript
// Check if processing is beneficial
const needsProcessing = await ImageProcessingService.needsProcessing(imageUri);
const estimatedReduction = ImageProcessingService.getEstimatedSizeReduction();

console.log(`Processing needed: ${needsProcessing}, estimated reduction: ${estimatedReduction * 100}%`);
```

## Future Enhancements

Potential areas for future improvement:

1. **Advanced compression algorithms** using more sophisticated libraries
2. **WebP format support** for better compression on supported platforms
3. **Progressive image loading** with low-quality placeholders
4. **Bandwidth-aware optimization** adjusting quality based on connection speed
5. **Background cache warming** preloading frequently accessed images
6. **Analytics integration** tracking cache hit rates and processing metrics

## Troubleshooting

### Common Issues

#### Mobile Processing Fails
- Check expo-image-manipulator installation
- Verify file permissions for source images
- Ensure source URIs are valid

#### Web Processing Fails
- Check CORS policy for external images
- Verify Canvas API support in browser
- Handle large images that exceed browser limits

#### Cache Not Working
- Check storage permissions (mobile)
- Verify IndexedDB/localStorage availability (web)
- Review cache configuration and size limits

#### Performance Issues
- Monitor cache size and cleanup frequency
- Adjust processing quality for faster operations
- Consider reducing maximum image dimensions

### Debug Information

Enable debug logging by setting console log levels or using development flags to track:
- Processing times and file size reductions
- Cache hit/miss rates
- Error frequencies and types
- Platform-specific behavior differences