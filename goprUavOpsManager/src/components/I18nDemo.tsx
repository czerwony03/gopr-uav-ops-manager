import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';

export default function I18nDemo() {
  const { t } = useTranslation('common');
  const currentLanguage = getCurrentLanguage();

  const switchLanguage = async () => {
    const newLang = currentLanguage === 'pl' ? 'en' : 'pl';
    await changeLanguage(newLang);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>i18n Demo</Text>
      
      <Text style={styles.label}>Current Language: {currentLanguage}</Text>
      
      <View style={styles.translationsContainer}>
        <Text style={styles.sectionTitle}>{t('nav.home')}</Text>
        <Text>{t('nav.flights')}</Text>
        <Text>{t('nav.drones')}</Text>
        <Text>{t('nav.users')}</Text>
        <Text>{t('nav.info')}</Text>
        
        <Text style={styles.sectionTitle}>{t('auth.signIn')}</Text>
        <Text>{t('auth.email')}</Text>
        <Text>{t('auth.password')}</Text>
        
        <Text style={styles.sectionTitle}>{t('common.welcome')}</Text>
        <Text>{t('common.loading')}</Text>
        <Text>{t('common.error')}</Text>
        <Text>{t('common.ok')}</Text>
        <Text>{t('common.cancel')}</Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={switchLanguage}>
        <Text style={styles.buttonText}>
          Switch to {currentLanguage === 'pl' ? 'English' : 'Polski'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  translationsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#0066CC',
  },
  button: {
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});