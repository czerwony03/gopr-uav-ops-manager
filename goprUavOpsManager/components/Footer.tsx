import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Footer() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
      <View style={styles.authorInfo}>
        <Text style={styles.companyText}>RedMed Software</Text>
        <Text style={styles.contactText}>admin@redmed.dev</Text>
        <Text style={styles.contactText}>m.wronski@bieszczady.gopr.pl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  authorInfo: {
    alignItems: 'center',
  },
  companyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});