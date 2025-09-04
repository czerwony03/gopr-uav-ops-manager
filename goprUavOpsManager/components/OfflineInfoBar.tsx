import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface OfflineInfoBarProps {
  visible: boolean;
  message?: string;
}

/**
 * Info bar component that displays when the app is using offline/cached data
 */
export default function OfflineInfoBar({ visible, message }: OfflineInfoBarProps) {
  const { t } = useTranslation('common');

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.message}>
        {message || t('offline.viewingCachedData')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E85A2B',
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
  },
});