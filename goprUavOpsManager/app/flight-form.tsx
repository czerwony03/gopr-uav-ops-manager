import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { FlightService } from '../services/flightService';
import { DroneService } from '../services/droneService';
import { Drone } from '../types/Drone';
import { 
  FlightCategory, 
  OperationType, 
  ActivityType,
  AVAILABLE_FLIGHT_CATEGORIES,
  AVAILABLE_OPERATION_TYPES,
  AVAILABLE_ACTIVITY_TYPES
} from '../types/Flight';

interface FlightFormData {
  date: string;
  location: string;
  flightCategory: FlightCategory | '';
  operationType: OperationType | '';
  activityType: ActivityType | '';
  droneId: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  conditions: string;
}

export default function FlightFormScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [dronesLoading, setDronesLoading] = useState(true);
  const [drones, setDrones] = useState<Drone[]>([]);
  
  // Default form data for creating new flights
  const defaultFormData = useMemo((): FlightFormData => {
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    return {
      date: today,
      location: '',
      flightCategory: '',
      operationType: '',
      activityType: '',
      droneId: '',
      startDate: today,
      startTime: '',
      endDate: today,
      endTime: '',
      conditions: '',
    };
  }, []);

  const [formData, setFormData] = useState<FlightFormData>(defaultFormData);

  const fetchDrones = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedDrones = await DroneService.getDrones(user.role);
      // Filter out deleted drones for flight creation (applies to all users including admins)
      const availableDrones = fetchedDrones.filter(drone => !drone.isDeleted);
      setDrones(availableDrones);
    } catch (error) {
      console.error('Error fetching drones:', error);
      Alert.alert('Error', 'Failed to fetch drones');
    } finally {
      setDronesLoading(false);
    }
  }, [user]);

  const fetchFlight = useCallback(async (flightId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const flight = await FlightService.getFlight(flightId, user.role, user.uid);
      if (flight) {
        // Handle backward compatibility for time format
        const parseDateTime = (timeStr: string, fallbackDate: string) => {
          // If it's already a datetime string, parse it
          if (timeStr.includes('T') || timeStr.includes('Z')) {
            const dt = new Date(timeStr);
            return {
              date: dt.toISOString().split('T')[0],
              time: dt.toTimeString().substring(0, 5)
            };
          }
          // If it's in HH:mm format, use fallback date
          if (timeStr.match(/^\d{2}:\d{2}$/)) {
            return {
              date: fallbackDate,
              time: timeStr
            };
          }
          return { date: fallbackDate, time: '' };
        };

        const startDateTime = parseDateTime(flight.startTime, flight.date);
        const endDateTime = parseDateTime(flight.endTime, flight.date);

        setFormData({
          date: flight.date,
          location: flight.location,
          flightCategory: flight.flightCategory as FlightCategory,
          operationType: flight.operationType as OperationType,
          activityType: flight.activityType as ActivityType,
          droneId: flight.droneId,
          startDate: startDateTime.date,
          startTime: startDateTime.time,
          endDate: endDateTime.date,
          endTime: endDateTime.time,
          conditions: flight.conditions || '',
        });
      } else {
        Alert.alert('Error', 'Flight not found');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching flight:', error);
      Alert.alert('Error', 'Failed to fetch flight data');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchDrones();
    if (isEditing && id && typeof id === 'string') {
      fetchFlight(id);
    } else {
      // Reset form to default values when creating a new flight
      setFormData(defaultFormData);
    }
  }, [fetchDrones, fetchFlight, isEditing, id, defaultFormData]);

  const updateFormData = (field: keyof FlightFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const requiredFields: (keyof FlightFormData)[] = [
      'date', 'location', 'flightCategory', 'operationType', 
      'activityType', 'droneId', 'startDate', 'startTime', 'endDate', 'endTime'
    ];

    for (const field of requiredFields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        Alert.alert('Validation Error', `${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        return false;
      }
    }

    // Check if drones are available
    if (drones.length === 0) {
      Alert.alert('Validation Error', 'No drones available. Please add drones first.');
      return false;
    }

    // Validate selected drone exists
    if (!drones.find(drone => drone.id === formData.droneId)) {
      Alert.alert('Validation Error', 'Please select a valid drone');
      return false;
    }

    // Validate date formats (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.date)) {
      Alert.alert('Validation Error', 'Date must be in YYYY-MM-DD format');
      return false;
    }
    if (!dateRegex.test(formData.startDate)) {
      Alert.alert('Validation Error', 'Start date must be in YYYY-MM-DD format');
      return false;
    }
    if (!dateRegex.test(formData.endDate)) {
      Alert.alert('Validation Error', 'End date must be in YYYY-MM-DD format');
      return false;
    }

    // Validate time formats (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.startTime)) {
      Alert.alert('Validation Error', 'Start time must be in HH:mm format');
      return false;
    }
    if (!timeRegex.test(formData.endTime)) {
      Alert.alert('Validation Error', 'End time must be in HH:mm format');
      return false;
    }

    // Validate that end datetime is after start datetime
    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        Alert.alert('Validation Error', 'Invalid date/time format');
        return false;
      }
      
      if (endDateTime <= startDateTime) {
        Alert.alert('Validation Error', 'End time must be after start time');
        return false;
      }
    } catch {
      Alert.alert('Validation Error', 'Invalid date/time format');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    try {
      setLoading(true);

      // Get drone name for the snapshot
      const selectedDrone = drones.find(drone => drone.id === formData.droneId);
      const droneName = selectedDrone?.name || '';

      // Convert separate date/time fields to datetime strings
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;

      const flightData = {
        date: formData.date,
        location: formData.location,
        flightCategory: formData.flightCategory as FlightCategory,
        operationType: formData.operationType as OperationType,
        activityType: formData.activityType as ActivityType,
        droneId: formData.droneId,
        droneName,
        startTime: startDateTime,
        endTime: endDateTime,
        conditions: formData.conditions,
        userId: user.uid,
        userEmail: user.email,
      };

      if (isEditing && id && typeof id === 'string') {
        await FlightService.updateFlight(id, flightData, user.role, user.uid);
        // Navigate back immediately after successful update
        router.back();
        // Show success alert without blocking navigation
        Alert.alert('Success', 'Flight updated successfully');
      } else {
        await FlightService.createFlight(flightData, user.uid, user.email);
        // Navigate back immediately after successful creation
        router.back();
        // Show success alert without blocking navigation
        Alert.alert('Success', 'Flight created successfully');
      }
    } catch (error) {
      console.error('Error saving flight:', error);
      Alert.alert('Error', 'Failed to save flight');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (dronesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flight Information</Text>
            
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(value) => updateFormData('date', value)}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(value) => updateFormData('location', value)}
              placeholder="Enter flight location"
            />

            <Text style={styles.label}>Flight Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.flightCategory}
                onValueChange={(value) => updateFormData('flightCategory', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select flight category" value="" />
                {AVAILABLE_FLIGHT_CATEGORIES.map((category) => (
                  <Picker.Item
                    key={category}
                    label={category}
                    value={category}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Operation Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.operationType}
                onValueChange={(value) => updateFormData('operationType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select operation type" value="" />
                {AVAILABLE_OPERATION_TYPES.map((type) => (
                  <Picker.Item
                    key={type}
                    label={type}
                    value={type}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Activity Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.activityType}
                onValueChange={(value) => updateFormData('activityType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select activity type" value="" />
                {AVAILABLE_ACTIVITY_TYPES.map((type) => (
                  <Picker.Item
                    key={type}
                    label={type}
                    value={type}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Drone *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.droneId}
                onValueChange={(value) => updateFormData('droneId', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a drone" value="" />
                {drones.map((drone) => (
                  <Picker.Item
                    key={drone.id}
                    label={`${drone.name} (${drone.callSign})`}
                    value={drone.id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Start Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.startDate}
              onChangeText={(value) => updateFormData('startDate', value)}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Start Time *</Text>
            <TextInput
              style={styles.input}
              value={formData.startTime}
              onChangeText={(value) => updateFormData('startTime', value)}
              placeholder="HH:mm (e.g. 14:30)"
            />

            <Text style={styles.label}>End Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.endDate}
              onChangeText={(value) => updateFormData('endDate', value)}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>End Time *</Text>
            <TextInput
              style={styles.input}
              value={formData.endTime}
              onChangeText={(value) => updateFormData('endTime', value)}
              placeholder="HH:mm (e.g. 16:30)"
            />

            <Text style={styles.label}>Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.conditions}
              onChangeText={(value) => updateFormData('conditions', value)}
              placeholder="Weather and flight conditions (optional)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Flight' : 'Create Flight'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 16,
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
    backgroundColor: '#ccc',
  },
});
