import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import ProcedureForm from '@/components/ProcedureForm';
import { ProcedureChecklistFormData } from '@/types/ProcedureChecklist';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function CreateProcedureScreen() {
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

    // Check permissions - only managers and admins can create procedures
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
  }, [user, router, t]);

  const handleSave = async (formData: ProcedureChecklistFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      await ProcedureChecklistService.createProcedureChecklist(formData, user.role, user.uid);
      router.back();
      crossPlatformAlert.showAlert({ title: t('procedureForm.success'), message: t('procedureForm.procedureCreated') });
    } catch (error) {
      console.error('Error creating procedure:', error);
      crossPlatformAlert.showAlert({ title: t('procedureForm.error'), message: t('procedureForm.failedToCreate') });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProcedureForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}
