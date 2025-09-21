import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryService } from '@/services/categoryService';
import { Category, CategoryFormData } from '@/types/Category';
import CategoryForm from '@/components/CategoryForm';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useTranslation } from 'react-i18next';

export default function EditCategoryScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      if (!user || !categoryId) return;
      
      try {
        const categoryData = await CategoryService.getCategory(categoryId, user.role);
        
        if (!categoryData) {
          crossPlatformAlert.showAlert({
            title: t('common.error'),
            message: t('categories.notFound.description'),
            buttons: [
              {
                text: t('common.ok'),
                onPress: () => router.back()
              }
            ]
          });
          return;
        }
        
        setCategory(categoryData);
      } catch (error) {
        console.error('Error fetching category:', error);
        crossPlatformAlert.showAlert({
          title: t('common.error'),
          message: t('categories.errors.fetchFailed'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => router.back()
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [user, categoryId, router, crossPlatformAlert, t]);

  const handleSave = async (formData: CategoryFormData) => {
    if (!user || !categoryId) {
      throw new Error('User not authenticated or category ID missing');
    }

    try {
      await CategoryService.updateCategory(categoryId, formData, user.role, user.uid);
      
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('categories.edit.successMessage'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => router.back()
          }
        ]
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error; // Re-throw so CategoryForm can handle it
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!category) {
    return null; // Error handling is done in useEffect
  }

  const initialData: CategoryFormData = {
    name: category.name,
    description: category.description || '',
    color: category.color,
    order: category.order,
  };

  return (
    <CategoryForm
      mode="edit"
      initialData={initialData}
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});