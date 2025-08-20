import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import plCommon from './locales/pl/common.json';
import enCommon from './locales/en/common.json';

const LANGUAGE_STORAGE_KEY = 'user_language';

// Resources object with translations
const resources = {
  pl: {
    common: plCommon,
  },
  en: {
    common: enCommon,
  },
};

// Get device language with fallback to Polish
const getDeviceLanguage = (): string => {
  const locales = RNLocalize.getLocales();
  if (locales.length > 0) {
    const primaryLocale = locales[0];
    // Support Polish and English, fallback to Polish
    if (primaryLocale.languageCode === 'en') {
      return 'en';
    }
  }
  return 'pl'; // Default and fallback to Polish
};

// Get stored language preference
const getStoredLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && (storedLanguage === 'pl' || storedLanguage === 'en')) {
      return storedLanguage;
    }
  } catch (error) {
    console.warn('Failed to get stored language:', error);
  }
  return getDeviceLanguage();
};

// Store language preference
export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to store language:', error);
  }
};

// Initialize i18next
const initI18n = async (): Promise<void> => {
  const storedLanguage = await getStoredLanguage();
  
  // eslint-disable-next-line import/no-named-as-default-member
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: storedLanguage,
      fallbackLng: 'pl', // Polish is the fallback language
      debug: __DEV__,
      
      // Namespace settings
      defaultNS: 'common',
      ns: ['common'],
      
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      
      // React i18next options
      react: {
        useSuspense: false,
      },
    });
};

// Change language function
export const changeLanguage = async (language: string): Promise<void> => {
  if (language === 'pl' || language === 'en') {
    await setStoredLanguage(language);
    // eslint-disable-next-line import/no-named-as-default-member
    await i18n.changeLanguage(language);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'pl';
};

// Get available languages
export const getAvailableLanguages = (): { code: string; name: string; nativeName: string }[] => {
  return [
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];
};

// Initialize and export
initI18n();

export default i18n;