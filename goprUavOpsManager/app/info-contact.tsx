import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ApplicationMetadata } from "@/utils/applicationMetadata";

export default function InfoContact() {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  
  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 32, 32) }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('contact.title')}</Text>
      </View>

      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/redmed-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t('contact.about')}</Text>
        <Text style={styles.description}>
          {t('contact.aboutDescription')}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t('contact.contactInfo')}</Text>
        
        <View style={styles.contactItem}>
          <Ionicons name="business-outline" size={20} color="#0066CC" />
          <Text style={styles.contactLabel}>{t('contact.company')}</Text>
          <Text style={styles.contactValue}>{t('contact.companyName')}</Text>
        </View>

        <TouchableOpacity 
          style={styles.contactItem}
          onPress={() => handleEmailPress('m.wronski@bieszczady.gopr.pl')}
        >
          <Ionicons name="mail-outline" size={20} color="#0066CC" />
          <Text style={styles.contactLabel}>{t('contact.generalContact')}</Text>
          <Text style={[styles.contactValue, styles.linkText]}>m.wronski@bieszczady.gopr.pl</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.contactItem}
          onPress={() => handleEmailPress('admin@redmed.dev')}
        >
          <Ionicons name="person-outline" size={20} color="#0066CC" />
          <Text style={styles.contactLabel}>{t('contact.technicalContact')}</Text>
          <Text style={[styles.contactValue, styles.linkText]}>admin@redmed.dev</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t('contact.applicationInfo')}</Text>
        <Text style={styles.description}>
          {t('contact.versionInfo', { version: ApplicationMetadata.getMetadata().applicationVersion, commitHash: ApplicationMetadata.getMetadata().commitHash })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 200,
    height: 80,
    alignSelf: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  contactValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
  },
  linkText: {
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
});
