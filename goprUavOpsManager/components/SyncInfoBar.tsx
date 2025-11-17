import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

interface SyncInfoBarProps {
  visible: boolean;
}

/**
 * Info bar component that displays when background data sync is in progress
 */
export default function SyncInfoBar({ visible }: SyncInfoBarProps) {
  const { t } = useTranslation('common');

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#fff" />
      <Text style={styles.message}>
        {t('sync.syncingData')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1976D2',
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },
});
