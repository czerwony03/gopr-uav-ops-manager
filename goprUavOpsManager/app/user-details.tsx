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
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/User';
import { UserService } from '../services/userService';

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = useCallback(async () => {
    if (!currentUser || !id) return;

    try {
      const userData = await UserService.getUser(id, currentUser.role, currentUser.uid);
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, id, router]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString();
  };

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
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
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
            <Text style={styles.title}>User Details</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user.email}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <Text style={styles.fieldValue}>{user.firstname || 'Not set'}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Surname</Text>
              <Text style={styles.fieldValue}>{user.surname || 'Not set'}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <Text style={styles.fieldValue}>{user.phone || 'Not set'}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Residential Address</Text>
              <Text style={styles.fieldValue}>{user.residentialAddress || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operator Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Operator Number</Text>
              <Text style={styles.fieldValue}>{user.operatorNumber || 'Not set'}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Operator Validity Date</Text>
              <Text style={styles.fieldValue}>{formatDate(user.operatorValidityDate)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilot Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Pilot Number</Text>
              <Text style={styles.fieldValue}>{user.pilotNumber || 'Not set'}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Pilot Validity Date</Text>
              <Text style={styles.fieldValue}>{formatDate(user.pilotValidityDate)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>License Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>License Conversion Number</Text>
              <Text style={styles.fieldValue}>{user.licenseConversionNumber || 'Not set'}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Insurance Date</Text>
              <Text style={styles.fieldValue}>{formatDate(user.insurance)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qualifications / Authorizations</Text>
            
            {user.qualifications && user.qualifications.length > 0 ? (
              <View style={styles.qualificationsContainer}>
                {user.qualifications.map((qualification) => (
                  <View key={qualification} style={styles.qualificationBadge}>
                    <Text style={styles.qualificationText}>{qualification}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldValue}>No qualifications set</Text>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/user-form?id=${user.uid}`)}
            >
              <Text style={styles.editButtonText}>Edit User</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Back</Text>
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