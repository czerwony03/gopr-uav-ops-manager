import React from 'react';
import {
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Type declaration for web DOM APIs
declare global {
  interface Document {
    createElement(tagName: 'input'): HTMLInputElement;
  }
  interface HTMLInputElement {
    click(): void;
    files: FileList | null;
  }
}

interface ImagePickerResult {
  canceled: boolean;
  assets?: Array<{
    uri: string;
    width?: number;
    height?: number;
    type?: string;
  }>;
}

interface WebCompatibleImagePickerOptions {
  mediaTypes?: 'Images' | 'Videos' | 'All';
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

export class WebCompatibleImagePicker {
  // Request media library permissions
  static async requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }> {
    if (Platform.OS === 'web') {
      // Web doesn't need explicit permissions for file input
      return { granted: true };
    }
    
    return await ImagePicker.requestMediaLibraryPermissionsAsync();
  }

  // Request camera permissions
  static async requestCameraPermissionsAsync(): Promise<{ granted: boolean }> {
    if (Platform.OS === 'web') {
      // Web camera access is handled by the browser
      return { granted: true };
    }
    
    return await ImagePicker.requestCameraPermissionsAsync();
  }

  // Launch image library (works differently on web)
  static async launchImageLibraryAsync(options: WebCompatibleImagePickerOptions = {}): Promise<ImagePickerResult> {
    if (Platform.OS === 'web') {
      // Use HTML file input for web
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.onchange = (event: any) => {
          const file = event.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const uri = e.target?.result as string;
              resolve({
                canceled: false,
                assets: [{
                  uri,
                  type: file.type,
                }]
              });
            };
            reader.readAsDataURL(file);
          } else {
            resolve({ canceled: true });
          }
          
          // Clean up
          document.body.removeChild(input);
        };
        
        input.oncancel = () => {
          resolve({ canceled: true });
          document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
      });
    }
    
    // Use expo-image-picker for mobile platforms
    const imagePickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: options.mediaTypes === 'Images' ? ImagePicker.MediaTypeOptions.Images : 
                  options.mediaTypes === 'Videos' ? ImagePicker.MediaTypeOptions.Videos :
                  ImagePicker.MediaTypeOptions.All,
      allowsEditing: options.allowsEditing,
      aspect: options.aspect,
      quality: options.quality,
    };
    
    return await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
  }

  // Launch camera (not available on web, show alert)
  static async launchCameraAsync(options: WebCompatibleImagePickerOptions = {}): Promise<ImagePickerResult> {
    if (Platform.OS === 'web') {
      // Web doesn't support direct camera access like mobile apps
      // Suggest using file picker instead
      Alert.alert(
        'Camera Not Available',
        'Camera capture is not available on web. Please use the "Select Image" option to choose a photo from your device.',
        [{ text: 'OK' }]
      );
      return { canceled: true };
    }
    
    // Use expo-image-picker for mobile platforms
    const imagePickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: options.mediaTypes === 'Images' ? ImagePicker.MediaTypeOptions.Images : 
                  options.mediaTypes === 'Videos' ? ImagePicker.MediaTypeOptions.Videos :
                  ImagePicker.MediaTypeOptions.All,
      allowsEditing: options.allowsEditing,
      aspect: options.aspect,
      quality: options.quality,
    };
    
    return await ImagePicker.launchCameraAsync(imagePickerOptions);
  }
}