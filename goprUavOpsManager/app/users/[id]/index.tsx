import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/User';
import { UserService } from '@/services/userService';
import UserComponent from '@/components/UserComponent';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const crossPlatformAlert = useCrossPlatformAlert();

  const fetchUserDetails = useCallback(async () => {
    if (!currentUser || !id) return;

    try {
      const userData = await UserService.getUser(id, currentUser.role, currentUser.uid);
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user details:', error);
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: t('userDetails.loadError'),
        buttons: [
          { text: t('common.ok'), onPress: () => router.back() }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, id, router, t, crossPlatformAlert]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
      return;
    }
  }, [currentUser, router]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('userDetails.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <UserComponent
          user={user}
          mode="detail"
          showDetailActions={true}
        />
      </ScrollView>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    marginBottom: 20,
  },
});