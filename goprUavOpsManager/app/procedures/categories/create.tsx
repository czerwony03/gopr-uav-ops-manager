import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryService } from '@/services/categoryService';
import { CategoryFormData } from '@/types/Category';
import CategoryForm from '@/components/CategoryForm';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useTranslation } from 'react-i18next';

export default function CreateCategoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  const handleSave = async (formData: CategoryFormData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await CategoryService.createCategory(formData, user.role, user.uid);
      
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('categories.create.successMessage'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => router.back()
          }
        ]
      });
    } catch (error) {
      console.error('Error creating category:', error);
      throw error; // Re-throw so CategoryForm can handle it
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <CategoryForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}