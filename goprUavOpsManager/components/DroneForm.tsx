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
import { Drone } from '@/types/Drone';
import { useCrossPlatformAlert } from './CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';

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

  // Default form data
  const defaultFormData: DroneFormData = {
    name: '',
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

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.nameRequired') });
      return false;
    }
    if (!formData.callSign.trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.callSignRequired') });
      return false;
    }
    if (!formData.registrationNumber.trim()) {
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.registrationRequired') });
      return false;
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
      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.title}>
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

            <Text style={styles.label}>{t('droneForm.weight')} (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.weight.toString()}
              onChangeText={(value) => updateFormData('weight', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.maxTakeoffWeight')} (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.maxTakeoffWeight.toString()}
              onChangeText={(value) => updateFormData('maxTakeoffWeight', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.range')} (km)</Text>
            <TextInput
              style={styles.input}
              value={formData.range.toString()}
              onChangeText={(value) => updateFormData('range', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.maxSpeed')} (km/h)</Text>
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
            
            <Text style={styles.label}>{t('droneForm.length')} (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.dimensions.length.toString()}
              onChangeText={(value) => updateNestedFormData('dimensions', 'length', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.width')} (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.dimensions.width.toString()}
              onChangeText={(value) => updateNestedFormData('dimensions', 'width', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.height')} (cm)</Text>
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

            <Text style={styles.label}>{t('droneForm.capacity')} (mAh)</Text>
            <TextInput
              style={styles.input}
              value={formData.battery.capacity.toString()}
              onChangeText={(value) => updateNestedFormData('battery', 'capacity', parseInt(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('droneForm.voltage')} (V)</Text>
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
  card: {
    margin: 16,
    padding: 16,
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
    fontSize: 24,
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
});
