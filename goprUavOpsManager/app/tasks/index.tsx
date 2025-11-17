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
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Task, TaskFilter } from '@/types/Task';
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/taskService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';

export default function TasksListScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('unassigned');
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const { isConnected } = useNetworkStatus();
  const responsive = useResponsiveLayout();

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      let tasksList: Task[] = [];
      
      switch (activeFilter) {
        case 'unassigned':
          tasksList = await TaskService.getUnassignedTasks(user.role);
          break;
        case 'my_open':
          tasksList = await TaskService.getUserTasks(user.uid, user.role, false);
          break;
        case 'my_finished':
          tasksList = await TaskService.getUserTasks(user.uid, user.role, true);
          break;
        default:
          tasksList = await TaskService.getTasks(user.role);
      }
      
      setTasks(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'), 
        message: t('tasks.errors.fetchFailed')
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeFilter, t]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Refresh tasks when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTasks();
      }
    }, [fetchTasks, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleCreateTask = () => {
    if (!isButtonDisabled()) {
      router.push('/tasks/create');
    }
  };

  const handleManageTemplates = () => {
    if (!isButtonDisabled()) {
      router.push('/tasks/templates');
    }
  };

  const handleSelfAssign = async (task: Task) => {
    if (!user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('tasks.selfAssignTitle'),
      message: t('tasks.selfAssignConfirmation', { title: task.title }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tasks.selfAssign'),
          onPress: async () => {
            try {
              await TaskService.selfAssignTask(task.id, user.uid);
              await fetchTasks(); // Refresh the list
              crossPlatformAlert.showAlert({ title: t('common.success'), message: t('tasks.selfAssignSuccess') });
            } catch (error) {
              console.error('Error self-assigning task:', error);
              crossPlatformAlert.showAlert({ 
                title: t('common.error'), 
                message: error instanceof Error ? error.message : t('tasks.errors.selfAssignFailed')
              });
            }
          },
        },
      ]
    });
  };

  const handleDeleteTask = async (task: Task) => {
    if (!user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('tasks.deleteTitle'),
      message: t('tasks.deleteConfirmation', { title: task.title }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskService.deleteTask(task.id, user.role, user.uid);
              await fetchTasks(); // Refresh the list
              crossPlatformAlert.showAlert({ title: t('common.success'), message: t('tasks.deleteSuccess') });
            } catch (error) {
              console.error('Error deleting task:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('tasks.errors.deleteFailed') });
            }
          },
        },
      ]
    });
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, item.isDeleted && styles.deletedCard]}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: TaskService.getStatusColor(item.status) }]}>
          <Text style={styles.statusBadgeText}>{TaskService.formatTaskStatus(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.taskDescription} numberOfLines={2}>{item.description}</Text>
      
      {item.droneId && (
        <Text style={styles.taskDetail}>{t('tasks.attachedToDrone')}: {item.droneId}</Text>
      )}
      {item.procedureId && (
        <Text style={styles.taskDetail}>{t('tasks.attachedToProcedure')}: {item.procedureId}</Text>
      )}
      
      <Text style={styles.taskDetail}>
        {t('tasks.created')}: {formatDate(item.createdAt)}
      </Text>
      
      {item.startedAt && (
        <Text style={styles.taskDetail}>
          {t('tasks.started')}: {formatDate(item.startedAt)}
        </Text>
      )}
      
      {item.finishedAt && (
        <Text style={styles.taskDetail}>
          {t('tasks.finished')}: {formatDate(item.finishedAt)}
        </Text>
      )}

      {item.statusUpdateText && (
        <Text style={styles.statusUpdateText}>
          {t('tasks.statusUpdate')}: {item.statusUpdateText}
        </Text>
      )}

      <View style={styles.actionButtons}>
        <Link href={`/tasks/${item.id}`} asChild>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>{t('tasks.viewDetails')}</Text>
          </TouchableOpacity>
        </Link>

        {/* Self-assign button for unassigned tasks with selfSign enabled */}
        {!item.assignedTo && item.selfSign && (
          <TouchableOpacity 
            style={[styles.assignButton, getDisabledStyle()]} 
            onPress={() => handleSelfAssign(item)}
            disabled={isButtonDisabled()}
          >
            <Text style={[styles.assignButtonText, isButtonDisabled() && { color: '#999' }]}>
              {t('tasks.selfAssign')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete button for admins/managers */}
        {user && TaskService.canModifyTasks(user.role) && !item.isDeleted && (
          <TouchableOpacity 
            style={[styles.deleteButton, getDisabledStyle()]} 
            onPress={() => handleDeleteTask(item)}
            disabled={isButtonDisabled()}
          >
            <Text style={[styles.deleteButtonText, isButtonDisabled() && { color: '#999' }]}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineInfoBar visible={!isConnected} />
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'unassigned' && styles.activeFilterTab]}
          onPress={() => setActiveFilter('unassigned')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'unassigned' && styles.activeFilterTabText]}>
            {t('tasks.unassigned')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'my_open' && styles.activeFilterTab]}
          onPress={() => setActiveFilter('my_open')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'my_open' && styles.activeFilterTabText]}>
            {t('tasks.myOpen')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'my_finished' && styles.activeFilterTab]}
          onPress={() => setActiveFilter('my_finished')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'my_finished' && styles.activeFilterTabText]}>
            {t('tasks.myFinished')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('tasks.noTasks')}</Text>
          </View>
        }
      />

      {/* Action Buttons */}
      {user && TaskService.canModifyTasks(user.role) && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, getDisabledStyle()]}
            onPress={handleManageTemplates}
            disabled={isButtonDisabled()}
          >
            <Text style={styles.fabText}>{t('tasks.templates')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, styles.fabPrimary, getDisabledStyle()]}
            onPress={handleCreateTask}
            disabled={isButtonDisabled()}
          >
            <Text style={styles.fabTextPrimary}>{t('tasks.createTask')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: '#0066CC',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterTabText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deletedCard: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  taskDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statusUpdateText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  assignButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 12,
  },
  fab: {
    backgroundColor: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPrimary: {
    backgroundColor: '#0066CC',
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fabTextPrimary: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
