import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProcedureChecklist } from '../types/ProcedureChecklist';
import { useAuth } from '../contexts/AuthContext';
import { ProcedureChecklistService } from '../services/procedureChecklistService';

export default function ProceduresChecklistsListScreen() {
  const [checklists, setChecklists] = useState<ProcedureChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchChecklists = useCallback(async () => {
    if (!user) return;
    
    try {
      const checklistsList = await ProcedureChecklistService.getProcedureChecklists(user.role);
      setChecklists(checklistsList);
    } catch (error) {
      console.error('Error fetching procedures/checklists:', error);
      Alert.alert(
        'Error', 
        'Failed to fetch procedures/checklists. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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
    router.push('/procedures-checklist-form');
  };

  const handleEditChecklist = (checklist: ProcedureChecklist) => {
    router.push(`/procedures-checklist-form?id=${checklist.id}`);
  };

  const handleViewDetails = (checklist: ProcedureChecklist) => {
    router.push(`/procedures-checklist-details?id=${checklist.id}`);
  };

  const handleDeleteChecklist = async (checklist: ProcedureChecklist) => {
    if (!user) return;

    Alert.alert(
      'Delete Procedure/Checklist',
      `Are you sure you want to delete "${checklist.title}"? This action can be undone by an admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProcedureChecklistService.softDeleteProcedureChecklist(checklist.id, user.role, user.uid);
              await fetchChecklists(); // Refresh the list
              Alert.alert('Success', 'Procedure/checklist deleted successfully');
            } catch (error) {
              console.error('Error deleting procedure/checklist:', error);
              Alert.alert('Error', 'Failed to delete procedure/checklist');
            }
          },
        },
      ]
    );
  };

  const handleRestoreChecklist = async (checklist: ProcedureChecklist) => {
    if (!user) return;

    try {
      await ProcedureChecklistService.restoreProcedureChecklist(checklist.id, user.role, user.uid);
      await fetchChecklists(); // Refresh the list
      Alert.alert('Success', 'Procedure/checklist restored successfully');
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      Alert.alert('Error', 'Failed to restore procedure/checklist');
    }
  };

  const canModifyChecklists = user?.role === 'manager' || user?.role === 'admin';

  const renderChecklistItem = ({ item }: { item: ProcedureChecklist }) => (
    <View style={styles.checklistItem}>
      <View style={styles.checklistHeader}>
        <View style={styles.checklistInfo}>
          <Text style={styles.checklistTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.checklistDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.checklistMeta}>
            {item.items.length} item{item.items.length !== 1 ? 's' : ''}
            {item.createdAt && ` • Created ${item.createdAt.toLocaleDateString()}`}
          </Text>
        </View>
        
        {/* Status badge for deleted items (admin only) */}
        {item.isDeleted && user?.role === 'admin' && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>DELETED</Text>
          </View>
        )}
      </View>

      <View style={styles.checklistActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleViewDetails(item)}
        >
          <Ionicons name="eye-outline" size={20} color="#0066CC" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        {canModifyChecklists && !item.isDeleted && (
          <>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleEditChecklist(item)}
            >
              <Ionicons name="create-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleDeleteChecklist(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#F44336" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}

        {user?.role === 'admin' && item.isDeleted && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleRestoreChecklist(item)}
          >
            <Ionicons name="refresh-outline" size={20} color="#FF9800" />
            <Text style={styles.actionButtonText}>Restore</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading procedures & checklists...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Procedures & Checklists</Text>
        
        {canModifyChecklists && (
          <TouchableOpacity style={styles.addButton} onPress={handleCreateChecklist}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        )}
      </View>

      {checklists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Procedures or Checklists</Text>
          <Text style={styles.emptyDescription}>
            {canModifyChecklists 
              ? 'Create your first procedure or checklist to get started.'
              : 'No procedures or checklists have been created yet.'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={checklists}
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