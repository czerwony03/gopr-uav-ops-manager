import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DroneEquipmentItem } from '@/types/Drone';
import { useCrossPlatformAlert } from './CrossPlatformAlert';

interface EquipmentItemFormProps {
  item: DroneEquipmentItem;
  onUpdate: (item: DroneEquipmentItem) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export default function EquipmentItemForm({
  item,
  onUpdate,
  onRemove,
  disabled = false,
}: EquipmentItemFormProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  const handleFieldChange = (field: keyof DroneEquipmentItem, value: any) => {
    onUpdate({
      ...item,
      [field]: value,
    });
  };

  const handleAddImage = async () => {
    if (disabled) return;

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

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        handleFieldChange('image', result.assets[0].uri);
      }
    } catch {
      crossPlatformAlert.showAlert({
        title: t('imageForm.error'),
        message: t('imageForm.failedToPickImage')
      });
    }
  };

  const handleRemoveImage = () => {
    if (disabled) return;
    
    crossPlatformAlert.showAlert({
      title: t('imageForm.confirmDelete'),
      message: t('imageForm.confirmDeleteMessage'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => handleFieldChange('image', undefined),
        },
      ],
    });
  };

  const handleRemoveItem = () => {
    if (disabled) return;
    
    crossPlatformAlert.showAlert({
      title: t('equipment.removeItem'),
      message: t('equipment.removeItemConfirm', { name: item.name }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: onRemove,
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('equipment.item')}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveItem}
          disabled={disabled}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.formRow}>
        <View style={styles.nameField}>
          <Text style={styles.label}>{t('equipment.name')} *</Text>
          <TextInput
            style={styles.input}
            value={item.name}
            onChangeText={(value) => handleFieldChange('name', value)}
            placeholder={t('equipment.namePlaceholder')}
            editable={!disabled}
          />
        </View>

        <View style={styles.quantityField}>
          <Text style={styles.label}>{t('equipment.quantity')} *</Text>
          <TextInput
            style={styles.input}
            value={item.quantity.toString()}
            onChangeText={(value) => handleFieldChange('quantity', Math.max(0, parseInt(value) || 0))}
            placeholder="1"
            keyboardType="numeric"
            editable={!disabled}
          />
        </View>
      </View>

      <View style={styles.imageSection}>
        <Text style={styles.label}>{t('equipment.image')}</Text>
        {item.image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <TouchableOpacity
              style={styles.imageRemoveButton}
              onPress={handleRemoveImage}
              disabled={disabled}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={handleAddImage}
            disabled={disabled}
          >
            <Ionicons name="camera-outline" size={24} color="#666" />
            <Text style={styles.addImageText}>{t('equipment.addImage')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  nameField: {
    flex: 2,
  },
  quantityField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  imageSection: {
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});