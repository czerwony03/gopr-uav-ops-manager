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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { UserFormData, AVAILABLE_QUALIFICATIONS, Qualification } from '../types/User';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { UserService } from '../services/userService';

export default function UserFormScreen() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const isEditing = !!id;

  // Default form data for creating new users
  const defaultFormData = useMemo((): UserFormData => ({
    email: '',
    role: 'user',
    firstname: '',
    surname: '',
    phone: '',
    residentialAddress: '',
    operatorNumber: '',
    operatorValidityDate: '',
    pilotNumber: '',
    pilotValidityDate: '',
    licenseConversionNumber: '',
    qualifications: [],
    insurance: '',
  }), []);

  const [formData, setFormData] = useState<UserFormData>(defaultFormData);

  const loadUserData = useCallback(async () => {
    if (!user || !id) return;

    setInitialLoading(true);
    try {
      const userData = await UserService.getUser(id, user.role, user.uid);
      if (!userData) {
        Alert.alert('Error', 'User not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setFormData({
        email: userData.email || '',
        role: userData.role || 'user',
        firstname: userData.firstname || '',
        surname: userData.surname || '',
        phone: userData.phone || '',
        residentialAddress: userData.residentialAddress || '',
        operatorNumber: userData.operatorNumber || '',
        operatorValidityDate: userData.operatorValidityDate ? 
          userData.operatorValidityDate.toISOString().split('T')[0] : '',
        pilotNumber: userData.pilotNumber || '',
        pilotValidityDate: userData.pilotValidityDate ? 
          userData.pilotValidityDate.toISOString().split('T')[0] : '',
        licenseConversionNumber: userData.licenseConversionNumber || '',
        qualifications: userData.qualifications || [],
        insurance: userData.insurance ? 
          userData.insurance.toISOString().split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user data', [
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

    // Users can edit their own profile, managers and admins can edit any profile
    if (isEditing && id && user.role !== 'admin' && user.role !== 'manager' && user.uid !== id) {
      Alert.alert('Access Denied', 'You can only edit your own profile.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Only admins can create new users (this would typically be handled by registration)
    if (!isEditing && user.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can create new users.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Load existing user data for editing
    if (isEditing && id) {
      loadUserData();
    } else if (!isEditing) {
      // Reset form to default values when creating a new user
      setFormData(defaultFormData);
    }
  }, [id, user, isEditing, router, loadUserData, defaultFormData]);

  const handleSubmit = async () => {
    if (!user) return;

    // Clear previous errors
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!formData.firstname.trim()) {
      newErrors.firstname = 'First name is required';
    }
    if (!formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }
    
    // Validate operator/pilot numbers and qualifications
    if (!formData.operatorNumber.trim() && !formData.pilotNumber.trim()) {
      newErrors.operatorNumber = 'Either Operator Number or Pilot Number is required';
      newErrors.pilotNumber = 'Either Operator Number or Pilot Number is required';
    }
    if (formData.qualifications.length === 0) {
      newErrors.qualifications = 'At least one qualification/authorization must be selected';
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please correct the highlighted fields and try again.');
      return;
    }

    setLoading(true);

    try {
      const targetUserId = isEditing ? id! : user.uid;
      
      // Prepare user data for submission
      const userData: any = {
        email: formData.email.trim(),
        firstname: formData.firstname.trim(),
        surname: formData.surname.trim(),
        phone: formData.phone.trim(),
        residentialAddress: formData.residentialAddress.trim(),
        operatorNumber: formData.operatorNumber.trim(),
        pilotNumber: formData.pilotNumber.trim(),
        licenseConversionNumber: formData.licenseConversionNumber.trim(),
        qualifications: formData.qualifications,
      };

      // Only include role field if user is admin (only admins can change roles)
      if (user.role === 'admin') {
        userData.role = formData.role;
      }

      // Convert date strings to Date objects
      if (formData.operatorValidityDate) {
        userData.operatorValidityDate = new Date(formData.operatorValidityDate);
      }
      if (formData.pilotValidityDate) {
        userData.pilotValidityDate = new Date(formData.pilotValidityDate);
      }
      if (formData.insurance) {
        userData.insurance = new Date(formData.insurance);
      }

      await UserService.updateUser(targetUserId, userData, user.role, user.uid);

      // Refresh user data if the current user updated their own profile
      if (targetUserId === user.uid && refreshUser) {
        await refreshUser();
      }

      // Navigate back immediately after successful update
      router.back();
      // Show success alert without blocking navigation
      Alert.alert(
        'Success',
        isEditing ? 'User updated successfully' : 'User created successfully'
      );
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'Failed to save user data');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleQualification = (qualification: Qualification) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.includes(qualification)
        ? prev.qualifications.filter(q => q !== qualification)
        : [...prev.qualifications, qualification]
    }));
    // Clear qualifications error when user makes a selection
    if (errors.qualifications) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.qualifications;
        return newErrors;
      });
    }
  };

  const renderQualificationItem = ({ item }: { item: Qualification }) => (
    <TouchableOpacity
      style={[
        styles.qualificationItem,
        formData.qualifications.includes(item) && styles.selectedQualification
      ]}
      onPress={() => toggleQualification(item)}
    >
      <Text style={[
        styles.qualificationText,
        formData.qualifications.includes(item) && styles.selectedQualificationText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isEditing ? 'Edit User' : 'Create User'}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[
                styles.input, 
                isEditing && styles.disabledInput,
                errors.email && styles.inputError
              ]}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              editable={!isEditing} // Email shouldn't be changed after creation
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={[styles.input, errors.firstname && styles.inputError]}
              value={formData.firstname}
              onChangeText={(value) => updateFormData('firstname', value)}
              placeholder="Enter first name"
            />
            {errors.firstname && <Text style={styles.errorText}>{errors.firstname}</Text>}

            <Text style={styles.label}>Surname *</Text>
            <TextInput
              style={[styles.input, errors.surname && styles.inputError]}
              value={formData.surname}
              onChangeText={(value) => updateFormData('surname', value)}
              placeholder="Enter surname"
            />
            {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Residential Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.residentialAddress}
              onChangeText={(value) => updateFormData('residentialAddress', value)}
              placeholder="Enter residential address"
              multiline
              numberOfLines={3}
            />

            {user?.role === 'admin' && (
              <>
                <Text style={styles.label}>Role</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value: UserRole) => updateFormData('role', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="User" value="user" />
                    <Picker.Item label="Manager" value="manager" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operator Information</Text>
            
            <Text style={styles.label}>Operator Number *</Text>
            <TextInput
              style={[styles.input, errors.operatorNumber && styles.inputError]}
              value={formData.operatorNumber}
              onChangeText={(value) => updateFormData('operatorNumber', value)}
              placeholder="Enter operator number"
            />
            {errors.operatorNumber && <Text style={styles.errorText}>{errors.operatorNumber}</Text>}

            <Text style={styles.label}>Operator Validity Date</Text>
            <TextInput
              style={styles.input}
              value={formData.operatorValidityDate}
              onChangeText={(value) => updateFormData('operatorValidityDate', value)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilot Information</Text>
            
            <Text style={styles.label}>Pilot Number *</Text>
            <TextInput
              style={[styles.input, errors.pilotNumber && styles.inputError]}
              value={formData.pilotNumber}
              onChangeText={(value) => updateFormData('pilotNumber', value)}
              placeholder="Enter pilot number"
            />
            {errors.pilotNumber && <Text style={styles.errorText}>{errors.pilotNumber}</Text>}

            <Text style={styles.label}>Pilot Validity Date</Text>
            <TextInput
              style={styles.input}
              value={formData.pilotValidityDate}
              onChangeText={(value) => updateFormData('pilotValidityDate', value)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>License Information</Text>
            
            <Text style={styles.label}>License Conversion Number or Administrative Decision Number</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseConversionNumber}
              onChangeText={(value) => updateFormData('licenseConversionNumber', value)}
              placeholder="Enter license conversion number"
            />

            <Text style={styles.label}>Insurance Date</Text>
            <TextInput
              style={styles.input}
              value={formData.insurance}
              onChangeText={(value) => updateFormData('insurance', value)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qualifications / Authorizations *</Text>
            <Text style={styles.subtitle}>Select applicable qualifications (at least one required):</Text>
            
            <FlatList
              data={AVAILABLE_QUALIFICATIONS}
              renderItem={renderQualificationItem}
              keyExtractor={(item) => item}
              numColumns={3}
              scrollEnabled={false}
              style={styles.qualificationsList}
            />
            {errors.qualifications && <Text style={styles.errorText}>{errors.qualifications}</Text>}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
                  {isEditing ? 'Update User' : 'Create User'}
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
  scrollView: {
    flex: 1,
  },
  content: {
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
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
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
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
  qualificationsList: {
    marginTop: 8,
  },
  qualificationItem: {
    flex: 1,
    margin: 4,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  selectedQualification: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  qualificationText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  selectedQualificationText: {
    color: 'white',
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
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
});
