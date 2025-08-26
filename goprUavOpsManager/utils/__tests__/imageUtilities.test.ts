// Simple test file to verify image utilities work
// This is not a comprehensive test suite, just basic functionality verification

import { ImageProcessingService } from '../imageProcessing';
import { ImageCacheService } from '../imageCache';
import { Platform } from 'react-native';

export async function testImageUtilities() {
  console.log('Testing image utilities...');
  
  try {
    // Test image processing configuration
    const estimatedReduction = ImageProcessingService.getEstimatedSizeReduction();
    console.log(`Estimated size reduction: ${(estimatedReduction * 100).toFixed(1)}%`);
    
    // Test cache initialization
    await ImageCacheService.initialize({
      maxCacheSize: 50, // 50 MB for testing
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    console.log('Cache initialized successfully');
    
    // Get cache stats
    const stats = await ImageCacheService.getCacheStats();
    console.log(`Cache stats: ${stats.count} images, ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Test platform detection
    console.log(`Running on platform: ${Platform.OS}`);
    
    console.log('Image utilities test completed successfully');
    return true;
  } catch (error) {
    console.error('Error testing image utilities:', error);
    return false;
  }
}

// Export for use in components
export { ImageProcessingService, ImageCacheService };