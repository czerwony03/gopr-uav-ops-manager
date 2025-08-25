import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import UserForm from '@/components/UserForm';
import { UserFormData } from '@/types/User';

export default function EditUserScreen() {
  const [loading, setLoading] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  const [initialData, setInitialData] = useState<UserFormData | undefined>();

  const fetchUser = useCallback(async (userId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const userData = await UserService.getUser(userId, user.role, user.uid);
      if (userData) {
        // Convert the user data to form data format (dates as strings)
        const formData: UserFormData = {
          email: userData.email,
          role: userData.role,
          firstname: userData.firstname || '',
          surname: userData.surname || '',
          phone: userData.phone || '',
          residentialAddress: userData.residentialAddress || '',
          language: userData.language || 'pl', // Default to Polish if not set
          operatorNumber: userData.operatorNumber || '',
          operatorValidityDate: userData.operatorValidityDate ? userData.operatorValidityDate.toISOString().split('T')[0] : '',
          pilotNumber: userData.pilotNumber || '',
          pilotValidityDate: userData.pilotValidityDate ? userData.pilotValidityDate.toISOString().split('T')[0] : '',
          licenseConversionNumber: userData.licenseConversionNumber || '',
          qualifications: userData.qualifications || [],
          insurance: userData.insurance ? userData.insurance.toISOString().split('T')[0] : '',
        };
        setInitialData(formData);
      } else {
        Alert.alert(t('common.error'), t('userForm.notFound'));
        router.back();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert(t('common.error'), t('userForm.loadError'));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user, router, t]);

  useEffect(() => {
    // Check authentication first - redirect to login if not authenticated
    if (!user) {
      router.replace('/');
      return;
    }

    // Check permissions - users can edit their own profile, managers and admins can edit any profile
    if (user.role !== 'admin' && user.role !== 'manager' && user.uid !== id) {
      Alert.alert(t('common.accessDenied'), t('common.permissionDenied'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    if (id && typeof id === 'string') {
      fetchUser(id);
    } else {
      router.back();
    }
  }, [user, router, t, fetchUser, id]);

  const handleSave = async (formData: UserFormData) => {
    if (!user || !id || typeof id !== 'string') return;

    setLoading(true);
    try {
      const formDataWithDates = {
        ...formData,
        // Convert empty strings to undefined (to maintain User type compatibility), valid date strings to Date objects
        // This ensures empty date fields are properly cleared in Firestore
        operatorValidityDate: formData.operatorValidityDate ? new Date(formData.operatorValidityDate) : undefined,
        pilotValidityDate: formData.pilotValidityDate ? new Date(formData.pilotValidityDate) : undefined,
        insurance: formData.insurance ? new Date(formData.insurance) : undefined,
      };

      await UserService.updateUser(id, formDataWithDates, user.role, user.uid);
      router.back();
      Alert.alert(t('userForm.success'), t('userForm.userUpdated'));
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert(t('userForm.error'), t('userForm.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{
        title: t('userForm.editTitle'),
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <UserForm
        mode="edit"
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
        currentUserRole={user?.role}
      />
    </>
  );
}
