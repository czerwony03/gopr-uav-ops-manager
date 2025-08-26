import React from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import { Footer } from "@/components/Footer";
import { formatLastLogin } from "@/utils/dateUtils";
import UserComponent from "@/components/UserComponent";
import { UserRole } from "@/types/UserRole";

export default function Index() {
  const { user, loading } = useAuth();
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();

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

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '#FF6B6B';
      case UserRole.MANAGER:
        return '#4ECDC4';
      case UserRole.USER:
        return '#45B7D1';
      default:
        return '#999';
    }
  };

  const getRoleCapabilities = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return t('dashboard.capabilities.admin', { returnObjects: true }) as string[];
      case UserRole.MANAGER:
        return t('dashboard.capabilities.manager', { returnObjects: true }) as string[];
      case UserRole.USER:
        return t('dashboard.capabilities.user', { returnObjects: true }) as string[];
      default:
        return t('dashboard.capabilities.default', { returnObjects: true }) as string[];
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}
    >
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

      <View style={styles.userDetailsContainer}>
        <Text style={styles.userDetailsTitle}>{t('dashboard.profileData')}</Text>
        <UserComponent 
          user={user} 
          mode="detail" 
          showActions={true}
          showDetailActions={false}
          currentUserRole={user.role}
        />
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
  },
  scrollContent: {
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
    marginTop: 16,
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
  userDetailsContainer: {
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
  userDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
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
