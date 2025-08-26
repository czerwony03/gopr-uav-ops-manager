import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage, getAvailableLanguages, changeLanguage } from '../i18n';

interface LanguagePickerFieldProps {
  style?: any;
  onLanguageChange?: (language: string) => void;
}

export const LanguagePickerField: React.FC<LanguagePickerFieldProps> = ({ 
  style, 
  onLanguageChange 
}) => {
  const { t } = useTranslation('common');
  const currentLanguage = getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = async (language: string) => {
    try {
      await changeLanguage(language);
      if (onLanguageChange) {
        onLanguageChange(language);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={String(currentLanguage || '')}
          onValueChange={handleLanguageChange}
          style={styles.picker}
        >
          {availableLanguages.map(lang => (
            <Picker.Item 
              key={lang.code} 
              label={`${lang.nativeName} (${lang.name})`} 
              value={lang.code} 
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
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
});