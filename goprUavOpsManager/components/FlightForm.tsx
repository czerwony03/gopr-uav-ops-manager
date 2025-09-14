import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { DroneService } from '@/services/droneService';
import { Drone } from '@/types/Drone';
import { useCrossPlatformAlert } from './CrossPlatformAlert';
import WebCompatibleDatePicker from './WebCompatibleDatePicker';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import TimePicker from './TimePicker';
import LocationSelector from './LocationSelector';
import { 
  FlightCategory, 
  OperationType, 
  ActivityType,
  AVAILABLE_FLIGHT_CATEGORIES,
  AVAILABLE_OPERATION_TYPES,
  AVAILABLE_ACTIVITY_TYPES
} from '@/types/Flight';

export interface FlightFormData {
  location: string;
  coordinates: string;
  flightCategory: FlightCategory | '';
  operationType: OperationType | '';
  activityType: ActivityType | '';
  droneId: string;
  operator: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  conditions: string;
}

interface FlightFormProps {
  mode: 'create' | 'edit';
  initialData?: FlightFormData;
  onSave: (data: FlightFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function FlightForm({ mode, initialData, onSave, onCancel, loading = false }: FlightFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const crossPlatformAlert = useCrossPlatformAlert();

  const [dronesLoading, setDronesLoading] = useState(true);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [operatorSelection, setOperatorSelection] = useState<string>(''); // For create mode operator selection
  const [showOtherOperatorInput, setShowOtherOperatorInput] = useState(false); // Show "Other" input field
  
  // Default form data for creating new flights
  const defaultFormData = useMemo((): FlightFormData => {
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    return {
      location: '',
      coordinates: '',
      flightCategory: '',
      operationType: '',
      activityType: '',
      droneId: '',
      operator: '',
      startDate: today,
      startTime: '',
      endDate: today,
      endTime: '',
      conditions: '',
    };
  }, []);

  const [formData, setFormData] = useState<FlightFormData>(initialData || defaultFormData);

  const fetchDrones = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedDrones = await DroneService.getDrones(user.role);
      // Filter out deleted drones for flight creation (applies to all users including admins)
      const availableDrones = fetchedDrones.filter(drone => !drone.isDeleted);
      setDrones(availableDrones);
    } catch (error) {
      console.error('Error fetching drones:', error);
      crossPlatformAlert.showAlert({ title: 'Error', message: 'Failed to fetch drones' });
    } finally {
      setDronesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (mode === 'create') {
      setFormData(defaultFormData);
    }
  }, [initialData, mode, defaultFormData]);

