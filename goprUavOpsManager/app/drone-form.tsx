import React, { useEffect, useState, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Drone } from '../types/Drone';
import { useAuth } from '../contexts/AuthContext';
import { DroneService } from '../services/droneService';

type DroneFormData = Omit<Drone, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeleted'>;

export default function DroneFormScreen() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const isEditing = !!id;

  const [formData, setFormData] = useState<DroneFormData>({
    name: '',
    location: '',
    registrationNumber: '',
    totalFlightTime: 0,
    equipmentRegistrationNumber: '',
    yearOfCommissioning: new Date().getFullYear(),
    yearOfManufacture: new Date().getFullYear(),
    insurance: 'Aerocasco',
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
  });

  const loadDroneData = useCallback(async () => {
    if (!user || !id) return;

    setInitialLoading(true);
    try {
      const drone = await DroneService.getDrone(id, user.role);
      if (!drone) {
        Alert.alert('Error', 'Drone not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      if (drone.isDeleted && user.role !== 'admin') {
        Alert.alert('Error', 'Cannot edit deleted drone', [
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
      Alert.alert('Error', 'Failed to load drone data', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setInitialLoading(false);
    }
  }, [user, id, router]);

  useEffect(() => {
    // Check permissions
    if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
      Alert.alert('Access Denied', 'You do not have permission to create or edit drones.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Load existing drone data for editing
    if (isEditing && id) {
      loadDroneData();
    }
  }, [id, user, isEditing, router, loadDroneData]);

  const handleSubmit = async () => {
    if (!user) return;

    // Basic validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Drone name is required');
      return;
    }
    if (!formData.callSign.trim()) {
      Alert.alert('Validation Error', 'Call sign is required');
      return;
    }
    if (!formData.registrationNumber.trim()) {
      Alert.alert('Validation Error', 'Registration number is required');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && id) {
        await DroneService.updateDrone(id, formData, user.role);
        Alert.alert('Success', 'Drone updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        await DroneService.createDrone(formData, user.role);
        Alert.alert('Success', 'Drone created successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('Error saving drone:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} drone`);
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

  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof DroneFormData],
        [field]: value,
      },
    }));
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading drone data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{isEditing ? 'Edit Drone' : 'Add New Drone'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.label}>Drone Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Enter drone name"
          />

          <Text style={styles.label}>Call Sign *</Text>
          <TextInput
            style={styles.input}
            value={formData.callSign}
            onChangeText={(value) => updateFormData('callSign', value)}
            placeholder="Enter call sign"
          />

          <Text style={styles.label}>Registration Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.registrationNumber}
            onChangeText={(value) => updateFormData('registrationNumber', value)}
            placeholder="Enter registration number"
          />

          <Text style={styles.label}>Equipment Registration Number</Text>
          <TextInput
            style={styles.input}
            value={formData.equipmentRegistrationNumber}
            onChangeText={(value) => updateFormData('equipmentRegistrationNumber', value)}
            placeholder="Enter equipment registration number"
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(value) => updateFormData('location', value)}
            placeholder="Enter current location"
          />

          <Text style={styles.label}>Insurance</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.insurance}
              onValueChange={(value) => updateFormData('insurance', value)}
              style={styles.picker}
            >
              <Picker.Item label="Aerocasco" value="Aerocasco" />
              <Picker.Item label="Care" value="Care" />
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>
          
          <Text style={styles.label}>Total Flight Time (minutes)</Text>
          <TextInput
            style={styles.input}
            value={formData.totalFlightTime.toString()}
            onChangeText={(value) => updateFormData('totalFlightTime', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Operating Time (hours)</Text>
          <TextInput
            style={styles.input}
            value={formData.operatingTime.toString()}
            onChangeText={(value) => updateFormData('operatingTime', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Max Speed (km/h)</Text>
          <TextInput
            style={styles.input}
            value={formData.maxSpeed.toString()}
            onChangeText={(value) => updateFormData('maxSpeed', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Range (km)</Text>
          <TextInput
            style={styles.input}
            value={formData.range.toString()}
            onChangeText={(value) => updateFormData('range', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Specifications</Text>
          
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={formData.weight.toString()}
            onChangeText={(value) => updateFormData('weight', parseFloat(value) || 0)}
            placeholder="0.0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Max Takeoff Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={formData.maxTakeoffWeight.toString()}
            onChangeText={(value) => updateFormData('maxTakeoffWeight', parseFloat(value) || 0)}
            placeholder="0.0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Length (cm)</Text>
          <TextInput
            style={styles.input}
            value={formData.dimensions.length.toString()}
            onChangeText={(value) => updateNestedFormData('dimensions', 'length', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Width (cm)</Text>
          <TextInput
            style={styles.input}
            value={formData.dimensions.width.toString()}
            onChangeText={(value) => updateNestedFormData('dimensions', 'width', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={formData.dimensions.height.toString()}
            onChangeText={(value) => updateNestedFormData('dimensions', 'height', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battery Information</Text>
          
          <Text style={styles.label}>Battery Type</Text>
          <TextInput
            style={styles.input}
            value={formData.battery.type}
            onChangeText={(value) => updateNestedFormData('battery', 'type', value)}
            placeholder="Enter battery type"
          />

          <Text style={styles.label}>Capacity (mAh)</Text>
          <TextInput
            style={styles.input}
            value={formData.battery.capacity.toString()}
            onChangeText={(value) => updateNestedFormData('battery', 'capacity', parseInt(value) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Voltage (V)</Text>
          <TextInput
            style={styles.input}
            value={formData.battery.voltage.toString()}
            onChangeText={(value) => updateNestedFormData('battery', 'voltage', parseFloat(value) || 0)}
            placeholder="0.0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manufacturing Information</Text>
          
          <Text style={styles.label}>Year of Manufacture</Text>
          <TextInput
            style={styles.input}
            value={formData.yearOfManufacture.toString()}
            onChangeText={(value) => updateFormData('yearOfManufacture', parseInt(value) || new Date().getFullYear())}
            placeholder={new Date().getFullYear().toString()}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Year of Commissioning</Text>
          <TextInput
            style={styles.input}
            value={formData.yearOfCommissioning.toString()}
            onChangeText={(value) => updateFormData('yearOfCommissioning', parseInt(value) || new Date().getFullYear())}
            placeholder={new Date().getFullYear().toString()}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentation</Text>
          
          <Text style={styles.label}>User Manual URL (optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.userManual}
            onChangeText={(value) => updateFormData('userManual', value)}
            placeholder="https://..."
            keyboardType="url"
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Drone' : 'Create Drone'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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