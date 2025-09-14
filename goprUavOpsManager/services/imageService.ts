import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ImageProcessingService } from '@/utils/imageProcessing';
import { getStorageRef, uploadFile, getDownloadURL, deleteObject } from '@/utils/firebaseUtils';

/**
 * Reusable image service for handling image uploads and deletions
 * Extracted from procedureChecklistService to be shared across modules
 */
export class ImageService {
  /**
   * Upload image to Firebase Storage
   * @param imageUri - URI of the image to upload
   * @param fileName - Name for the uploaded file
   * @param storagePath - Storage path prefix (e.g., 'drones/images', 'procedures_checklists/images')
   * @returns Promise<string> - Download URL of the uploaded image
   */
  static async uploadImage(imageUri: string, fileName: string, storagePath: string): Promise<string> {
    try {
      // Defensive checks
      if (!fileName || !fileName.trim()) {
        throw new Error('fileName is required');
      }

      if (!storagePath || !storagePath.trim()) {
        throw new Error('storagePath is required');
      }

      // Process the image before upload (resize, compress, convert format)
      const processedImage = await ImageProcessingService.processImageForUpload(imageUri, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'jpeg'
      });

      // Defensive check for processed image
      if (!processedImage || !processedImage.uri) {
        throw new Error('Failed to process image');
      }

      const imageRef = getStorageRef(`${storagePath}/${fileName}`);

      if (Platform.OS === 'web') {
        const response = await fetch(processedImage.uri);
        const blob = await response.blob();

        await uploadFile(imageRef, blob, {
          cacheControl: 'public,max-age=31536000' // Cache for 1 year
        });
      } else {
        // React Native platform: Use file path directly with putFile
        let filePath = processedImage.uri;

        if (processedImage.uri.startsWith('data:')) {
          // Base64 data URI - write to temp file
          const [header, base64Data] = processedImage.uri.split(',');
          
          const tempDir = FileSystem.cacheDirectory;
          if (!tempDir) {
            throw new Error('Cache directory not available');
          }
          
          const tempFilePath = `${tempDir}temp_upload_${Date.now()}.jpg`;
          await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          filePath = tempFilePath;
        } else if (processedImage.uri.startsWith('file://')) {
          // File URI - use as is
          filePath = processedImage.uri;
        } else {
          // Other URI types - download to temp file
          const tempDir = FileSystem.cacheDirectory;
          if (!tempDir) {
            throw new Error('Cache directory not available');
          }
          
          const tempFilePath = `${tempDir}temp_upload_${Date.now()}.jpg`;
          await FileSystem.downloadAsync(processedImage.uri, tempFilePath);
          filePath = tempFilePath;
        }

        await uploadFile(imageRef, filePath, {
          cacheControl: 'public,max-age=31536000' // Cache for 1 year
        });

        // Clean up temporary file if we created one
        if (filePath !== processedImage.uri && filePath.includes('temp_upload_')) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
      
      const downloadUrl = await getDownloadURL(imageRef);
      
      // Clean up processed image URI if it's a blob URL (web platform)
      if (processedImage.uri.startsWith('blob:') && processedImage.uri !== imageUri) {
        URL.revokeObjectURL(processedImage.uri);
      }
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Delete image from Firebase Storage
   * @param imageUrl - URL of the image to delete
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      const imageRef = getStorageRef(imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw error for image deletion failures
    }
  }

  /**
   * Process images array, handling uploads for new images
   * @param images - Array of image URIs (mix of existing URLs and new local URIs)
   * @param storagePath - Storage path prefix
   * @param entityId - ID of the entity the images belong to
   * @returns Promise<string[]> - Array of processed image URLs
   */
  static async processImages(images: string[], storagePath: string, entityId: string): Promise<string[]> {
    const processedImages: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Handle image upload if it's a new image (base64 or local file)
      if (image && (image.startsWith('data:') || image.startsWith('file:'))) {
        try {
          const fileName = `${Date.now()}_${entityId}_${i}.jpg`;
          const uploadedUrl = await this.uploadImage(image, fileName, storagePath);
          processedImages.push(uploadedUrl);
        } catch (error) {
          console.error('Error uploading image:', image, error);
          // Continue without image if upload fails
        }
      } else if (image && image.trim() && !image.startsWith('blob:')) {
        // Existing image URL - only include if it has a value and is not a blob URL
        processedImages.push(image);
      } else if (image && image.startsWith('blob:')) {
        // Log warning if blob URL detected (this indicates a bug in the UI layer)
        console.warn('Blob URL detected in form data, skipping:', image);
        // Don't include blob URLs in the saved data
      }
    }

    return processedImages;
  }
}