  const updateFormData = (field: keyof FlightFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate flight duration for display
  const getFlightDuration = (): string => {
    const { startDate, startTime, endDate, endTime } = formData;
    
    if (!startDate || !startTime || !endDate || !endTime) {
      return '';
    }

    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return '';
      }
      
      if (endDateTime <= startDateTime) {
        return '';
      }

      const durationMs = endDateTime.getTime() - startDateTime.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0 && minutes > 0) {
        return `Total time: ${hours}h ${minutes}min`;
      } else if (hours > 0) {
        return `Total time: ${hours}h`;
      } else if (minutes > 0) {
        return `Total time: ${minutes}min`;
      } else {
        return 'Total time: <1min';
      }
    } catch {
      return '';
    }
  };

  const validateForm = (): boolean => {
    const requiredFields: (keyof FlightFormData)[] = [
      'location', 'flightCategory', 'operationType', 
      'activityType', 'droneId', 'operator', 'startDate', 'startTime', 'endDate', 'endTime'
    ];

    for (const field of requiredFields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t(`flightForm.validation.${field}Required`) });
        return false;
      }
    }

    // Check if drones are available
    if (drones.length === 0) {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.noDronesAvailable') });
      return false;
    }

    // Validate selected drone exists
    if (!drones.find(drone => drone.id === formData.droneId)) {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.selectValidDrone') });
      return false;
    }

    // Validate date formats (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.startDate)) {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.startDateFormat') });
      return false;
    }
    if (!dateRegex.test(formData.endDate)) {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.endDateFormat') });
      return false;
    }

    // Validate time formats (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.startTime)) {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.startTimeFormat') });
      return false;
    }
    if (!timeRegex.test(formData.endTime)) {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.endTimeFormat') });
      return false;
    }

    // Validate that end datetime is after start datetime and duration doesn't exceed 24 hours
    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.invalidDateTime') });
        return false;
      }
      
      if (endDateTime <= startDateTime) {
        crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.endAfterStart') });
        return false;
      }

      // Check 24-hour duration limit
      const durationMs = endDateTime.getTime() - startDateTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      if (durationHours > 24) {
        crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.maxDuration24Hours') });
        return false;
      }
    } catch {
      crossPlatformAlert.showAlert({ title: t('flightForm.validation.title'), message: t('flightForm.validation.invalidDateTime') });
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

  if (dronesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
            <Text style={styles.sectionTitle}>{t('flightForm.basicInfo')}</Text>
            
            {/* Location Selector Component */}
            <LocationSelector
              coordinates={formData.coordinates}
              location={formData.location}
              onCoordinatesChange={(coords) => updateFormData('coordinates', coords)}
              onLocationChange={(location) => updateFormData('location', location)}
              disabled={loading}
            />

            <Text style={styles.label}>{t('flightForm.category')} *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.flightCategory || '')}
                onValueChange={(value) => updateFormData('flightCategory', value)}
                style={styles.picker}
              >
                <Picker.Item label={t('flightForm.categoryPlaceholder')} value="" />
                {AVAILABLE_FLIGHT_CATEGORIES.map((category) => (
                  <Picker.Item
                    key={category}
                    label={category}
                    value={category}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>{t('flightForm.operation')} *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.operationType || '')}
                onValueChange={(value) => updateFormData('operationType', value)}
                style={styles.picker}
              >
                <Picker.Item label={t('flightForm.operationPlaceholder')} value="" />
                {AVAILABLE_OPERATION_TYPES.map((type) => (
                  <Picker.Item
                    key={type}
                    label={type}
                    value={type}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>{t('flightForm.activity')} *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.activityType || '')}
                onValueChange={(value) => updateFormData('activityType', value)}
                style={styles.picker}
              >
                <Picker.Item label={t('flightForm.activityPlaceholder')} value="" />
                {AVAILABLE_ACTIVITY_TYPES.map((type) => (
                  <Picker.Item
                    key={type}
                    label={type}
                    value={type}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>{t('flightForm.drone')} *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.droneId || '')}
                onValueChange={(value) => updateFormData('droneId', value)}
                style={styles.picker}
              >
                <Picker.Item label={t('flightForm.dronePlaceholder')} value="" />
                {drones.map((drone) => (
                  <Picker.Item
                    key={drone.id}
                    label={`${drone.name} (${drone.callSign})`}
                    value={drone.id}
                  />
                ))}
              </Picker>
            </View>

            {/* Operator field - different behavior for create vs edit */}
            <Text style={styles.label}>{t('flightForm.operator')} *</Text>
            {mode === 'create' ? (
              <>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={operatorSelection}
                    onValueChange={(value) => {
                      setOperatorSelection(value);
                      if (value === 'Other') {
                        setShowOtherOperatorInput(true);
                        updateFormData('operator', '');
                      } else {
                        setShowOtherOperatorInput(false);
                        updateFormData('operator', value);
                      }
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label={t('flightForm.operatorPlaceholder')} value="" />
                    <Picker.Item 
                      label={user?.firstname && user?.surname ? `${user.firstname} ${user.surname}` : user?.email || 'Current User'} 
                      value={user?.firstname && user?.surname ? `${user.firstname} ${user.surname}` : user?.email || 'Current User'} 
                    />
                    <Picker.Item label="GOPR Bieszczady" value="GOPR Bieszczady" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                </View>

                {showOtherOperatorInput && (
                  <>
                    <Text style={styles.label}>Other Operator *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.operator}
                      onChangeText={(value) => updateFormData('operator', value)}
                      placeholder="Enter operator name"
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </>
                )}
              </>
            ) : (
              <TextInput
                style={styles.input}
                value={formData.operator}
                onChangeText={(value) => updateFormData('operator', value)}
                placeholder={t('flightForm.operatorPlaceholder')}
                autoCapitalize="words"
                autoCorrect={false}
              />
            )}

            <WebCompatibleDatePicker
              label={t('flightForm.startDate')}
              value={formData.startDate}
              onDateChange={(value) => updateFormData('startDate', value)}
              required={true}
            />

            <TimePicker
              label={t('flightForm.startTime')}
              value={formData.startTime}
              onTimeChange={(value) => updateFormData('startTime', value)}
              required={true}
            />

            <WebCompatibleDatePicker
              label={t('flightForm.endDate')}
              value={formData.endDate}
              onDateChange={(value) => updateFormData('endDate', value)}
              required={true}
            />

            <TimePicker
              label={t('flightForm.endTime')}
              value={formData.endTime}
              onTimeChange={(value) => updateFormData('endTime', value)}
              required={true}
            />

            {getFlightDuration() ? (
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{getFlightDuration()}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>{t('flightForm.conditions')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.conditions}
              onChangeText={(value) => updateFormData('conditions', value)}
              placeholder={t('flightForm.conditionsPlaceholder')}
              multiline
              numberOfLines={3}
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
                  {mode === 'create' ? t('flightForm.createButton') : t('flightForm.updateButton')}
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
    // Android-specific styling to ensure proper display
    ...(Platform.OS === 'android' && {
      paddingHorizontal: 4,
    }),
  },
  picker: {
    height: 50,
    // Android-specific styling to ensure selected value is visible
    ...(Platform.OS === 'android' && {
      color: '#333',
      backgroundColor: 'transparent',
    }),
    // iOS specific styling
    ...(Platform.OS === 'ios' && {
      color: '#333',
    }),
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
  durationContainer: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
});
