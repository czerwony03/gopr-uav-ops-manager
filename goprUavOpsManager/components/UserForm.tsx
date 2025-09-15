import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import {useTranslation} from 'react-i18next';
import {AVAILABLE_QUALIFICATIONS, Qualification, UserFormData} from '@/types/User';
import {UserRole} from "@/types/UserRole";
import WebCompatibleDatePicker from './WebCompatibleDatePicker';
import {getAvailableLanguages} from '@/src/i18n';
import { useOfflineButtons } from '@/utils/useOfflineButtons';

interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: UserFormData;
  onSave: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  currentUserRole?: UserRole;
}

export default function UserForm({ mode, initialData, onSave, onCancel, loading = false, currentUserRole }: UserFormProps) {
  const { t } = useTranslation('common');
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();

  // Default form data
  const defaultFormData: UserFormData = {
    email: '',
    role: '' as UserRole, // Keep empty for placeholder, but handle display better
    firstname: '',
    surname: '',
    phone: '',
    residentialAddress: '',
    language: '', // Keep empty for placeholder, but handle display better
    operatorNumber: '',
    operatorValidityDate: '',
    pilotNumber: '',
    pilotValidityDate: '',
    licenseConversionNumber: '',
    qualifications: [],
    insurance: '',
  };

  const [formData, setFormData] = useState<UserFormData>(initialData || defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const userRoles = Object.values(UserRole);
  const availableLanguages = getAvailableLanguages();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (mode === 'create') {
      setFormData(defaultFormData);
    }
  }, [initialData, mode]);

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const phoneRegex = /^\+?[0-9\s\-]{6,15}$/;

    // Email
    if (!(formData.email || '').trim()) {
      newErrors.email = t('userForm.validation.emailRequired');
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('userForm.validation.emailInvalid');
    }

    // Firstname
    if (!(formData.firstname || '').trim()) {
      newErrors.firstname = t('userForm.validation.firstnameRequired');
    }

    // Surname
    if (!(formData.surname || '').trim()) {
      newErrors.surname = t('userForm.validation.surnameRequired');
    }

    // Role (only validate if current user is admin)
    if (currentUserRole === UserRole.ADMIN && formData.role && !userRoles.includes(formData.role)) {
      newErrors.role = t('userForm.validation.roleRequired');
    }

    // Language
    if (!(formData.language || '').trim()) {
      newErrors.language = t('userForm.validation.languageRequired');
    } else if (!availableLanguages.some(lang => lang.code === formData.language)) {
      newErrors.language = t('userForm.validation.languageInvalid');
    }

    // Phone
    if (formData.phone && !phoneRegex.test((formData.phone || '').trim())) {
      newErrors.phone = t('userForm.validation.phoneInvalid');
    }

    // Operator Validity Date
    if (formData.operatorValidityDate && !dateRegex.test(formData.operatorValidityDate)) {
      newErrors.operatorValidityDate = t('userForm.validation.dateInvalid');
    }

    // Pilot Validity Date
    if (formData.pilotValidityDate && !dateRegex.test(formData.pilotValidityDate)) {
      newErrors.pilotValidityDate = t('userForm.validation.dateInvalid');
    }

    // Insurance Date
    if (formData.insurance && !dateRegex.test(formData.insurance)) {
      newErrors.insurance = t('userForm.validation.dateInvalid');
    }

    // Qualifications
    if (
      formData.qualifications &&
      formData.qualifications.some(q => !AVAILABLE_QUALIFICATIONS.includes(q))
    ) {
      newErrors.qualifications = t('userForm.validation.qualificationsInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || isButtonDisabled()) return;

    try {
      // Remove role from form data if current user is not admin
      if (currentUserRole !== UserRole.ADMIN) {
        const { role, ...submitDataWithoutRole } = formData;
        await onSave(submitDataWithoutRole as UserFormData);
      } else {
        await onSave(formData);
      }
    } catch (error) {
      // Error handling is done by the parent component
      throw error;
    }
  };

  const toggleQualification = (qualification: Qualification) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.includes(qualification)
        ? prev.qualifications.filter(q => q !== qualification)
        : [...prev.qualifications, qualification]
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === 'create' ? t('userForm.createTitle') : t('userForm.editTitle')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.basicInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.email')} *</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              placeholder={t('userForm.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
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
              placeholder={t('userForm.surnamePlaceholder')}
            />
            {errors.surname && <Text style={styles.errorText}>{errors.surname}</Text>}

            {/* Only show role field for admin users */}
            {currentUserRole === UserRole.ADMIN && (
              <>
                <Text style={styles.label}>{t('userForm.role')} *</Text>
                <View style={[styles.pickerContainer, errors.role && styles.inputError]}>
                  <Picker
                    selectedValue={String(formData.role || '')}
                    onValueChange={(value) => updateFormData('role', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label={t('userForm.rolePlaceholder')} value="" />
                    {userRoles.map(role => (
                      <Picker.Item
                        key={role}
                        label={t(`user.roles.${role}`)}
                        value={role}
                      />
                    ))}
                  </Picker>
                </View>
                {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
              </>
            )}

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

            <Text style={styles.label}>{t('userForm.language')}</Text>
            <View style={[styles.pickerContainer, errors.language && styles.inputError]}>
              <Picker
                selectedValue={String(formData.language || '')}
                onValueChange={(value) => updateFormData('language', value)}
                style={styles.picker}
              >
                <Picker.Item label={t('userForm.languagePlaceholder')} value="" />
                {availableLanguages.map(lang => (
                  <Picker.Item
                    key={lang.code}
                    label={t(`languages.${lang.code}`)}
                    value={lang.code}
                  />
                ))}
              </Picker>
            </View>
            {errors.language && <Text style={styles.errorText}>{errors.language}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.operatorInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.operatorNumber')}</Text>
            <TextInput
              style={styles.input}
              value={formData.operatorNumber}
              onChangeText={(value) => updateFormData('operatorNumber', value)}
              placeholder={t('userForm.operatorNumberPlaceholder')}
            />

            <WebCompatibleDatePicker
              label={t('userForm.operatorValidityDate')}
              value={formData.operatorValidityDate}
              onDateChange={(value) => updateFormData('operatorValidityDate', value)}
              error={errors.operatorValidityDate}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.pilotInfo')}</Text>
            
            <Text style={styles.label}>{t('userForm.pilotNumber')}</Text>
            <TextInput
              style={styles.input}
              value={formData.pilotNumber}
              onChangeText={(value) => updateFormData('pilotNumber', value)}
              placeholder={t('userForm.pilotNumberPlaceholder')}
            />

            <WebCompatibleDatePicker
              label={t('userForm.pilotValidityDate')}
              value={formData.pilotValidityDate}
              onDateChange={(value) => updateFormData('pilotValidityDate', value)}
              error={errors.pilotValidityDate}
            />

            <Text style={styles.label}>{t('userForm.licenseConversionNumber')}</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseConversionNumber}
              onChangeText={(value) => updateFormData('licenseConversionNumber', value)}
              placeholder={t('userForm.licenseConversionPlaceholder')}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.qualifications')}</Text>
            
            <View style={styles.qualificationsContainer}>
              {AVAILABLE_QUALIFICATIONS.map((qualification) => (
                <TouchableOpacity
                  key={qualification}
                  style={[
                    styles.qualificationItem,
                    formData.qualifications.includes(qualification) && styles.qualificationSelected
                  ]}
                  onPress={() => toggleQualification(qualification)}
                >
                  <Text style={[
                    styles.qualificationText,
                    formData.qualifications.includes(qualification) && styles.qualificationTextSelected
                  ]}>
                    {qualification}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userForm.insurance')}</Text>
            
            <WebCompatibleDatePicker
              label={t('userForm.insuranceDate')}
              value={formData.insurance}
              onDateChange={(value) => updateFormData('insurance', value)}
              error={errors.insurance}
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
                  {mode === 'create' ? t('userForm.createButton') : t('userForm.updateButton')}
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
    marginBottom: 8,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  inputError: {
    borderColor: '#ff0000',
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
    marginBottom: 8,
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
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    marginBottom: 16,
  },
  qualificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualificationItem: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qualificationSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  qualificationText: {
    fontSize: 14,
    color: '#333',
  },
  qualificationTextSelected: {
    color: '#fff',
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
