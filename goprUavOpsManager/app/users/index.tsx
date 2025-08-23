import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/contexts/AuthContext';
import {doc, updateDoc} from 'firebase/firestore';
import {firestore} from '@/firebaseConfig';
import {useFocusEffect} from '@react-navigation/native';
import {useRouter} from 'expo-router';
import {UserService} from '@/services/userService';
import {UserRole} from "@/types/UserRole";
import UserComponent from '@/components/UserComponent';

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
          onPress: () => updateUserRole(userId, UserRole.USER),
        },
        {
          text: t('user.manager'),
          onPress: () => updateUserRole(userId, UserRole.MANAGER),
        },
        {
          text: t('user.admin'),
          onPress: () => updateUserRole(userId, UserRole.ADMIN),
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const renderUserItem = ({ item }: { item: UserData }) => (
    <UserComponent
      user={item}
      mode="card"
      currentUserRole={user?.role}
      onRoleUpdate={showRoleUpdateDialog}
    />
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
        {/* Temporarily hidden - create functionality not implemented yet
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/users/create')}
        >
          <Text style={styles.addButtonText}>{t('userForm.createTitle')}</Text>
        </TouchableOpacity>
        */}
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
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
    paddingBottom: 24,
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
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 16,
  },
});
