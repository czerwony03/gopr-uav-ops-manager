import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { DroneService } from '@/services/droneService';
import DroneForm, { DroneFormData } from '@/components/DroneForm';
import {UserRole} from "@/types/UserRole";

export default function CreateDroneScreen() {
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

    // Check permissions
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
      Alert.alert(t('common.accessDenied'), t('common.permissionDenied'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }
  }, [user, router, t]);

  const handleSave = async (formData: DroneFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      await DroneService.createDrone(formData, user.role, user.uid);
      router.back();
      Alert.alert(t('droneForm.success'), t('droneForm.droneCreated'));
    } catch (error) {
      console.error('Error creating drone:', error);
      Alert.alert(t('droneForm.error'), t('droneForm.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <DroneForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}
