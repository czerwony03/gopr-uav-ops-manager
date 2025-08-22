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
import { UserFormData, AVAILABLE_QUALIFICATIONS, Qualification } from '@/types/User';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import { LanguagePickerField } from '@/src/components/LanguagePickerField';

export default function EditUserScreen() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
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
    if (id && user.role !== 'admin' && user.role !== 'manager' && user.uid !== id) {
      Alert.alert('Access Denied', 'You can only edit your own profile.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Load existing user data for editing
    if (id) {
      loadUserData();
    }
  }, [id, user, router, loadUserData]);

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
      const targetUserId = id!;
      
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
      Alert.alert(t('common.success'), t('userForm.updateSuccess'));
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

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>{t('userForm.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.basicInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.email')}</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                placeholder={t('userForm.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.firstName')}</Text>
              <TextInput
                style={[styles.input, errors.firstname && styles.inputError]}
                value={formData.firstname}
                onChangeText={(text) => updateFormData('firstname', text)}
                placeholder={t('userForm.firstNamePlaceholder')}
                autoCapitalize="words"
              />
              {errors.firstname && <Text style={styles.errorText}>{errors.firstname}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.surname')}</Text>
              <TextInput
                style={[styles.input, errors.surname && styles.inputError]}
                value={formData.surname}
                onChangeText={(text) => updateFormData('surname', text)}
                placeholder={t('userForm.surnameePlaceholder')}
                autoCapitalize="words"
              />
              {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.phone')}</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                placeholder={t('userForm.phonePlaceholder')}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.address')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.residentialAddress}
                onChangeText={(text) => updateFormData('residentialAddress', text)}
                placeholder={t('userForm.addressPlaceholder')}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Only show role picker for admins */}
            {user.role === 'admin' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('userForm.role')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) => updateFormData('role', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label={t('user.user')} value="user" />
                    <Picker.Item label={t('user.manager')} value="manager" />
                    <Picker.Item label={t('user.admin')} value="admin" />
                  </Picker>
                </View>
              </View>
            )}
          </View>

          {/* Operator Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.operatorInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.operatorNumber')}</Text>
              <TextInput
                style={[styles.input, errors.operatorNumber && styles.inputError]}
                value={formData.operatorNumber}
                onChangeText={(text) => updateFormData('operatorNumber', text)}
                placeholder={t('userForm.operatorNumberPlaceholder')}
              />
              {errors.operatorNumber && <Text style={styles.errorText}>{errors.operatorNumber}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.operatorValidityDate')}</Text>
              <TextInput
                style={styles.input}
                value={formData.operatorValidityDate}
                onChangeText={(text) => updateFormData('operatorValidityDate', text)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
            </View>
          </View>

          {/* Pilot Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.pilotInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.pilotNumber')}</Text>
              <TextInput
                style={[styles.input, errors.pilotNumber && styles.inputError]}
                value={formData.pilotNumber}
                onChangeText={(text) => updateFormData('pilotNumber', text)}
                placeholder={t('userForm.pilotNumberPlaceholder')}
              />
              {errors.pilotNumber && <Text style={styles.errorText}>{errors.pilotNumber}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.pilotValidityDate')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pilotValidityDate}
                onChangeText={(text) => updateFormData('pilotValidityDate', text)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
            </View>
          </View>

          {/* License Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.licenseInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.licenseConversionNumber')}</Text>
              <TextInput
                style={styles.input}
                value={formData.licenseConversionNumber}
                onChangeText={(text) => updateFormData('licenseConversionNumber', text)}
                placeholder={t('userForm.licenseConversionPlaceholder')}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.insuranceDate')}</Text>
              <TextInput
                style={styles.input}
                value={formData.insurance}
                onChangeText={(text) => updateFormData('insurance', text)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
            </View>
          </View>

          {/* Qualifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.qualifications')}</Text>
            <Text style={styles.sectionSubtitle}>{t('userForm.qualificationsSubtitle')}</Text>
            
            {errors.qualifications && (
              <Text style={[styles.errorText, { marginBottom: 10 }]}>{errors.qualifications}</Text>
            )}
            
            <FlatList
              data={AVAILABLE_QUALIFICATIONS}
              renderItem={renderQualificationItem}
              keyExtractor={(item) => item}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.qualificationsList}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>{t('userForm.updateButton')}</Text>
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
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
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  qualificationsList: {
    gap: 8,
  },
  qualificationItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    margin: 4,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  selectedQualification: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  qualificationText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedQualificationText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#0066CC',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});