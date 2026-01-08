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
import { TaskTemplate } from '@/types/Task';
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/taskService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';

export default function TemplatesListScreen() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      const templatesList = await TaskService.getTemplates(user.role);
      setTemplates(templatesList);
    } catch (error) {
      console.error('Error fetching templates:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'), 
        message: t('tasks.errors.fetchTemplatesFailed')
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchTemplates();
  }, [user, router, fetchTemplates]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTemplates();
      }
    }, [fetchTemplates, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const handleCreateTemplate = () => {
    if (!isButtonDisabled()) {
      router.push('/tasks/templates/create');
    }
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    if (!isButtonDisabled()) {
      router.push(`/tasks/templates/${template.id}/edit`);
    }
  };

  const handleDeleteTemplate = async (template: TaskTemplate) => {
    if (!user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('tasks.deleteTemplateTitle'),
      message: t('tasks.deleteTemplateConfirmation', { title: template.title }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskService.deleteTemplate(template.id, user.role, user.uid);
              await fetchTemplates();
              crossPlatformAlert.showAlert({ title: t('common.success'), message: t('tasks.deleteTemplateSuccess') });
            } catch (error) {
              console.error('Error deleting template:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('tasks.errors.deleteTemplateFailed') });
            }
          },
        },
      ]
    });
  };

  const renderTemplateItem = ({ item }: { item: TaskTemplate }) => (
    <View style={[styles.templateCard, item.isDeleted && styles.deletedCard]}>
      <Text style={styles.templateTitle}>{item.title}</Text>
      <Text style={styles.templateDescription} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.templateDetail}>
        {t('tasks.selfSignEnabled')}: {item.selfSign ? t('common.yes') : t('common.no')}
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.editButton, getDisabledStyle()]} 
          onPress={() => handleEditTemplate(item)}
          disabled={isButtonDisabled()}
        >
          <Text style={[styles.editButtonText, isButtonDisabled() && { color: '#999' }]}>
            {t('common.edit')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.deleteButton, getDisabledStyle()]} 
          onPress={() => handleDeleteTemplate(item)}
          disabled={isButtonDisabled()}
        >
          <Text style={[styles.deleteButtonText, isButtonDisabled() && { color: '#999' }]}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>
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
      <FlatList
        data={templates}
        renderItem={renderTemplateItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('tasks.noTemplates')}</Text>
          </View>
        }
      />

      {user && TaskService.canModifyTasks(user.role) && (
        <TouchableOpacity
          style={[styles.fab, getDisabledStyle()]}
          onPress={handleCreateTemplate}
          disabled={isButtonDisabled()}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
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
  listContent: {
    padding: 16,
  },
  templateCard: {
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
  templateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  templateDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  editButtonText: {
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
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
