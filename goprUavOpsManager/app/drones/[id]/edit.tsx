import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { DroneService } from '@/services/droneService';
import DroneForm, { DroneFormData } from '@/components/DroneForm';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function EditDroneScreen() {
  const [loading, setLoading] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  const [initialData, setInitialData] = useState<DroneFormData | undefined>();

  const fetchDrone = useCallback(async (droneId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const drone = await DroneService.getDrone(droneId, user.role);
      if (drone) {
        // Convert the drone data to form data (exclude the fields not in form)
        const { id, createdAt, updatedAt, deletedAt, isDeleted, createdBy, updatedBy, ...formData } = drone;
        setInitialData(formData as DroneFormData);
      } else {
        crossPlatformAlert.showAlert({ title: t('common.error'), message: t('droneForm.notFound') });
        router.back();
      }
    } catch (error) {
      console.error('Error fetching drone:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('droneForm.loadError') });
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

    // Check permissions
    if (user.role !== 'manager' && user.role !== 'admin') {
      crossPlatformAlert.showAlert({ 
        title: t('common.accessDenied'), 
        message: t('common.permissionDenied'),
        buttons: [
          { text: 'OK', onPress: () => router.back() }
        ]
      });
      return;
    }

    if (id && typeof id === 'string') {
      fetchDrone(id);
    } else {
      router.back();
    }
  }, [user, router, t, fetchDrone, id]);

  const handleSave = async (formData: DroneFormData) => {
    if (!user || !id || typeof id !== 'string') return;

    setLoading(true);
    try {
      await DroneService.updateDrone(id, formData, user.role, user.uid);
      router.back();
      crossPlatformAlert.showAlert({ title: t('droneForm.success'), message: t('droneForm.droneUpdated') });
    } catch (error) {
      console.error('Error updating drone:', error);
      crossPlatformAlert.showAlert({ title: t('droneForm.error'), message: t('droneForm.failedToUpdate') });
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
        title: t('drones.editDrone'),
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <DroneForm
        mode="edit"
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
      />
    </>
  );
}