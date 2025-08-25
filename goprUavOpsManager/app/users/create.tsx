import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import UserForm from '@/components/UserForm';
import { UserFormData } from '@/types/User';

export default function CreateUserScreen() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    // Check authentication first - redirect to login if not authenticated
    if (!user) {
      router.replace('/');
      return;
    }

    // Check permissions - only admins can create users
    if (user.role !== 'admin') {
      Alert.alert(t('common.accessDenied'), t('common.permissionDenied'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }
  }, [user, router, t]);

  const handleSave = async (_formData: UserFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      //await UserService.createUser(formData, user.uid, user.email);
      router.back();
      Alert.alert(t('userForm.success'), t('userForm.userCreated'));
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert(t('userForm.error'), t('userForm.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <UserForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}
