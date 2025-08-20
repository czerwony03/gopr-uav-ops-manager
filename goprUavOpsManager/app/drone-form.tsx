import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Drone } from '../types/Drone';
import { useAuth } from '../contexts/AuthContext';
import { DroneService } from '../services/droneService';

type DroneFormData = Omit<Drone, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeleted' | 'createdBy' | 'updatedBy'>;

export default function DroneFormScreen() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const isEditing = !!id;
  const { t } = useTranslation('common');

  // Default form data for creating new drones
  const defaultFormData = useMemo((): DroneFormData => ({
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
  }), []);

  const [formData, setFormData] = useState<DroneFormData>(defaultFormData);

  const loadDroneData = useCallback(async () => {
    if (!user || !id) return;

    setInitialLoading(true);
    try {
      const drone = await DroneService.getDrone(id, user.role);
      if (!drone) {
        Alert.alert(t('droneForm.error'), t('droneForm.droneNotFound'), [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      if (drone.isDeleted && user.role !== 'admin') {
        Alert.alert(t('droneForm.error'), t('droneForm.cannotEditDeleted'), [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setFormData({
        name: drone.name,
        location: drone.location,
        registrationNumber: drone.registrationNumber,
        totalFlightTime: drone.totalFlightTime,
        equipmentRegistrationNumber: drone.equipmentRegistrationNumber,
        yearOfCommissioning: drone.yearOfCommissioning,
        yearOfManufacture: drone.yearOfManufacture,
        insurance: drone.insurance,
        callSign: drone.callSign,
        weight: drone.weight,
        maxTakeoffWeight: drone.maxTakeoffWeight,
        operatingTime: drone.operatingTime,
        range: drone.range,
        dimensions: { ...drone.dimensions },
        battery: { ...drone.battery },
        maxSpeed: drone.maxSpeed,
        userManual: drone.userManual || '',
      });
    } catch (error) {
      console.error('Error loading drone:', error);
      Alert.alert(t('droneForm.error'), t('droneForm.failedToLoad'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setInitialLoading(false);
    }
  }, [user, id, router]);

  useEffect(() => {
    // Check authentication first - redirect to login if not authenticated
    if (!user) {
      router.replace('/');
      return;
    }

    // Check permissions
    if (user.role !== 'manager' && user.role !== 'admin') {
      Alert.alert(t('common.accessDenied'), t('common.permissionDenied'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Load existing drone data for editing
    if (isEditing && id) {
      loadDroneData();
    } else {
      // Reset form to default values when creating a new drone
      setFormData(defaultFormData);
    }
  }, [id, user, isEditing, router, loadDroneData, defaultFormData]);

  const handleSubmit = async () => {
    if (!user) return;

    // Basic validation
    if (!formData.name.trim()) {
      Alert.alert(t('droneForm.validationError'), t('droneForm.nameRequired'));
      return;
    }
    if (!formData.callSign.trim()) {
      Alert.alert(t('droneForm.validationError'), t('droneForm.callSignRequired'));
      return;
    }
    if (!formData.registrationNumber.trim()) {
      Alert.alert(t('droneForm.validationError'), t('droneForm.registrationRequired'));
      return;
    }

    setLoading(true);
    try {
      if (isEditing && id) {
        await DroneService.updateDrone(id, formData, user.role, user.uid);
        // Navigate back immediately after successful update
        router.back();
        // Show success alert without blocking navigation
        Alert.alert(t('droneForm.success'), t('droneForm.droneUpdated'));
      } else {
        await DroneService.createDrone(formData, user.role, user.uid);
        // Navigate back immediately after successful creation
        router.back();
        // Show success alert without blocking navigation
        Alert.alert(t('droneForm.success'), t('droneForm.droneCreated'));
      }
    } catch (error) {
      console.error('Error saving drone:', error);
      Alert.alert(t('droneForm.error'), `${t(isEditing ? 'droneForm.failedToUpdate' : 'droneForm.failedToCreate')}`);
    } finally {
      setLoading(false);
    }
  };

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

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('droneForm.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      <View style={styles.card}>
        <Text style={styles.title}>{isEditing ? t('droneForm.editTitle') : t('droneForm.addTitle')}</Text>

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

          <Text style={styles.label}>{t('droneForm.maxSpeed')}</Text>
          <TextInput
            style={styles.input}
            value={formData.maxSpeed.toString()}
            onChangeText={(value) => updateFormData('maxSpeed', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('droneForm.range')}</Text>
          <TextInput
            style={styles.input}
            value={formData.range.toString()}
            onChangeText={(value) => updateFormData('range', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneForm.physicalSpecs')}</Text>
          
          <Text style={styles.label}>{t('droneForm.weight')}</Text>
          <TextInput
            style={styles.input}
            value={formData.weight.toString()}
            onChangeText={(value) => updateFormData('weight', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('droneForm.maxTakeoffWeight')}</Text>
          <TextInput
            style={styles.input}
            value={formData.maxTakeoffWeight.toString()}
            onChangeText={(value) => updateFormData('maxTakeoffWeight', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('droneForm.length')}</Text>
          <TextInput
            style={styles.input}
            value={formData.dimensions.length.toString()}
            onChangeText={(value) => updateNestedFormData('dimensions', 'length', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('droneForm.width')}</Text>
          <TextInput
            style={styles.input}
            value={formData.dimensions.width.toString()}
            onChangeText={(value) => updateNestedFormData('dimensions', 'width', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>{t('droneForm.height')}</Text>
          <TextInput
            style={styles.input}
            value={formData.dimensions.height.toString()}
            onChangeText={(value) => updateNestedFormData('dimensions', 'height', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneForm.batteryInfo')}</Text>
          
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
            placeholder="0.0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneForm.manufacturingInfo')}</Text>
          
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneForm.documentation')}</Text>
          
          <Text style={styles.label}>{t('droneForm.userManual')}</Text>
          <TextInput
            style={styles.input}
            value={formData.userManual}
            onChangeText={(value) => updateFormData('userManual', value)}
            placeholder={t('droneForm.userManualPlaceholder')}
            keyboardType="url"
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
          >
              <Text style={styles.cancelButtonText}>{t('droneForm.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? t('droneForm.updateDrone') : t('droneForm.createDrone')}
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
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
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
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
    opacity: 0.6,
  },
});
