import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { EquipmentStorage, DroneEquipmentItem } from '@/types/Drone';
import { useCrossPlatformAlert } from './CrossPlatformAlert';
import EquipmentItemForm from './EquipmentItemForm';

interface EquipmentStorageFormProps {
  storage: EquipmentStorage;
  onUpdate: (storage: EquipmentStorage) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export default function EquipmentStorageForm({
  storage,
  onUpdate,
  onRemove,
  disabled = false,
}: EquipmentStorageFormProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  const handleStorageNameChange = (name: string) => {
    onUpdate({
      ...storage,
      name,
    });
  };

  const addEquipmentItem = () => {
    const newItem: DroneEquipmentItem = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      quantity: 1,
    };
    
    onUpdate({
      ...storage,
      items: [...storage.items, newItem],
    });
  };

  const updateEquipmentItem = (itemId: string, updatedItem: DroneEquipmentItem) => {
    onUpdate({
      ...storage,
      items: storage.items.map(item => 
        item.id === itemId ? updatedItem : item
      ),
    });
  };

  const removeEquipmentItem = (itemId: string) => {
    onUpdate({
      ...storage,
      items: storage.items.filter(item => item.id !== itemId),
    });
  };

  const handleRemoveStorage = () => {
    if (disabled) return;
    
    crossPlatformAlert.showAlert({
      title: t('equipmentStorage.removeStorage'),
      message: t('equipmentStorage.removeStorageConfirm', { name: storage.name }),
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
        <View style={styles.titleSection}>
          <Ionicons name="bag-outline" size={20} color="#0066CC" />
          <Text style={styles.title}>{t('equipmentStorage.storage')}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveStorage}
          disabled={disabled}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.nameSection}>
        <Text style={styles.label}>{t('equipmentStorage.name')} *</Text>
        <TextInput
          style={styles.nameInput}
          value={storage.name}
          onChangeText={handleStorageNameChange}
          placeholder={t('equipmentStorage.namePlaceholder')}
          editable={!disabled}
        />
      </View>

      <View style={styles.itemsSection}>
        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>{t('equipment.items')}</Text>
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={addEquipmentItem}
            disabled={disabled}
          >
            <Ionicons name="add-circle-outline" size={16} color="#007AFF" />
            <Text style={styles.addItemButtonText}>{t('equipment.addItem')}</Text>
          </TouchableOpacity>
        </View>

        {storage.items.length > 0 ? (
          storage.items.map((item) => (
            <EquipmentItemForm
              key={item.id}
              item={item}
              onUpdate={(updatedItem) => updateEquipmentItem(item.id, updatedItem)}
              onRemove={() => removeEquipmentItem(item.id)}
              disabled={disabled}
            />
          ))
        ) : (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyText}>{t('equipment.noEquipmentInStorage')}</Text>
            <Text style={styles.emptySubtext}>{t('equipment.addFirstItemToStorage')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
  },
  removeButton: {
    padding: 4,
  },
  nameSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  itemsSection: {
    marginTop: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 4,
  },
  addItemButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
  },
});