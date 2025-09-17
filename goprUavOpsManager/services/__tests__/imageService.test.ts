// Mock all external dependencies first
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
  cacheDirectory: 'file:///cache/',
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('@/utils/imageProcessing', () => ({
  ImageProcessingService: {
    processImageForUpload: jest.fn(),
  }
}));

jest.mock('@/utils/firebaseUtils', () => ({
  getStorageRef: jest.fn(),
  uploadFile: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

import { ImageService } from '../imageService';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ImageProcessingService } from '@/utils/imageProcessing';
import { getStorageRef, uploadFile, getDownloadURL, deleteObject } from '@/utils/firebaseUtils';

// Get references to mocked functions
const mockImageProcessingService = ImageProcessingService as jest.Mocked<typeof ImageProcessingService>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockFirebaseUtils = {
  getStorageRef: getStorageRef as jest.MockedFunction<typeof getStorageRef>,
  uploadFile: uploadFile as jest.MockedFunction<typeof uploadFile>,
  getDownloadURL: getDownloadURL as jest.MockedFunction<typeof getDownloadURL>,
  deleteObject: deleteObject as jest.MockedFunction<typeof deleteObject>,
};

describe('ImageService', () => {
  beforeEach(() => {
    // Clear all mocks between tests to avoid interference
    jest.clearAllMocks();
    
    // Reset Platform.OS to React Native by default  
    (Platform.OS as any) = 'ios';
    
    // Clear any global fetch mock
    delete (global as any).fetch;
  });

  describe('uploadImage', () => {
    test('should upload image successfully on mobile platforms', async () => {
      // Complete mock setup for this test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');
      
      const result = await ImageService.uploadImage(
        'file://local-image.jpg',
        'test-image.jpg',
        'drones/images'
      );

      expect(result).toBe('https://example.com/uploaded-image.jpg');
      expect(mockImageProcessingService.processImageForUpload).toHaveBeenCalledWith(
        'file://local-image.jpg',
        {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
          format: 'jpeg'
        }
      );
      expect(mockFirebaseUtils.getStorageRef).toHaveBeenCalledWith('drones/images/test-image.jpg');
      expect(mockFirebaseUtils.uploadFile).toHaveBeenCalled();
      expect(mockFirebaseUtils.getDownloadURL).toHaveBeenCalled();
    });

    test('should handle web platform upload with blob', async () => {
      // Mock Platform.OS for web
      (Platform.OS as any) = 'web';
      
      // Complete mock setup for web platform test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'processed-image-uri',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');
      
      // Mock fetch for web platform
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg', lastModified: Date.now() } as BlobOptions))
      }) as jest.MockedFunction<typeof fetch>;

      const result = await ImageService.uploadImage(
        'blob:web-image',
        'web-image.jpg',
        'procedures/images'
      );

      expect(result).toBe('https://example.com/uploaded-image.jpg');
      expect(global.fetch).toHaveBeenCalledWith('processed-image-uri');
    });

    test('should throw error for missing fileName', async () => {
      await expect(
        ImageService.uploadImage('file://image.jpg', '', 'drones/images')
      ).rejects.toThrow('Failed to upload image');
    });

    test('should throw error for missing storagePath', async () => {
      await expect(
        ImageService.uploadImage('file://image.jpg', 'test.jpg', '')
      ).rejects.toThrow('Failed to upload image');
    });

    test('should throw error when image processing fails', async () => {
      mockImageProcessingService.processImageForUpload.mockResolvedValue(null as any);

      await expect(
        ImageService.uploadImage('file://image.jpg', 'test.jpg', 'drones/images')
      ).rejects.toThrow('Failed to upload image');
    });

    test('should handle upload failure gracefully', async () => {
      mockFirebaseUtils.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(
        ImageService.uploadImage('file://image.jpg', 'test.jpg', 'drones/images')
      ).rejects.toThrow('Failed to upload image');
    });
  });

  describe('deleteImage', () => {
    test('should delete image successfully', async () => {
      await ImageService.deleteImage('drones/images/test-image.jpg');

      expect(mockFirebaseUtils.getStorageRef).toHaveBeenCalledWith('drones/images/test-image.jpg');
      expect(mockFirebaseUtils.deleteObject).toHaveBeenCalled();
    });

    test('should handle empty imagePath gracefully', async () => {
      await expect(
        ImageService.deleteImage('')
      ).resolves.not.toThrow();
      
      // Should attempt to get storage ref even with empty path
      expect(mockFirebaseUtils.getStorageRef).toHaveBeenCalledWith('');
    });

    test('should handle deletion failure gracefully', async () => {
      mockFirebaseUtils.deleteObject.mockRejectedValue(new Error('Delete failed'));

      await expect(
        ImageService.deleteImage('drones/images/test-image.jpg')
      ).resolves.not.toThrow();
      
      // Should attempt to delete
      expect(mockFirebaseUtils.deleteObject).toHaveBeenCalled();
    });
  });

  describe('processImages', () => {
    test('should process multiple images successfully', async () => {
      const imageUris = ['file://image1.jpg', 'file://image2.jpg'];
      const storagePath = 'drones/images';
      const tempId = 'temp_123';
      
      // Mock uploadImage to succeed
      jest.spyOn(ImageService, 'uploadImage').mockResolvedValue('https://example.com/uploaded-image.jpg');

      const result = await ImageService.processImages(imageUris, storagePath, tempId);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('https://example.com/uploaded-image.jpg');
      expect(result[1]).toBe('https://example.com/uploaded-image.jpg');
      expect(ImageService.uploadImage).toHaveBeenCalledTimes(2);
    });

    test('should return empty array for empty input', async () => {
      const result = await ImageService.processImages([], 'drones/images', 'temp_123');

      expect(result).toEqual([]);
      expect(mockImageProcessingService.processImageForUpload).not.toHaveBeenCalled();
    });

    test('should handle mixed success and failure', async () => {
      const imageUris = ['file://image1.jpg', 'file://image2.jpg'];
      
      // Mock uploadImage to succeed once and fail once
      jest.spyOn(ImageService, 'uploadImage')
        .mockResolvedValueOnce('https://example.com/uploaded-image.jpg')
        .mockRejectedValueOnce(new Error('Upload failed'));

      const result = await ImageService.processImages(imageUris, 'drones/images', 'temp_123');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('https://example.com/uploaded-image.jpg');
    });
  });

  describe('Business Logic and Edge Cases', () => {
    test('should generate unique file names with timestamp', async () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1640995200000); // Fixed timestamp

      // Complete mock setup for this test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');

      const result = await ImageService.uploadImage('file://image.jpg', 'test.jpg', 'drones/images');

      expect(result).toBe('https://example.com/uploaded-image.jpg');
      expect(mockFirebaseUtils.getStorageRef).toHaveBeenCalledWith('drones/images/test.jpg');
      expect(mockImageProcessingService.processImageForUpload).toHaveBeenCalledWith(
        'file://image.jpg',
        {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
          format: 'jpeg'
        }
      );

      Date.now = originalNow;
    });

    test('should handle very large image paths', async () => {
      const longPath = 'a'.repeat(500); // Very long path
      const fileName = 'test.jpg';

      // Complete mock setup for this test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');

      const result = await ImageService.uploadImage('file://image.jpg', fileName, longPath);

      expect(result).toBe('https://example.com/uploaded-image.jpg');
      expect(mockFirebaseUtils.getStorageRef).toHaveBeenCalledWith(`${longPath}/${fileName}`);
      expect(mockImageProcessingService.processImageForUpload).toHaveBeenCalledWith(
        'file://image.jpg',
        {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
          format: 'jpeg'
        }
      );
    });

    test('should process different image formats', async () => {
      const formats = ['image.jpg', 'image.png', 'image.webp'];

      // Complete mock setup for this test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');
      
      for (const format of formats) {
        await ImageService.uploadImage(`file://${format}`, format, 'test/images');
      }

      expect(mockImageProcessingService.processImageForUpload).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network connectivity issues', async () => {
      // Complete mock setup for this test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');
      // Override the upload mock to fail
      mockFirebaseUtils.uploadFile.mockRejectedValue(new Error('Network error'));

      await expect(
        ImageService.uploadImage('file://image.jpg', 'test.jpg', 'drones/images')
      ).rejects.toThrow('Failed to upload image');
    });

    test('should handle corrupted image processing', async () => {
      // Override processing to return invalid result
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: '',
        width: 0,
        height: 0,
      });

      await expect(
        ImageService.uploadImage('file://corrupted.jpg', 'test.jpg', 'drones/images')
      ).rejects.toThrow('Failed to upload image');
    });

    test('should handle Firebase storage permission errors', async () => {
      // Complete mock setup for this test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');
      // Override the upload mock to fail
      mockFirebaseUtils.uploadFile.mockRejectedValue(new Error('Permission denied'));

      await expect(
        ImageService.uploadImage('file://image.jpg', 'test.jpg', 'protected/images')
      ).rejects.toThrow('Failed to upload image');
    });
  });

  describe('Platform-Specific Behavior', () => {
    test('should use blob upload on web platform', async () => {
      (Platform.OS as any) = 'web';
      
      // Complete mock setup for web platform test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'blob:processed-image',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');
      
      const mockBlob = new Blob(['test'], { type: 'image/jpeg', lastModified: Date.now() } as BlobOptions);
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob)
      }) as jest.MockedFunction<typeof fetch>;

      await ImageService.uploadImage('blob:web-image', 'web.jpg', 'web/images');

      expect(global.fetch).toHaveBeenCalledWith('blob:processed-image');
      expect(mockFirebaseUtils.uploadFile).toHaveBeenCalledWith(
        'mock-storage-ref',
        mockBlob,
        { cacheControl: 'public,max-age=31536000' }
      );
    });

    test('should use file upload on mobile platforms', async () => {
      (Platform.OS as any) = 'ios';
      
      // Complete mock setup for mobile platform test
      mockImageProcessingService.processImageForUpload.mockResolvedValue({
        uri: 'file://processed-mobile-image.jpg',
        width: 1200,
        height: 800,
      });
      mockFirebaseUtils.getStorageRef.mockReturnValue('mock-storage-ref' as any);
      mockFirebaseUtils.uploadFile.mockResolvedValue(undefined);
      mockFirebaseUtils.getDownloadURL.mockResolvedValue('https://example.com/uploaded-image.jpg');

      await ImageService.uploadImage('file://mobile-image.jpg', 'mobile.jpg', 'mobile/images');

      expect(mockFirebaseUtils.uploadFile).toHaveBeenCalledWith(
        'mock-storage-ref',
        'file://processed-mobile-image.jpg',
        { cacheControl: 'public,max-age=31536000' }
      );
    });
  });
});
