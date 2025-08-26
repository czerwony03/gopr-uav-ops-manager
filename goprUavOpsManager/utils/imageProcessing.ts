import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Configuration for image processing
 */
export interface ImageProcessingConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

/**
 * Default configuration for image processing
 */
const DEFAULT_CONFIG: Required<ImageProcessingConfig> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Result of image processing operation
 */
export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  size?: number; // File size in bytes (if available)
}

/**
 * Cross-platform image processing utility
 * Handles image resizing, compression, and format conversion
 */
export class ImageProcessingService {
  /**
   * Process an image for upload - resize, compress, and convert format
   * @param imageUri - URI of the image to process
   * @param config - Processing configuration
   * @returns Processed image data
   */
  static async processImageForUpload(
    imageUri: string,
    config: ImageProcessingConfig = {}
  ): Promise<ProcessedImage> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    if (Platform.OS === 'web') {
      return this.processImageWeb(imageUri, finalConfig);
    } else {
      return this.processImageMobile(imageUri, finalConfig);
    }
  }

  /**
   * Process image on mobile platforms using expo-image-manipulator
   */
  private static async processImageMobile(
    imageUri: string,
    config: Required<ImageProcessingConfig>
  ): Promise<ProcessedImage> {
    try {
      // Check if we need to preserve PNG transparency
      const shouldPreservePNG = await this.shouldPreservePNGTransparency(imageUri);
      const targetFormat = shouldPreservePNG ? 'png' : config.format;

      // Calculate resize dimensions
      const resizeAction = await this.calculateResizeAction(imageUri, config);
      
      const actions: ImageManipulator.Action[] = [];
      if (resizeAction) {
        actions.push(resizeAction);
      }

      // Process the image
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: targetFormat === 'jpeg' ? config.quality : 1.0,
          format: targetFormat === 'jpeg' ? 
            ImageManipulator.SaveFormat.JPEG : 
            ImageManipulator.SaveFormat.PNG,
        }
      );

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Error processing image on mobile:', error);
      // Fallback: return original image
      return { uri: imageUri, width: 0, height: 0 };
    }
  }

  /**
   * Process image on web platform using Canvas API
   */
  private static async processImageWeb(
    imageUri: string,
    config: Required<ImageProcessingConfig>
  ): Promise<ProcessedImage> {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Calculate dimensions
            const { width, height } = this.calculateDimensions(
              img.width,
              img.height,
              config.maxWidth,
              config.maxHeight
            );

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);

            // Check if we should preserve PNG transparency
            const isPNG = imageUri.toLowerCase().includes('.png') || imageUri.startsWith('data:image/png');
            const hasTransparency = isPNG && this.checkCanvasTransparency(ctx, width, height);
            const targetFormat = hasTransparency ? 'png' : config.format;

            // Convert to blob
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                const url = URL.createObjectURL(blob);
                resolve({
                  uri: url,
                  width,
                  height,
                  size: blob.size,
                });
              },
              targetFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
              targetFormat === 'jpeg' ? config.quality : undefined
            );
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = imageUri;
      });
    } catch (error) {
      console.error('Error processing image on web:', error);
      // Fallback: return original image
      return { uri: imageUri, width: 0, height: 0 };
    }
  }

  /**
   * Check if a PNG image has transparency (mobile only)
   */
  private static async shouldPreservePNGTransparency(imageUri: string): Promise<boolean> {
    // On mobile, we'll make a conservative decision to preserve PNG format
    // if the source appears to be PNG, as we can't easily check transparency
    return imageUri.toLowerCase().includes('.png') || imageUri.startsWith('data:image/png');
  }

  /**
   * Check if canvas has transparency (web only)
   */
  private static checkCanvasTransparency(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): boolean {
    try {
      // Sample a few pixels to check for transparency
      const sampleSize = Math.min(100, width * height);
      const step = Math.max(1, Math.floor((width * height) / sampleSize));

      for (let i = 0; i < width * height; i += step) {
        const x = i % width;
        const y = Math.floor(i / width);
        
        if (y >= height) break;
        
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (pixel[3] < 255) { // Alpha channel < 255 means transparency
          return true;
        }
      }
      return false;
    } catch (error) {
      // If we can't check, assume no transparency
      return false;
    }
  }

  /**
   * Calculate resize action for mobile
   */
  private static async calculateResizeAction(
    imageUri: string,
    config: Required<ImageProcessingConfig>
  ): Promise<ImageManipulator.Action | null> {
    try {
      // Get image info
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {});
      const { width, height } = imageInfo;

      // Check if resize is needed
      if (width <= config.maxWidth && height <= config.maxHeight) {
        return null; // No resize needed
      }

      // Calculate new dimensions
      const newDimensions = this.calculateDimensions(
        width,
        height,
        config.maxWidth,
        config.maxHeight
      );

      return {
        resize: {
          width: newDimensions.width,
          height: newDimensions.height,
        },
      };
    } catch (error) {
      // If we can't get image info, don't resize
      return null;
    }
  }

  /**
   * Calculate new dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Calculate scale factor
    const widthScale = maxWidth / width;
    const heightScale = maxHeight / height;
    const scale = Math.min(widthScale, heightScale, 1); // Don't upscale

    width = Math.round(width * scale);
    height = Math.round(height * scale);

    return { width, height };
  }

  /**
   * Get estimated file size reduction percentage
   */
  static getEstimatedSizeReduction(config: ImageProcessingConfig = {}): number {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Rough estimation based on quality and format
    if (finalConfig.format === 'jpeg') {
      return 1 - finalConfig.quality; // JPEG quality directly affects size
    } else {
      return 0.3; // PNG compression typically achieves ~30% reduction
    }
  }

  /**
   * Check if an image needs processing
   */
  static async needsProcessing(
    imageUri: string,
    config: ImageProcessingConfig = {}
  ): Promise<boolean> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const needsResize = img.width > finalConfig.maxWidth || img.height > finalConfig.maxHeight;
            const isPNG = imageUri.toLowerCase().includes('.png') || imageUri.startsWith('data:image/png');
            const needsConversion = isPNG && finalConfig.format === 'jpeg';
            resolve(needsResize || needsConversion);
          };
          img.onerror = () => resolve(false);
          img.src = imageUri;
        });
      } else {
        const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {});
        const needsResize = imageInfo.width > finalConfig.maxWidth || imageInfo.height > finalConfig.maxHeight;
        const isPNG = imageUri.toLowerCase().includes('.png') || imageUri.startsWith('data:image/png');
        const needsConversion = isPNG && finalConfig.format === 'jpeg';
        return needsResize || needsConversion;
      }
    } catch (error) {
      // If we can't check, assume it needs processing
      return true;
    }
  }
}