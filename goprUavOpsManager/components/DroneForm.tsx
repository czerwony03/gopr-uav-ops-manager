import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Drone, EquipmentStorage } from '@/types/Drone';
import { useCrossPlatformAlert } from './CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import MultiImagePicker from './MultiImagePicker';
import EquipmentStorageForm from './EquipmentStorageForm';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';

export type DroneFormData = Omit<Drone, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeleted' | 'createdBy' | 'updatedBy'>;

interface DroneFormProps {
  mode: 'create' | 'edit';
  initialData?: DroneFormData;
  onSave: (data: DroneFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function DroneForm({ mode, initialData, onSave, onCancel, loading = false }: DroneFormProps) {
  const { t } = useTranslation('common');
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const crossPlatformAlert = useCrossPlatformAlert();
  const responsive = useResponsiveLayout();

  // Default form data
  const defaultFormData: DroneFormData = {
    name: '',
    inventoryCode: '',
    location: '',
    registrationNumber: '',
    totalFlightTime: 0,
    equipmentRegistrationNumber: '',
    yearOfCommissioning: new Date().getFullYear(),
    yearOfManufacture: new Date().getFullYear(),
    insurance: '',
    callSign: '',
    weight: 0,
    maxTakeoffWeight: 0,
    operatingTime: 0,
    range: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
    },
    battery: {
      type: '',
      capacity: 0,
      voltage: 0,
    },
    maxSpeed: 0,
    userManual: '',
    additionalInfo: '',
    shareable: false,
    images: [],
    equipmentStorages: [],
  };

  const [formData, setFormData] = useState<DroneFormData>(initialData || defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (mode === 'create') {
      setFormData(defaultFormData);
    }
  }, [initialData, mode]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateNestedFormData = (parent: keyof DroneFormData, field: string, value: any) => {
    setFormData(prev => {
      const parentObj = prev[parent] as Record<string, any>;
      return {
        ...prev,
        [parent]: {
          ...parentObj,
          [field]: value,
        },
      };
    });
  };

  // Equipment storage management functions
  const addEquipmentStorage = () => {
    const newStorage: EquipmentStorage = {
      id: `storage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      items: [],
    };
    
    setFormData(prev => ({
      ...prev,
      equipmentStorages: [...(prev.equipmentStorages || []), newStorage],
    }));
  };

  const updateEquipmentStorage = (storageId: string, updatedStorage: EquipmentStorage) => {
    setFormData(prev => ({
      ...prev,
      equipmentStorages: (prev.equipmentStorages || []).map(storage => 
        storage.id === storageId ? updatedStorage : storage
      ),
    }));
  };

  const removeEquipmentStorage = (storageId: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentStorages: (prev.equipmentStorages || []).filter(storage => storage.id !== storageId),
    }));
  };

  const validateForm = (): boolean => {
    if (!(formData.name || '').trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.validation.nameRequired') });
      return false;
    }
    if (!(formData.inventoryCode || '').trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.validation.inventoryCodeRequired') });
      return false;
    }
    if (!(formData.callSign || '').trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.validation.callSignRequired') });
      return false;
    }
    if (!(formData.registrationNumber || '').trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.validation.registrationRequired') });
      return false;
    }
    
    // Validate equipment storages if any exist
    if (formData.equipmentStorages && formData.equipmentStorages.length > 0) {
      for (const storage of formData.equipmentStorages) {
        if (!(storage.name || '').trim()) {
          crossPlatformAlert.showAlert({ 
            title: t('equipmentStorage.validation.nameRequired'), 
            message: t('equipmentStorage.validation.nameRequired') 
          });
          return false;
        }
        
        // Validate items within each storage
        for (const item of storage.items) {
          if (!(item.name || '').trim()) {
            crossPlatformAlert.showAlert({ 
              title: t('equipment.validation.nameRequired'), 
              message: t('equipment.validation.nameRequiredInStorage', { storageName: storage.name })
            });
            return false;
          }
          if (item.quantity < 1) {
            crossPlatformAlert.showAlert({ 
              title: t('equipment.validation.quantityRequired'), 
              message: t('equipment.validation.quantityRequiredInStorage', { storageName: storage.name })
            });
            return false;
          }
        }
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || isButtonDisabled()) return;

    try {
      await onSave(formData);
    } catch (error) {
      // Error handling is done by the parent component
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          responsive.isDesktop && {
            paddingHorizontal: responsive.spacing.large,
            alignItems: 'center',
          }
        ]}
      >
        <View style={[
          styles.card,
          responsive.isDesktop && {
            maxWidth: responsive.maxFormWidth,
            width: '100%',
          }
        ]}>
          <Text style={[
            styles.title,
            { fontSize: responsive.fontSize.title }
          ]}>
            {mode === 'create' ? t('drones.addDrone') : t('drones.editDrone')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneForm.basicInfo')}</Text>
            
            <Text style={styles.label}>{t('droneForm.name')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholder={t('droneForm.namePlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.inventoryCode')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.inventoryCode}
              onChangeText={(value) => updateFormData('inventoryCode', value)}
              placeholder={t('droneForm.inventoryCodePlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.callSign')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.callSign}
              onChangeText={(value) => updateFormData('callSign', value)}
              placeholder={t('droneForm.callSignPlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.registrationNumber')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.registrationNumber}
              onChangeText={(value) => updateFormData('registrationNumber', value)}
              placeholder={t('droneForm.registrationPlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.equipmentRegistration')}</Text>
            <TextInput
              style={styles.input}
              value={formData.equipmentRegistrationNumber}
              onChangeText={(value) => updateFormData('equipmentRegistrationNumber', value)}
              placeholder={t('droneForm.equipmentRegistrationPlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.location')}</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(value) => updateFormData('location', value)}
              placeholder={t('droneForm.locationPlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.insurance')}</Text>
            <TextInput
              style={styles.input}
              value={formData.insurance}
              onChangeText={(value) => updateFormData('insurance', value)}
              placeholder={t('droneForm.insurancePlaceholder')}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneForm.flightInfo')}</Text>
            
            <Text style={styles.label}>{t('droneForm.totalFlightTime')}</Text>
            <TextInput
              style={styles.input}
              value={formData.totalFlightTime.toString()}
              onChangeText={(value) => updateFormData('totalFlightTime', parseInt(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.operatingTime')}</Text>
            <TextInput
              style={styles.input}
              value={formData.operatingTime.toString()}
              onChangeText={(value) => updateFormData('operatingTime', parseInt(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneDetails.technicalInfo')}</Text>
            
            <Text style={styles.label}>{t('droneForm.yearOfManufacture')}</Text>
            <TextInput
              style={styles.input}
              value={formData.yearOfManufacture.toString()}
              onChangeText={(value) => updateFormData('yearOfManufacture', parseInt(value) || new Date().getFullYear())}
              placeholder={new Date().getFullYear().toString()}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.yearOfCommissioning')}</Text>
            <TextInput
              style={styles.input}
              value={formData.yearOfCommissioning.toString()}
              onChangeText={(value) => updateFormData('yearOfCommissioning', parseInt(value) || new Date().getFullYear())}
              placeholder={new Date().getFullYear().toString()}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.weight')}</Text>
            <TextInput
              style={styles.input}
              value={formData.weight.toString()}
              onChangeText={(value) => updateFormData('weight', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.maxTakeoffWeight')}</Text>
            <TextInput
              style={styles.input}
              value={formData.maxTakeoffWeight.toString()}
              onChangeText={(value) => updateFormData('maxTakeoffWeight', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.range')}</Text>
            <TextInput
              style={styles.input}
              value={formData.range.toString()}
              onChangeText={(value) => updateFormData('range', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.maxSpeed')}</Text>
            <TextInput
              style={styles.input}
              value={formData.maxSpeed.toString()}
              onChangeText={(value) => updateFormData('maxSpeed', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneDetails.dimensions')}</Text>
            
            <Text style={styles.label}>{t('droneForm.length')}</Text>
            <TextInput
              style={styles.input}
              value={formData.dimensions.length.toString()}
              onChangeText={(value) => updateNestedFormData('dimensions', 'length', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.width')}</Text>
            <TextInput
              style={styles.input}
              value={formData.dimensions.width.toString()}
              onChangeText={(value) => updateNestedFormData('dimensions', 'width', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.height')}</Text>
            <TextInput
              style={styles.input}
              value={formData.dimensions.height.toString()}
              onChangeText={(value) => updateNestedFormData('dimensions', 'height', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneForm.batteryType')}</Text>
            
            <Text style={styles.label}>{t('droneForm.batteryType')}</Text>
            <TextInput
              style={styles.input}
              value={formData.battery.type}
              onChangeText={(value) => updateNestedFormData('battery', 'type', value)}
              placeholder={t('droneForm.batteryTypePlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.capacity')}</Text>
            <TextInput
              style={styles.input}
              value={formData.battery.capacity.toString()}
              onChangeText={(value) => updateNestedFormData('battery', 'capacity', parseInt(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.voltage')}</Text>
            <TextInput
              style={styles.input}
              value={formData.battery.voltage.toString()}
              onChangeText={(value) => updateNestedFormData('battery', 'voltage', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneForm.documentation')}</Text>
            
            <Text style={styles.label}>{t('droneForm.userManual')}</Text>
            <TextInput
              style={styles.input}
              value={formData.userManual}
              onChangeText={(value) => updateFormData('userManual', value)}
              placeholder={t('droneForm.userManualPlaceholder')}
            />

            <Text style={styles.label}>{t('droneForm.additionalInfo')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.additionalInfo}
              onChangeText={(value) => updateFormData('additionalInfo', value)}
              placeholder={t('droneForm.additionalInfoPlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => updateFormData('shareable', !formData.shareable)}
                disabled={loading}
              >
                <View style={[styles.checkboxBox, formData.shareable && styles.checkboxBoxChecked]}>
                  {formData.shareable && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  {t('droneForm.shareable')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.checkboxDescription}>
                {t('droneForm.shareableDescription')}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneForm.images')}</Text>
            <MultiImagePicker
              images={formData.images || []}
              onImagesChange={(images) => updateFormData('images', images)}
              maxImages={10}
              disabled={loading}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('equipmentStorage.storages')}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addEquipmentStorage}
                disabled={loading}
              >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.addButtonText}>{t('equipmentStorage.addStorage')}</Text>
              </TouchableOpacity>
            </View>

            {formData.equipmentStorages && formData.equipmentStorages.length > 0 ? (
              formData.equipmentStorages.map((storage) => (
                <EquipmentStorageForm
                  key={storage.id}
                  storage={storage}
                  onUpdate={(updatedStorage) => updateEquipmentStorage(storage.id, updatedStorage)}
                  onRemove={() => removeEquipmentStorage(storage.id)}
                  disabled={loading}
                />
              ))
            ) : (
              <View style={styles.emptyEquipment}>
                <Ionicons name="bag-outline" size={48} color="#999" />
                <Text style={styles.emptyText}>{t('equipmentStorage.noStorages')}</Text>
                <Text style={styles.emptySubtext}>{t('equipmentStorage.addFirstStorage')}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, (loading || isButtonDisabled()) && styles.disabledButton, getDisabledStyle()]}
              onPress={handleSave}
              disabled={loading || isButtonDisabled()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'create' ? t('droneForm.createDrone') : t('droneForm.updateDrone')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyEquipment: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  checkboxContainer: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 3,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  checkboxDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
    fontStyle: 'italic',
  },
});
