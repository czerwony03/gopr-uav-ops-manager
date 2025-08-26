import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import UserForm from '@/components/UserForm';
import { UserFormData } from '@/types/User';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function CreateUserScreen() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  useEffect(() => {
    // Check authentication first - redirect to login if not authenticated
    if (!user) {
      router.replace('/');
      return;
    }

    // Check permissions - only admins can create users
    if (user.role !== 'admin') {
      crossPlatformAlert.showAlert({ 
        title: t('common.accessDenied'), 
        message: t('common.permissionDenied'),
        buttons: [
          { text: 'OK', onPress: () => router.back() }
        ]
      });
      return;
    }
  }, [user, router, t, crossPlatformAlert]);

  const handleSave = async (_formData: UserFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      //await UserService.createUser(formData, user.uid, user.email);
      router.back();
      crossPlatformAlert.showAlert({ title: t('userForm.success'), message: t('userForm.userCreated') });
    } catch (error) {
      console.error('Error creating user:', error);
      crossPlatformAlert.showAlert({ title: t('userForm.error'), message: t('userForm.failedToCreate') });
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
      currentUserRole={user?.role}
    />
  );
}
