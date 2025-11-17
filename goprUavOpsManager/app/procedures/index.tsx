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
import { Category, DEFAULT_CATEGORY_ID } from '@/types/Category';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryService } from '@/services/categoryService';
import { OfflineCategoryService } from '@/services/offlineCategoryService';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';
import {useSync} from "@/contexts/SyncContext";

interface CategoryWithCount extends Category {
  procedureCount: number;
}

export default function CategoriesListScreen() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const responsive = useResponsiveLayout();
  const { setSyncing } = useSync();

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    try {
      // Check if cache should be updated based on timestamps before fetching
      try {
        console.log('[AuthContext] Starting background data sync');
        setSyncing(true);

        await Promise.all([
          OfflineCategoryService.preDownloadCategories(user.role),
          OfflineProcedureChecklistService.preDownloadProcedures(user.role),
        ]);

        console.log('[AuthContext] ✅ Background data sync completed');
      } catch (error) {
        console.error('[AuthContext] Error during background data sync:', error);
        // Don't block login process if background sync fails
      } finally {
        setSyncing(false);
      }

      // Fetch categories using cache-first approach for instant loading
      const categoriesData = await OfflineCategoryService.getCategories(user.role);
      
      // Count procedures for each category using cache-first approach
      const categoriesWithCount: CategoryWithCount[] = await Promise.all(
        categoriesData.map(async (category) => {
          try {
            const { procedures } = await OfflineProcedureChecklistService.getProcedureChecklists(
              user.role, 
              { forceOffline: false } // Cache-first for display
            );
            // Filter procedures for this category
            const categoryProcedures = procedures.filter(proc => 
              proc.categories?.includes(category.id) || 
              ((!proc.categories || proc.categories.length === 0) && category.id === DEFAULT_CATEGORY_ID)
            );
            
            return {
              ...category,
              procedureCount: categoryProcedures.length,
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
  }, [user, t, crossPlatformAlert]);

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

  const handleViewAllProcedures = () => {
    router.push('/procedures/procedures');
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
    <TouchableOpacity 
      style={[
        styles.categoryCard,
        item.isDeleted && user?.role === 'admin' && styles.deletedCategoryCard,
        { borderColor: item.color }
      ]}
      onPress={() => handleViewCategory(item)}
    >
      {/* Color indicator */}
      {item.color && (
        <View style={[styles.categoryColorBar, { backgroundColor: item.color }]} />
      )}
      
      {/* Category content */}
      <View style={styles.categoryCardContent}>
        <View style={styles.categoryCardHeader}>
          <Text style={styles.categoryCardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          
          {/* Status badge for deleted items (admin only) */}
          {item.isDeleted && user?.role === 'admin' && (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>{t('categories.deleted')}</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.categoryCardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <Text style={styles.categoryCardCount}>
          {item.procedureCount} {item.procedureCount === 1 ? t('procedures.itemSingle') : t('procedures.itemPlural')}
        </Text>

        {/* Quick actions for managers/admins */}
        {canModifyCategories && (
          <View style={styles.categoryCardActions}>
            {!item.isDeleted ? (
              <>
                <TouchableOpacity 
                  style={[styles.quickActionButton, getDisabledStyle()]} 
                  onPress={() => handleEditCategory(item)}
                  disabled={isButtonDisabled()}
                >
                  <Ionicons name="create-outline" size={16} color={isButtonDisabled() ? "#999" : "#4CAF50"} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.quickActionButton, getDisabledStyle()]} 
                  onPress={() => handleDeleteCategory(item)}
                  disabled={isButtonDisabled()}
                >
                  <Ionicons name="trash-outline" size={16} color={isButtonDisabled() ? "#999" : "#F44336"} />
                </TouchableOpacity>
              </>
            ) : user?.role === 'admin' && (
              <TouchableOpacity 
                style={[styles.quickActionButton, getDisabledStyle()]} 
                onPress={() => handleRestoreCategory(item)}
                disabled={isButtonDisabled()}
              >
                <Ionicons name="refresh-outline" size={16} color={isButtonDisabled() ? "#999" : "#FF9800"} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
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
      
      {/* Content wrapper for max-width on desktop */}
      <View style={[
        styles.contentWrapper,
        responsive.isDesktop && {
          maxWidth: responsive.maxContentWidth,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: responsive.spacing.large,
        }
      ]}>
        <View style={styles.header}>
          <Text style={[
            styles.title,
            { fontSize: responsive.fontSize.title }
          ]}>{t('procedures.categories.titleHeader')}</Text>
          
          {canModifyCategories && (
            <TouchableOpacity 
              style={[
                styles.addButton, 
                getDisabledStyle(),
                responsive.isDesktop && {
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }
              ]} 
              onPress={handleCreateCategory}
              disabled={isButtonDisabled()}
            >
              <Ionicons name="add" size={24} color={isButtonDisabled() ? "#999" : "#fff"} />
              <Text style={[
                styles.addButtonText, 
                isButtonDisabled() && { color: '#999' },
                { fontSize: responsive.fontSize.body }
              ]}>
                {t('categories.addNew')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color="#ccc" />
            <Text style={[
              styles.emptyTitle,
              { fontSize: responsive.fontSize.subtitle }
            ]}>{t('categories.empty.title')}</Text>
            <Text style={[
              styles.emptyDescription,
              { fontSize: responsive.fontSize.body }
            ]}>
              {canModifyCategories 
                ? t('categories.empty.descriptionCanCreate')
                : t('categories.empty.descriptionCannotCreate')
              }
            </Text>
          </View>
        ) : (
          <>
            {/* Full-width "All Procedures" button at the top */}
            <TouchableOpacity 
              style={styles.allProceduresButton}
              onPress={handleViewAllProcedures}
            >
              <Ionicons name="list-outline" size={24} color="#fff" />
              <View style={styles.allProceduresTextContainer}>
                <Text style={styles.allProceduresTitle}>
                  {t('procedures.viewAll')}
                </Text>
                <Text style={styles.allProceduresSubtitle}>
                  {t('procedures.allProcedures')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>

            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentWrapper: {
    flex: 1,
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
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flex: 0.48,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 2,
  },
  deletedCategoryCard: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  allProceduresButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  allProceduresTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  allProceduresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  allProceduresSubtitle: {
    fontSize: 12,
    color: '#e3f2fd',
  },
  categoryColorBar: {
    height: 4,
    width: '100%',
  },
  categoryCardContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  categoryCardDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  categoryCardCount: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  deletedBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  deletedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  categoryCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  quickActionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    minWidth: 28,
    alignItems: 'center',
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
