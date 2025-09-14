import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCrossPlatformAlert } from './CrossPlatformAlert';

interface MultiImagePickerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  disabled?: boolean;
}

/**
 * Reusable multi-image picker component that allows:
 * - Adding multiple images
 * - Removing images with confirmation
 * - Reordering images with up/down buttons
 */
export default function MultiImagePicker({
  images,
  onImagesChange,
  maxImages = 10,
  label,
  disabled = false,
}: MultiImagePickerProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  // Add new image
  const handleAddImage = useCallback(async () => {
    if (disabled || images.length >= maxImages) return;

    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        crossPlatformAlert.showAlert({
          title: t('imageForm.permissionRequired'),
          message: t('imageForm.permissionDenied')
        });
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImages = [...images, result.assets[0].uri];
        onImagesChange(newImages);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      crossPlatformAlert.showAlert({
        title: t('imageForm.error'),
        message: t('imageForm.failedToPickImage')
      });
    }
  }, [images, maxImages, disabled, onImagesChange, crossPlatformAlert, t]);

  // Remove image with confirmation
  const handleRemoveImage = useCallback((index: number) => {
    if (disabled) return;

    crossPlatformAlert.showAlert({
      title: t('imageForm.confirmDelete'),
      message: t('imageForm.confirmDeleteMessage'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const newImages = images.filter((_, i) => i !== index);
            onImagesChange(newImages);
          }
        }
      ]
    });
  }, [images, disabled, onImagesChange, crossPlatformAlert, t]);

  // Move image up
  const handleMoveUp = useCallback((index: number) => {
    if (disabled || index === 0) return;

    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onImagesChange(newImages);
  }, [images, disabled, onImagesChange]);

  // Move image down
  const handleMoveDown = useCallback((index: number) => {
    if (disabled || index === images.length - 1) return;

    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    onImagesChange(newImages);
  }, [images, disabled, onImagesChange]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {images.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {images.map((imageUri, index) => (
            <View key={`image-${index}`} style={styles.imageItem}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
              
              {/* Image controls */}
              <View style={styles.imageControls}>
                {/* Move up/down */}
                <View style={styles.moveButtons}>
                  <TouchableOpacity
                    style={[styles.moveButton, index === 0 && styles.disabledButton]}
                    onPress={() => handleMoveUp(index)}
                    disabled={disabled || index === 0}
                  >
                    <Ionicons name="chevron-up" size={16} color={index === 0 ? "#ccc" : "#666"} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.moveButton, index === images.length - 1 && styles.disabledButton]}
                    onPress={() => handleMoveDown(index)}
                    disabled={disabled || index === images.length - 1}
                  >
                    <Ionicons name="chevron-down" size={16} color={index === images.length - 1 ? "#ccc" : "#666"} />
                  </TouchableOpacity>
                </View>
                
                {/* Remove button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(index)}
                  disabled={disabled}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Image index */}
              <View style={styles.imageIndex}>
                <Text style={styles.imageIndexText}>{index + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add image button */}
      {images.length < maxImages && (
        <TouchableOpacity
          style={[styles.addButton, disabled && styles.disabledButton]}
          onPress={handleAddImage}
          disabled={disabled}
        >
          <Ionicons name="camera-outline" size={24} color={disabled ? "#ccc" : "#0066CC"} />
          <Text style={[styles.addButtonText, disabled && styles.disabledText]}>
            {images.length === 0 
              ? t('imageForm.addFirstImage') 
              : t('imageForm.addImage')
            }
          </Text>
        </TouchableOpacity>
      )}

      {/* Images count */}
      {images.length > 0 && (
        <Text style={styles.countText}>
          {t('imageForm.imageCount', { count: images.length, max: maxImages })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imagesContent: {
    paddingHorizontal: 4,
  },
  imageItem: {
    position: 'relative',
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imageControls: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moveButtons: {
    marginRight: 4,
  },
  moveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
    marginBottom: 2,
  },
  removeButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  imageIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  imageIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#ccc',
  },
});