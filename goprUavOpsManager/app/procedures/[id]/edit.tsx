import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import ProcedureForm from '@/components/ProcedureForm';
import { ProcedureChecklistFormData } from '@/types/ProcedureChecklist';

export default function EditProcedureScreen() {
  const [loading, setLoading] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  const [initialData, setInitialData] = useState<ProcedureChecklistFormData | undefined>();

  const fetchProcedure = useCallback(async (procedureId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const procedure = await ProcedureChecklistService.getProcedureChecklist(procedureId, user.role);
      if (procedure) {
        // Convert the procedure data to form data
        const formData: ProcedureChecklistFormData = {
          title: procedure.title,
          description: procedure.description || '',
          items: procedure.items.map(item => ({
            id: item.id,
            topic: item.topic,
            content: item.content,
            number: item.number,
            image: item.image,
            link: item.link,
            file: item.file,
          })),
        };
        setInitialData(formData);
      } else {
        Alert.alert(t('common.error'), t('procedureForm.notFound'));
        router.back();
      }
    } catch (error) {
      console.error('Error fetching procedure:', error);
      Alert.alert(t('common.error'), t('procedureForm.loadError'));
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

    // Check permissions - only managers and admins can edit procedures
    if (user.role !== 'manager' && user.role !== 'admin') {
      Alert.alert(t('common.accessDenied'), t('common.permissionDenied'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    if (id && typeof id === 'string') {
      fetchProcedure(id);
    } else {
      router.back();
    }
  }, [user, router, t, fetchProcedure, id]);

  const handleSave = async (formData: ProcedureChecklistFormData) => {
    if (!user || !id || typeof id !== 'string') return;

    setLoading(true);
    try {
      await ProcedureChecklistService.updateProcedureChecklist(id, formData, user.role, user.uid);
      router.back();
      Alert.alert(t('procedureForm.success'), t('procedureForm.procedureUpdated'));
    } catch (error) {
      console.error('Error updating procedure:', error);
      Alert.alert(t('procedureForm.error'), t('procedureForm.failedToUpdate'));
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
        title: t('procedures.editProcedure'),
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <ProcedureForm
        mode="edit"
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
      />
    </>
  );
}