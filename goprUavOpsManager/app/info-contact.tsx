import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ApplicationMetadata } from "@/utils/applicationMetadata";
import { useConsole } from '@/contexts/ConsoleContext';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';

export default function InfoContact() {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const { showConsole } = useConsole();
  const responsive = useResponsiveLayout();
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);
  
  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleLogoPress = () => {
    // Reset timeout if it exists
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Add some console messages for demonstration when tapping
    if (newTapCount === 1) {
      console.info('[InfoContact] Logo tapped - starting easter egg sequence');
    } else if (newTapCount === 3) {
      console.info('[InfoContact] Halfway to activating debug console...');
    } else if (newTapCount === 5) {
      console.info('[InfoContact] Almost there! Two more taps to activate debug console');
    }

    // If user taps 7 times, show the console
    if (newTapCount >= 7) {
      console.info('[InfoContact] 🎉 Easter egg activated! Opening debug console...');
      showConsole();
      setTapCount(0);
      return;
    }

    // Reset tap count after 2 seconds of inactivity
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.scrollContent, 
        { paddingBottom: Math.max(insets.bottom + 32, 32) },
        responsive.isDesktop && {
          paddingHorizontal: responsive.spacing.large,
          alignItems: 'center',
        }
      ]}
    >
      {/* Content wrapper for max-width on desktop */}
      <View style={[
        responsive.isDesktop && {
          width: '100%',
          maxWidth: responsive.maxContentWidth,
        }
      ]}>
        <View style={styles.header}>
          <Text style={[
            styles.title,
            { fontSize: responsive.fontSize.title }
          ]}>{t('contact.title')}</Text>
        </View>

        <View style={styles.logoContainer}>
          <TouchableOpacity 
            onPress={handleLogoPress}
            activeOpacity={0.7}
            style={styles.logoTouchable}
          >
            <Image 
              source={require('../assets/images/redmed-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {tapCount > 0 && tapCount < 7 ? (
              <View style={styles.tapIndicator}>
                <Text style={styles.tapIndicatorText}>{tapCount}/7</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={[
            styles.sectionTitle,
            { fontSize: responsive.fontSize.subtitle }
          ]}>{t('contact.about')}</Text>
          <Text style={[
            styles.description,
            { fontSize: responsive.fontSize.body }
          ]}>
            {t('contact.aboutDescription')}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={[
            styles.sectionTitle,
            { fontSize: responsive.fontSize.subtitle }
          ]}>{t('contact.contactInfo')}</Text>
          
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
        <Text style={[
          styles.sectionTitle,
          { fontSize: responsive.fontSize.subtitle }
        ]}>{t('contact.applicationInfo')}</Text>
        <Text style={[
          styles.description,
          { fontSize: responsive.fontSize.body }
        ]}>
          {t('contact.versionInfo', { version: ApplicationMetadata.getMetadata().applicationVersion, commitHash: ApplicationMetadata.getMetadata().commitHash })}
        </Text>
      </View>
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
    fontWeight: 'bold',
    color: '#333',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  logoTouchable: {
    position: 'relative',
  },
  logoImage: {
    width: 200,
    height: 80,
    alignSelf: 'center',
  },
  tapIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  tapIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  description: {
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
