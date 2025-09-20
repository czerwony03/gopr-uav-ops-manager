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
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { useOfflineButtons } from '@/utils/useOfflineButtons';

export default function ProceduresListScreen() {
  const [checklists, setChecklists] = useState<ProcedureChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  // Filter checklists based on search query
  const filteredChecklists = useMemo(() => {
    if (!searchQuery.trim()) {
      return checklists;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return checklists.filter(checklist => 
      checklist.title.toLowerCase().includes(query) ||
      (checklist.description && checklist.description.toLowerCase().includes(query)) ||
      checklist.items.some(item => 
        item.topic.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      )
    );
  }, [checklists, searchQuery]);

  const fetchChecklists = useCallback(async () => {
    if (!user) return;
    
    try {
      // Try to get procedures from offline service first
      const { procedures, isFromCache: fromCache } = await OfflineProcedureChecklistService.getProcedureChecklists(user.role);
      setChecklists(procedures);
      setIsFromCache(fromCache);
      
      // If we got cached data and we're online, try to get fresh data in background
      if (fromCache && isConnected) {
        try {
          const freshProcedures = await ProcedureChecklistService.getProcedureChecklists(user.role);
          setChecklists(freshProcedures);
          setIsFromCache(false);
          
          // Always refresh cache with fresh data when online
          console.log('[ProceduresList] Refreshing cache with fresh data');
          OfflineProcedureChecklistService.forceRefreshProcedures(user.role, freshProcedures).catch(error => {
            console.error('Error updating cache with fresh data:', error);
          });
        } catch (error) {
          console.log('Failed to fetch fresh data, keeping cached data:', error);
          // Keep using cached data if fresh fetch fails
        }
      }
    } catch (error) {
      console.error('Error fetching procedures/checklists:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'), 
        message: t('procedures.errors.fetchFailed')
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isConnected, t, crossPlatformAlert]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  // Refresh checklists when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchChecklists();
      }
    }, [fetchChecklists, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChecklists();
  };

  const handleCreateChecklist = () => {
    if (!isButtonDisabled()) {
      router.push('/procedures/create');
    }
  };

  const handleEditChecklist = (checklist: ProcedureChecklist) => {
    if (!isButtonDisabled()) {
      router.push(`/procedures/${checklist.id}/edit`);
    }
  };

  const handleViewDetails = (checklist: ProcedureChecklist) => {
    router.push(`/procedures/${checklist.id}`);
  };

  const handleDeleteChecklist = async (checklist: ProcedureChecklist) => {
    if (!user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('procedures.delete.title'),
      message: t('procedures.delete.confirmMessage', { title: checklist.title }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ProcedureChecklistService.softDeleteProcedureChecklist(checklist.id, user.role, user.uid);
              await fetchChecklists(); // Refresh the list
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

  const handleRestoreChecklist = async (checklist: ProcedureChecklist) => {
    if (!user || isButtonDisabled()) return;

    try {
      await ProcedureChecklistService.restoreProcedureChecklist(checklist.id, user.role, user.uid);
      await fetchChecklists(); // Refresh the list
      crossPlatformAlert.showAlert({ title: t('common.success'), message: t('procedures.restore.successMessage') });
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('procedures.restore.errorMessage') });
    }
  };

  const canModifyChecklists = user?.role === 'manager' || user?.role === 'admin';

  const renderChecklistItem = ({ item }: { item: ProcedureChecklist }) => (
    <View style={styles.checklistItem}>
      <View style={styles.checklistHeader}>
        <View style={styles.checklistInfo}>
          <Text style={styles.checklistTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.checklistDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.checklistMeta}>
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

      <View style={styles.checklistActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleViewDetails(item)}
        >
          <Ionicons name="eye-outline" size={20} color="#0066CC" />
          <Text style={styles.actionButtonText}>{t('common.view')}</Text>
        </TouchableOpacity>

        {canModifyChecklists && !item.isDeleted && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, getDisabledStyle()]} 
              onPress={() => handleEditChecklist(item)}
              disabled={isButtonDisabled()}
            >
              <Ionicons name="create-outline" size={20} color={isButtonDisabled() ? "#999" : "#4CAF50"} />
              <Text style={[styles.actionButtonText, isButtonDisabled() && { color: '#999' }]}>{t('common.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, getDisabledStyle()]} 
              onPress={() => handleDeleteChecklist(item)}
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
            onPress={() => handleRestoreChecklist(item)}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline info bar */}
      <OfflineInfoBar 
        visible={!isConnected || isFromCache} 
        message={!isConnected ? t('offline.noConnection') : t('offline.viewingCachedData')}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>{t('procedures.title')}</Text>
        
        {canModifyChecklists && (
          <TouchableOpacity 
            style={[styles.addButton, getDisabledStyle()]} 
            onPress={handleCreateChecklist}
            disabled={isButtonDisabled()}
          >
            <Ionicons name="add" size={24} color={isButtonDisabled() ? "#999" : "#fff"} />
            <Text style={[styles.addButtonText, isButtonDisabled() && { color: '#999' }]}>
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

      {filteredChecklists.length === 0 ? (
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
        ) : checklists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('procedures.empty.title')}</Text>
            <Text style={styles.emptyDescription}>
              {canModifyChecklists 
                ? t('procedures.empty.descriptionCanCreate')
                : t('procedures.empty.descriptionCannotCreate')
              }
            </Text>
          </View>
        ) : null
      ) : (
        <FlatList
          data={filteredChecklists}
          renderItem={renderChecklistItem}
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
  checklistItem: {
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
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checklistInfo: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  checklistDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  checklistMeta: {
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
  checklistActions: {
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
