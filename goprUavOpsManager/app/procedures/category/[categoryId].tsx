import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { Category, DEFAULT_CATEGORY_ID } from '@/types/Category';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';
import { OfflineCategoryService } from '@/services/offlineCategoryService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';

export default function CategoryProceduresScreen() {
  const [procedures, setProcedures] = useState<ProcedureChecklist[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const responsive = useResponsiveLayout();

  // Filter procedures based on search query
  const filteredProcedures = useMemo(() => {
    if (!searchQuery.trim()) {
      return procedures;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return procedures.filter(procedure => 
      procedure.title.toLowerCase().includes(query) ||
      (procedure.description && procedure.description.toLowerCase().includes(query)) ||
      procedure.items.some(item => 
        item.topic.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      )
    );
  }, [procedures, searchQuery]);

  const fetchData = useCallback(async () => {
    if (!user || !categoryId) return;
    
    try {
      // Fetch category info from cache-first approach
      const categoriesData = await OfflineCategoryService.getCategories(user.role);
      const categoryData = categoriesData.find(cat => cat.id === categoryId);

      // Get all procedures and filter for this category
      const { procedures: allProcedures } = await OfflineProcedureChecklistService.getProcedureChecklists(user.role);
      const proceduresData = allProcedures.filter(proc => 
        proc.categories?.includes(categoryId) || 
        ((!proc.categories || proc.categories.length === 0) && categoryId === DEFAULT_CATEGORY_ID)
      );

      setCategory(categoryData || null);
      setProcedures(proceduresData);
    } catch (error) {
      console.error('Error fetching category procedures:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'), 
        message: t('procedures.errors.fetchFailed')
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, categoryId, t, crossPlatformAlert]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchData();
      }
    }, [fetchData, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateProcedure = () => {
    if (!isButtonDisabled()) {
      // Pass the category ID as a parameter to pre-select it in the form
      router.push(`/procedures/create?categoryId=${categoryId}`);
    }
  };

  const handleEditProcedure = (procedure: ProcedureChecklist) => {
    if (!isButtonDisabled()) {
      router.push(`/procedures/${procedure.id}/edit`);
    }
  };

  const handleViewDetails = (procedure: ProcedureChecklist) => {
    router.push(`/procedures/${procedure.id}`);
  };

  const handleDeleteProcedure = async (procedure: ProcedureChecklist) => {
    if (!user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('procedures.delete.title'),
      message: t('procedures.delete.confirmMessage', { title: procedure.title }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ProcedureChecklistService.softDeleteProcedureChecklist(procedure.id, user.role, user.uid);
              await fetchData(); // Refresh the list
              crossPlatformAlert.showAlert({ title: t('common.success'), message: t('procedures.delete.successMessage') });
            } catch (error) {
              console.error('Error deleting procedure/checklist:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('procedures.delete.errorMessage') });
            }
          },
        },
      ]
    });
  };

  const handleRestoreProcedure = async (procedure: ProcedureChecklist) => {
    if (!user || isButtonDisabled()) return;

    try {
      await ProcedureChecklistService.restoreProcedureChecklist(procedure.id, user.role, user.uid);
      await fetchData(); // Refresh the list
      crossPlatformAlert.showAlert({ title: t('common.success'), message: t('procedures.restore.successMessage') });
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('procedures.restore.errorMessage') });
    }
  };

  const canModifyProcedures = user?.role === 'manager' || user?.role === 'admin';

  const renderProcedureItem = ({ item }: { item: ProcedureChecklist }) => (
    <View style={styles.procedureItem}>
      <View style={styles.procedureHeader}>
        <View style={styles.procedureInfo}>
          <Text style={styles.procedureTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.procedureDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.procedureMeta}>
            {item.items.length} {item.items.length === 1 ? t('procedures.itemSingle') : t('procedures.itemPlural')}
            {item.createdAt && ` • ${t('procedures.createdOn', { date: item.createdAt.toLocaleDateString() })}`}
          </Text>
        </View>
        
        {/* Status badge for deleted items (admin only) */}
        {item.isDeleted && user?.role === 'admin' && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>{t('procedures.deleted')}</Text>
          </View>
        )}
      </View>

      <View style={styles.procedureActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleViewDetails(item)}
        >
          <Ionicons name="eye-outline" size={20} color="#0066CC" />
          <Text style={styles.actionButtonText}>{t('common.view')}</Text>
        </TouchableOpacity>

        {canModifyProcedures && !item.isDeleted && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, getDisabledStyle()]} 
              onPress={() => handleEditProcedure(item)}
              disabled={isButtonDisabled()}
            >
              <Ionicons name="create-outline" size={20} color={isButtonDisabled() ? "#999" : "#4CAF50"} />
              <Text style={[styles.actionButtonText, isButtonDisabled() && { color: '#999' }]}>{t('common.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, getDisabledStyle()]} 
              onPress={() => handleDeleteProcedure(item)}
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
            onPress={() => handleRestoreProcedure(item)}
            disabled={isButtonDisabled()}
          >
            <Ionicons name="refresh-outline" size={20} color={isButtonDisabled() ? "#999" : "#FF9800"} />
            <Text style={[styles.actionButtonText, isButtonDisabled() && { color: '#999' }]}>{t('procedures.restore.button')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('procedures.loading')}</Text>
      </View>
    );
  }

  if (!category) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>{t('categories.notFound.title')}</Text>
        <Text style={styles.errorDescription}>{t('categories.notFound.description')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
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
          <View style={styles.categoryInfo}>
            <View style={styles.categoryTitleRow}>
              {category.color && (
                <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
              )}
              <Text style={[
                styles.categoryTitle,
                { fontSize: responsive.fontSize.title }
              ]}>{category.name}</Text>
            </View>
            {category.description && (
              <Text style={[
                styles.categoryDescription,
                { fontSize: responsive.fontSize.body }
              ]}>{category.description}</Text>
            )}
            <Text style={styles.procedureCount}>
              {procedures.length} {procedures.length === 1 ? t('procedures.itemSingle') : t('procedures.itemPlural')}
            </Text>
          </View>
          
          {canModifyProcedures && (
            <TouchableOpacity 
              style={[
                styles.addButton, 
                getDisabledStyle(),
                responsive.isDesktop && {
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }
              ]} 
              onPress={handleCreateProcedure}
              disabled={isButtonDisabled()}
            >
              <Ionicons name="add" size={24} color={isButtonDisabled() ? "#999" : "#fff"} />
              <Text style={[
                styles.addButtonText, 
                isButtonDisabled() && { color: '#999' },
                { fontSize: responsive.fontSize.body }
              ]}>
                {t('procedures.addNew')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('procedures.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredProcedures.length === 0 ? (
        searchQuery.trim() ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('procedures.search.noResults')}</Text>
            <Text style={styles.emptyDescription}>
              {t('procedures.search.noResultsDescription', { query: searchQuery })}
            </Text>
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchButtonText}>{t('procedures.search.clearSearch')}</Text>
            </TouchableOpacity>
          </View>
        ) : procedures.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('procedures.empty.title')}</Text>
            <Text style={styles.emptyDescription}>
              {canModifyProcedures 
                ? t('procedures.empty.descriptionCanCreate')
                : t('procedures.empty.descriptionCannotCreate')
              }
            </Text>
          </View>
        ) : null
      ) : (
        <FlatList
          data={filteredProcedures}
          renderItem={renderProcedureItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 16,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryTitle: {
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryDescription: {
    color: '#666',
    marginBottom: 4,
  },
  procedureCount: {
    fontSize: 12,
    color: '#999',
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  clearSearchButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  clearSearchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  procedureItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
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
  procedureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  procedureInfo: {
    flex: 1,
  },
  procedureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  procedureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  procedureMeta: {
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
  procedureActions: {
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
