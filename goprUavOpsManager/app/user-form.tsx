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
import { useTranslation } from 'react-i18next';
import { UserFormData, AVAILABLE_QUALIFICATIONS, Qualification } from '../types/User';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { LanguagePickerField } from '../src/components/LanguagePickerField';

export default function UserFormScreen() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const isEditing = !!id;
  const { t } = useTranslation('common');

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
      newErrors.email = t('userForm.validation.emailRequired');
    }
    if (!formData.firstname.trim()) {
      newErrors.firstname = t('userForm.validation.firstNameRequired');
    }
    if (!formData.surname.trim()) {
      newErrors.surname = t('userForm.validation.surnameRequired');
    }
    
    // Validate operator/pilot numbers and qualifications
    if (!formData.operatorNumber.trim() && !formData.pilotNumber.trim()) {
      newErrors.operatorNumber = t('userForm.validation.operatorOrPilotRequired');
      newErrors.pilotNumber = t('userForm.validation.operatorOrPilotRequired');
    }
    if (formData.qualifications.length === 0) {
      newErrors.qualifications = t('userForm.validation.qualificationsRequired');
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(t('userForm.validation.title'), t('userForm.validation.message'));
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
        t('common.success'),
        isEditing ? t('userForm.updateSuccess') : t('userForm.createSuccess')
      );
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert(t('common.error'), t('userForm.saveError'));
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isEditing ? t('userForm.editTitle') : t('userForm.createTitle')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.basicInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.email')} *</Text>
            <TextInput
              style={[
                styles.input, 
                isEditing && styles.disabledInput,
                errors.email && styles.inputError
              ]}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              placeholder={t('userForm.emailPlaceholder')}
              keyboardType="email-address"
              editable={!isEditing} // Email shouldn't be changed after creation
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>{t('userForm.firstName')} *</Text>
            <TextInput
              style={[styles.input, errors.firstname && styles.inputError]}
              value={formData.firstname}
              onChangeText={(value) => updateFormData('firstname', value)}
              placeholder={t('userForm.firstNamePlaceholder')}
            />
            {errors.firstname && <Text style={styles.errorText}>{errors.firstname}</Text>}

            <Text style={styles.label}>{t('userForm.surname')} *</Text>
            <TextInput
              style={[styles.input, errors.surname && styles.inputError]}
              value={formData.surname}
              onChangeText={(value) => updateFormData('surname', value)}
              placeholder={t('userForm.surnameePlaceholder')}
            />
            {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}

            <Text style={styles.label}>{t('userForm.phone')}</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              placeholder={t('userForm.phonePlaceholder')}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>{t('userForm.address')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.residentialAddress}
              onChangeText={(value) => updateFormData('residentialAddress', value)}
              placeholder={t('userForm.addressPlaceholder')}
              multiline
              numberOfLines={3}
            />

            {user?.role === 'admin' && (
              <>
                <Text style={styles.label}>{t('userForm.role')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value: UserRole) => updateFormData('role', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label={t('user.user')} value="user" />
                    <Picker.Item label={t('user.manager')} value="manager" />
                    <Picker.Item label={t('user.admin')} value="admin" />
                  </Picker>
                </View>
              </>
            )}

            {/* Language Selector - only show for editing own profile */}
            {isEditing && id === user?.uid && (
              <LanguagePickerField />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.operatorInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.operatorNumber')} *</Text>
            <TextInput
              style={[styles.input, errors.operatorNumber && styles.inputError]}
              value={formData.operatorNumber}
              onChangeText={(value) => updateFormData('operatorNumber', value)}
              placeholder={t('userForm.operatorNumberPlaceholder')}
            />
            {errors.operatorNumber && <Text style={styles.errorText}>{errors.operatorNumber}</Text>}

            <Text style={styles.label}>{t('userForm.operatorValidityDate')}</Text>
            <TextInput
              style={styles.input}
              value={formData.operatorValidityDate}
              onChangeText={(value) => updateFormData('operatorValidityDate', value)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.pilotInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.pilotNumber')} *</Text>
            <TextInput
              style={[styles.input, errors.pilotNumber && styles.inputError]}
              value={formData.pilotNumber}
              onChangeText={(value) => updateFormData('pilotNumber', value)}
              placeholder={t('userForm.pilotNumberPlaceholder')}
            />
            {errors.pilotNumber && <Text style={styles.errorText}>{errors.pilotNumber}</Text>}

            <Text style={styles.label}>{t('userForm.pilotValidityDate')}</Text>
            <TextInput
              style={styles.input}
              value={formData.pilotValidityDate}
              onChangeText={(value) => updateFormData('pilotValidityDate', value)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.licenseInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.licenseConversionNumber')}</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseConversionNumber}
              onChangeText={(value) => updateFormData('licenseConversionNumber', value)}
              placeholder={t('userForm.licenseConversionPlaceholder')}
            />

            <Text style={styles.label}>{t('userForm.insuranceDate')}</Text>
            <TextInput
              style={styles.input}
              value={formData.insurance}
              onChangeText={(value) => updateFormData('insurance', value)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.qualifications')} *</Text>
            <Text style={styles.subtitle}>{t('userForm.qualificationsSubtitle')}</Text>
            
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
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
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
                  {isEditing ? t('userForm.updateButton') : t('userForm.createButton')}
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
