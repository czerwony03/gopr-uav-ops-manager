import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '@/types/Category';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryService } from '@/services/categoryService';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { MigrationService } from '@/services/migrationService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { useOfflineButtons } from '@/utils/useOfflineButtons';

interface CategoryWithCount extends Category {
  procedureCount: number;
}

export default function CategoriesListScreen() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationRan, setMigrationRan] = useState(false);
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  // Run migrations once when the component mounts
  const runMigrationsOnce = useCallback(async () => {
    if (!user || migrationRan) return;
    
    try {
      const needsMigration = await MigrationService.needsMigration();
      if (needsMigration) {
        console.log('[Categories] Running migrations...');
        await MigrationService.runMigrations();
        console.log('[Categories] Migrations completed successfully');
      }
      setMigrationRan(true);
    } catch (error) {
      console.error('[Categories] Migration failed:', error);
      // Don't fail the app, just log the error
      setMigrationRan(true);
    }
  }, [user, migrationRan]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    try {
      // Ensure migrations are run first
      await runMigrationsOnce();
      
      // Fetch categories
      const categoriesData = await CategoryService.getCategories(user.role);
      
      // Count procedures for each category
      const categoriesWithCount: CategoryWithCount[] = await Promise.all(
        categoriesData.map(async (category) => {
          try {
            const procedures = await ProcedureChecklistService.getProcedureChecklistsByCategory(category.id, user.role);
            return {
              ...category,
              procedureCount: procedures.length,
            };
          } catch (error) {
            console.error(`Error counting procedures for category ${category.id}:`, error);
            return {
              ...category,
              procedureCount: 0,
            };
          }
        })
      );

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'), 
        message: t('categories.errors.fetchFailed')
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, t, crossPlatformAlert, runMigrationsOnce]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Refresh categories when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchCategories();
      }
    }, [fetchCategories, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleViewCategory = (category: Category) => {
    router.push(`/procedures/category/${category.id}`);
  };

  const handleCreateCategory = () => {
    if (!isButtonDisabled()) {
      router.push('/procedures/categories/create');
    }
  };

  const handleEditCategory = (category: Category) => {
    if (!isButtonDisabled()) {
      router.push(`/procedures/categories/${category.id}/edit`);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('categories.delete.title'),
      message: t('categories.delete.confirmMessage', { name: category.name }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await CategoryService.softDeleteCategory(category.id, user.role, user.uid);
              await fetchCategories(); // Refresh the list
              crossPlatformAlert.showAlert({ title: t('common.success'), message: t('categories.delete.successMessage') });
            } catch (error) {
              console.error('Error deleting category:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('categories.delete.errorMessage') });
            }
          },
        },
      ]
    });
  };

  const handleRestoreCategory = async (category: Category) => {
    if (!user || isButtonDisabled()) return;

    try {
      await CategoryService.restoreCategory(category.id, user.role, user.uid);
      await fetchCategories(); // Refresh the list
      crossPlatformAlert.showAlert({ title: t('common.success'), message: t('categories.restore.successMessage') });
    } catch (error) {
      console.error('Error restoring category:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('categories.restore.errorMessage') });
    }
  };

  const canModifyCategories = user?.role === 'manager' || user?.role === 'admin';

  const renderCategoryItem = ({ item }: { item: CategoryWithCount }) => (
    <View style={styles.categoryItem}>
      <TouchableOpacity 
        style={styles.categoryContent}
        onPress={() => handleViewCategory(item)}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={styles.categoryTitleRow}>
              {item.color && (
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
              )}
              <Text style={styles.categoryTitle}>{item.name}</Text>
            </View>
            {item.description ? (
              <Text style={styles.categoryDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.categoryMeta}>
              {item.procedureCount} {item.procedureCount === 1 ? t('procedures.itemSingle') : t('procedures.itemPlural')}
            </Text>
          </View>
          
          {/* Status badge for deleted items (admin only) */}
          {item.isDeleted && user?.role === 'admin' && (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>{t('categories.deleted')}</Text>
            </View>
          )}
        </View>

        <View style={styles.categoryActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleViewCategory(item)}
          >
            <Ionicons name="eye-outline" size={20} color="#0066CC" />
            <Text style={styles.actionButtonText}>{t('common.view')}</Text>
          </TouchableOpacity>

          {canModifyCategories && !item.isDeleted && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, getDisabledStyle()]} 
                onPress={() => handleEditCategory(item)}
                disabled={isButtonDisabled()}
              >
                <Ionicons name="create-outline" size={20} color={isButtonDisabled() ? "#999" : "#4CAF50"} />
                <Text style={[styles.actionButtonText, isButtonDisabled() && { color: '#999' }]}>{t('common.edit')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, getDisabledStyle()]} 
                onPress={() => handleDeleteCategory(item)}
                disabled={isButtonDisabled()}
              >
                <Ionicons name="trash-outline" size={20} color={isButtonDisabled() ? "#999" : "#F44336"} />
                <Text style={[styles.actionButtonText, isButtonDisabled() && { color: '#999' }]}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </>
          )}

          {user?.role === 'admin' && item.isDeleted && (
            <TouchableOpacity 
              style={[styles.actionButton, getDisabledStyle()]} 
              onPress={() => handleRestoreCategory(item)}
              disabled={isButtonDisabled()}
            >
              <Ionicons name="refresh-outline" size={20} color={isButtonDisabled() ? "#999" : "#FF9800"} />
              <Text style={[styles.actionButtonText, isButtonDisabled() && { color: '#999' }]}>{t('categories.restore.button')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('categories.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline info bar */}
      <OfflineInfoBar 
        visible={!isConnected} 
        message={t('offline.noConnection')}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>{t('procedures.categories.title')}</Text>
        
        {canModifyCategories && (
          <TouchableOpacity 
            style={[styles.addButton, getDisabledStyle()]} 
            onPress={handleCreateCategory}
            disabled={isButtonDisabled()}
          >
            <Ionicons name="add" size={24} color={isButtonDisabled() ? "#999" : "#fff"} />
            <Text style={[styles.addButtonText, isButtonDisabled() && { color: '#999' }]}>
              {t('categories.addNew')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>{t('categories.empty.title')}</Text>
          <Text style={styles.emptyDescription}>
            {canModifyCategories 
              ? t('categories.empty.descriptionCanCreate')
              : t('categories.empty.descriptionCannotCreate')
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  categoryItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryContent: {
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#999',
  },
  deletedBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deletedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
