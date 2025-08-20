import React from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import LoginScreen from "../screens/LoginScreen";
import { Footer } from "@/components/Footer";
import { formatDate, formatLastLogin } from "@/utils/dateUtils";

export default function Index() {
  const { user, loading } = useAuth();
  const { t } = useTranslation('common');
  const router = useRouter();

  console.log('[Index] Component render - user:', user?.uid, 'loading:', loading);

  // The AuthContext already handles loading user data on auth state changes
  // No need to manually refresh here, which can cause infinite loops

  if (loading) {
    console.log('[Index] Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!user) {
    console.log('[Index] No user found, showing login screen');
    return <LoginScreen />;
  }

  console.log('[Index] User authenticated, showing dashboard for:', user.uid);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#FF6B6B';
      case 'manager':
        return '#4ECDC4';
      case 'user':
        return '#45B7D1';
      default:
        return '#999';
    }
  };

  const getRoleCapabilities = (role: string) => {
    switch (role) {
      case 'admin':
        return t('dashboard.capabilities.admin', { returnObjects: true }) as string[];
      case 'manager':
        return t('dashboard.capabilities.manager', { returnObjects: true }) as string[];
      case 'user':
        return t('dashboard.capabilities.user', { returnObjects: true }) as string[];
      default:
        return t('dashboard.capabilities.default', { returnObjects: true }) as string[];
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dashboard.title')}</Text>
        <Text style={styles.welcomeText}>{t('dashboard.welcome')}, {user.email}</Text>
      </View>

      <View style={styles.roleContainer}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
          <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.capabilitiesContainer}>
        <Text style={styles.capabilitiesTitle}>{t('dashboard.capabilitiesTitle')}:</Text>
        {getRoleCapabilities(user.role).map((capability, index) => (
          <Text key={index} style={styles.capabilityItem}>
            • {capability}
          </Text>
        ))}
      </View>

      <View style={styles.lastLoginContainer}>
        <Text style={styles.lastLoginTitle}>{t('dashboard.accountActivity')}</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('dashboard.lastLogin')}</Text>
          <Text style={styles.fieldValue}>{formatLastLogin(user.lastLoginAt)}</Text>
        </View>
      </View>

      <View style={styles.profileDataContainer}>
        <Text style={styles.profileDataTitle}>{t('dashboard.profileData')}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.basicInformation')}</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.email')}</Text>
            <Text style={styles.fieldValue}>{user.email}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.firstName')}</Text>
            <Text style={styles.fieldValue}>{user.firstname || t('dashboard.notSet')}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.surname')}</Text>
            <Text style={styles.fieldValue}>{user.surname || t('dashboard.notSet')}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.phone')}</Text>
            <Text style={styles.fieldValue}>{user.phone || t('dashboard.notSet')}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.residentialAddress')}</Text>
            <Text style={styles.fieldValue}>{user.residentialAddress || t('dashboard.notSet')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.operatorInfo')}</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.operatorNumber')}</Text>
            <Text style={styles.fieldValue}>{user.operatorNumber || t('dashboard.notSet')}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.operatorValidityDate')}</Text>
            <Text style={styles.fieldValue}>{formatDate(user.operatorValidityDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.pilotInfo')}</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.pilotNumber')}</Text>
            <Text style={styles.fieldValue}>{user.pilotNumber || t('dashboard.notSet')}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.pilotValidityDate')}</Text>
            <Text style={styles.fieldValue}>{formatDate(user.pilotValidityDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.additionalInfo')}</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.licenseConversion')}</Text>
            <Text style={styles.fieldValue}>{user.licenseConversionNumber || t('dashboard.notSet')}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('dashboard.insuranceDate')}</Text>
            <Text style={styles.fieldValue}>{formatDate(user.insurance)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.qualifications')}</Text>
          
          {user.qualifications && user.qualifications.length > 0 ? (
            <View style={styles.qualificationsContainer}>
              {user.qualifications.map((qualification) => (
                <View key={qualification} style={styles.qualificationBadge}>
                  <Text style={styles.qualificationText}>{qualification}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>{t('dashboard.noQualifications')}</Text>
          )}
        </View>

      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {t('dashboard.menuInfo')}
        </Text>
        <Text style={styles.infoSubtext}>
          {t('dashboard.roleInfo', { role: user.role })}
        </Text>
      </View>
      
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  roleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  roleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  capabilitiesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  capabilitiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  capabilityItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  lastLoginContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lastLoginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  profileDataContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 5,
  },
  field: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },
  qualificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualificationBadge: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  qualificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
});
