import React, { useEffect } from "react";
import { Text, View, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import { Footer } from "@/components/Footer";
import { UserRole } from "@/types/UserRole";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineButtons } from "@/utils/useOfflineButtons";

export default function Index() {
  const { user, loading } = useAuth();
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isNavigationDisabled, getDisabledStyle } = useOfflineButtons();

  console.log('[Index] Component render - user:', user?.uid, 'loading:', loading);

  // The AuthContext already handles loading user data on auth state changes
  // No need to manually refresh here, which can cause infinite loops

  if (loading) {
    console.log('[Index] Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="loading-indicator" size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!user) {
    console.log('[Index] No user found, showing login screen');
    return <LoginScreen />;
  }

  console.log('[Index] User authenticated, showing dashboard for:', user.uid);

  // Check if user profile is complete and redirect if needed
  useEffect(() => {
    // Only check if user is authenticated and profile is incomplete
    if (user && (!user.firstname?.trim() || !user.surname?.trim())) {
      console.log('[Index] Redirecting to profile edit - missing firstname or surname');
      router.navigate(`/users/${user.uid}/edit`);
    }
  }, [user, router]);

  // Navigation button configuration
  const navigationButtons = [
    {
      key: 'flights',
      title: t('dashboard.navigation.flights'),
      icon: 'airplane-outline',
      route: '/flights',
      color: '#4CAF50',
      show: true
    },
    {
      key: 'drones',
      title: t('dashboard.navigation.drones'),
      icon: 'hardware-chip-outline',
      route: '/drones',
      color: '#2196F3',
      show: true
    },
    {
      key: 'procedures',
      title: t('dashboard.navigation.procedures'),
      icon: 'clipboard-outline',
      route: '/procedures',
      color: '#FF9800',
      show: true
    },
    {
      key: 'profile',
      title: t('dashboard.navigation.profile'),
      icon: 'person-outline',
      route: `/users/${user.uid}`,
      color: '#9C27B0',
      show: true
    },
    {
      key: 'users',
      title: t('dashboard.navigation.users'),
      icon: 'people-outline',
      route: '/users',
      color: '#F44336',
      show: user.role === UserRole.ADMIN || user.role === UserRole.MANAGER
    },
    {
      key: 'logs',
      title: t('dashboard.navigation.logs'),
      icon: 'document-text-outline',
      route: '/audit-logs',
      color: '#607D8B',
      show: user.role === UserRole.ADMIN
    }
  ].filter(button => button.show);

  const handleNavigation = (route: string) => {
    // Only navigate if not disabled
    if (!isNavigationDisabled(route)) {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          <Text style={styles.welcomeText}>{t('dashboard.welcome')}, {user.email}</Text>
        </View>

        {/* Navigation Grid */}
        <View style={styles.navigationGrid}>
          {navigationButtons.map((button) => {
            const isProceduresRoute = button.route.startsWith('/procedures');
            const disabled = isNavigationDisabled(button.route);
            
            return (
              <TouchableOpacity
                key={button.key}
                style={[
                  styles.navigationButton, 
                  { backgroundColor: button.color },
                  getDisabledStyle(isProceduresRoute)
                ]}
                onPress={() => handleNavigation(button.route)}
                activeOpacity={disabled ? 1 : 0.7}
                disabled={disabled}
              >
                <View style={styles.buttonContent}>
                  <Ionicons 
                    name={button.icon as any} 
                    size={48} 
                    color={disabled ? "#999" : "#FFFFFF"} 
                    style={styles.buttonIcon}
                  />
                  <Text style={[
                    styles.buttonText, 
                    disabled && { color: '#999' }
                  ]}>{button.title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
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
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  navigationButton: {
    width: '48%', // Always 2 columns
    aspectRatio: 1, // Make buttons square
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  buttonIcon: {
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
});
