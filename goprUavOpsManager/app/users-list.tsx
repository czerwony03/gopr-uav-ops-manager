import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { UserService } from '@/services/userService';

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  firstname?: string;
  surname?: string;
}

export default function UsersListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const fetchedUsers = await UserService.getUsers(user.role);
      const usersData: UserData[] = fetchedUsers.map(userData => ({
        id: userData.uid,
        email: userData.email,
        role: userData.role,
        firstname: userData.firstname,
        surname: userData.surname,
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert(t('common.error'), t('users.errors.fetchFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'admin' || user?.role === 'manager') {
        fetchUsers();
      }
    }, [fetchUsers, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  // Only allow admin and manager users to access this screen
  if (!user) {
    // Redirecting to login - show nothing while redirecting
    return null;
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('users.accessDenied')}</Text>
          <Text style={styles.errorSubtext}>
            {t('users.accessDeniedMessage')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const userDoc = doc(firestore, 'users', userId);
      await updateDoc(userDoc, { role: newRole });
      
      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, role: newRole } : u
        )
      );
      
      Alert.alert(t('common.success'), t('users.roleUpdated', { role: newRole }));
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert(t('common.error'), t('users.errors.roleUpdateFailed'));
    }
  };

  const showRoleUpdateDialog = (userId: string, _currentRole: UserRole) => {
    Alert.alert(
      t('users.updateRole'),
      t('users.selectNewRole'),
      [
        {
          text: t('user.user'),
          onPress: () => updateUserRole(userId, 'user'),
        },
        {
          text: t('user.manager'),
          onPress: () => updateUserRole(userId, 'manager'),
        },
        {
          text: t('user.admin'),
          onPress: () => updateUserRole(userId, 'admin'),
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const getRoleColor = (role: UserRole) => {
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

  const renderUserItem = ({ item }: { item: UserData }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{item.email}</Text>
        {(item.firstname || item.surname) && (
          <Text style={styles.userName}>
            {[item.firstname, item.surname].filter(Boolean).join(' ')}
          </Text>
        )}
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push(`/user-details?id=${item.id}`)}
        >
          <Text style={styles.viewButtonText}>{t('users.viewDetails')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/user-form?id=${item.id}`)}
        >
          <Text style={styles.editButtonText}>{t('common.edit')}</Text>
        </TouchableOpacity>
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => showRoleUpdateDialog(item.id, item.role)}
          >
            <Text style={styles.roleButtonText}>{t('users.role')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('users.management')}</Text>
        <Text style={styles.subtitle}>{t('users.manageRolesPermissions')}</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  roleButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
