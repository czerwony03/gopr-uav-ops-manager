import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/User';
import { UserService } from '../services/userService';
import { formatDate, formatLastLogin } from '../utils/dateUtils';

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = useCallback(async () => {
    if (!currentUser || !id) return;

    try {
      const userData = await UserService.getUser(id, currentUser.role, currentUser.uid);
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert(t('common.error'), t('userDetails.loadError'), [
        { text: t('common.ok'), onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, id, router]);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('userDetails.title')}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.roleText}>{t(`user.${user.role}`)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userDetails.basicInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('user.email')}</Text>
              <Text style={styles.fieldValue}>{user.email}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('user.firstName')}</Text>
              <Text style={styles.fieldValue}>{user.firstname || t('userDetails.noData')}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('user.lastName')}</Text>
              <Text style={styles.fieldValue}>{user.surname || t('userDetails.noData')}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.phone')}</Text>
              <Text style={styles.fieldValue}>{user.phone || t('userDetails.noPhone')}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.address')}</Text>
              <Text style={styles.fieldValue}>{user.residentialAddress || t('userDetails.noAddress')}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userDetails.operatorInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.operatorNumber')}</Text>
              <Text style={styles.fieldValue}>{user.operatorNumber || t('userDetails.noData')}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.operatorValidityDate')}</Text>
              <Text style={styles.fieldValue}>{formatDate(user.operatorValidityDate)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userDetails.pilotInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.pilotNumber')}</Text>
              <Text style={styles.fieldValue}>{user.pilotNumber || t('userDetails.noData')}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.pilotValidityDate')}</Text>
              <Text style={styles.fieldValue}>{formatDate(user.pilotValidityDate)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userDetails.licenseInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.licenseConversionNumber')}</Text>
              <Text style={styles.fieldValue}>{user.licenseConversionNumber || t('userDetails.noData')}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('userForm.insuranceDate')}</Text>
              <Text style={styles.fieldValue}>{formatDate(user.insurance)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userDetails.qualifications')}</Text>
            
            {user.qualifications && user.qualifications.length > 0 ? (
              <View style={styles.qualificationsContainer}>
                {user.qualifications.map((qualification) => (
                  <View key={qualification} style={styles.qualificationBadge}>
                    <Text style={styles.qualificationText}>{qualification}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldValue}>{t('userDetails.noData')}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userDetails.accountInfo')}</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('common.lastLogin')}</Text>
              <Text style={styles.fieldValue}>{formatLastLogin(user.lastLoginAt)}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/user-form?id=${user.uid}`)}
            >
              <Text style={styles.editButtonText}>{t('userDetails.editButton')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    padding: 16,
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qualificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  editButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});