import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from '../i18n';
import { useCrossPlatformAlert } from '../../components/CrossPlatformAlert';

interface LanguageSelectorProps {
  style?: any;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ style }) => {
  const { t } = useTranslation('common');
  const currentLanguage = getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();
  const crossPlatformAlert = useCrossPlatformAlert();

  const handleLanguageChange = () => {
    const options = availableLanguages.map(lang => ({
      text: `${lang.nativeName} (${lang.name})`,
      onPress: async () => {
        try {
          await changeLanguage(lang.code);
          // Show success message in the selected language
          crossPlatformAlert.showAlert({
            title: lang.code === 'pl' ? 'Sukces' : 'Success',
            message: lang.code === 'pl' 
              ? 'Język został zmieniony' 
              : 'Language has been changed'
          });
        } catch (error) {
          console.error('Error changing language:', error);
          crossPlatformAlert.showAlert({
            title: lang.code === 'pl' ? 'Błąd' : 'Error',
            message: lang.code === 'pl' 
              ? 'Nie udało się zmienić języka' 
              : 'Failed to change language'
          });
        }
      },
    }));

    options.push({
      text: t('common.cancel'),
      onPress: async () => {},
    });

    crossPlatformAlert.showAlert({
      title: t('settings.language'),
      buttons: options
    });
  };

  const getCurrentLanguageDisplay = () => {
    const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);
    return currentLang ? currentLang.nativeName : 'Polski';
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.languageButton} onPress={handleLanguageChange}>
        <View style={styles.languageInfo}>
          <Ionicons name="language-outline" size={24} color="#0066CC" />
          <View style={styles.textContainer}>
            <Text style={styles.languageLabel}>{t('settings.language')}</Text>
            <Text style={styles.currentLanguage}>{getCurrentLanguageDisplay()}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  currentLanguage: {
    fontSize: 14,
    color: '#666',
  },
});