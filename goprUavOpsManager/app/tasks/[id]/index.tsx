import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { Task, TaskStatus } from '@/types/Task';
import { Drone } from '@/types/Drone';
import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/taskService';
import { UserService } from '@/services/userService';
import { DroneService } from '@/services/droneService';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';

export default function TaskDetailsScreen() {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdByName, setCreatedByName] = useState<string>('');
  const [assignedToName, setAssignedToName] = useState<string>('');
  const [drone, setDrone] = useState<Drone | null>(null);
  const [procedure, setProcedure] = useState<ProcedureChecklist | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus>('not_started');
  const [statusUpdateText, setStatusUpdateText] = useState<string>('');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();

  const fetchTask = useCallback(async () => {
    if (!id || !user) return;

    try {
      const taskData = await TaskService.getTask(id, user.role);
      if (!taskData) {
        crossPlatformAlert.showAlert({ 
          title: t('common.error'), 
          message: t('tasks.errors.notFound'),
          buttons: [
            { text: t('common.ok'), onPress: () => router.back() }
          ]
        });
        return;
      }
      setTask(taskData);
      setNewStatus(taskData.status);
      setStatusUpdateText(taskData.statusUpdateText || '');
      
      // Fetch user names
      if (taskData.createdBy) {
        const createdName = await UserService.getUserDisplayName(taskData.createdBy);
        setCreatedByName(createdName);
      }
      if (taskData.assignedTo) {
        const assignedName = await UserService.getUserDisplayName(taskData.assignedTo);
        setAssignedToName(assignedName);
      }
      
      // Fetch drone data if attached
      if (taskData.droneId) {
        try {
          const droneData = await DroneService.getDrone(taskData.droneId, user.role);
          setDrone(droneData);
        } catch (error) {
          console.error('Error fetching drone:', error);
          // Don't fail the whole task load if drone fetch fails
        }
      }
      
      // Fetch procedure data if attached
      if (taskData.procedureId) {
        try {
          const procedureData = await ProcedureChecklistService.getProcedureChecklist(taskData.procedureId, user.role);
          setProcedure(procedureData);
        } catch (error) {
          console.error('Error fetching procedure:', error);
          // Don't fail the whole task load if procedure fetch fails
        }
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: t('tasks.errors.loadFailed'),
        buttons: [
          { text: t('common.ok'), onPress: () => router.back() }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [id, user, router, t]);

  useEffect(() => {
    // Check authentication first
    if (!user) {
      router.replace('/');
      return;
    }

    fetchTask();
  }, [user, fetchTask, router]);

  const handleEdit = () => {
    if (!task || isButtonDisabled()) return;
    router.push(`/tasks/${task.id}/edit`);
  };

  const handleDelete = async () => {
    if (!task || !user || isButtonDisabled()) return;

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
              crossPlatformAlert.showAlert({ 
                title: t('common.success'), 
                message: t('tasks.deleteSuccess'),
                buttons: [
                  { text: t('common.ok'), onPress: () => router.back() }
                ]
              });
            } catch (error) {
              console.error('Error deleting task:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('tasks.errors.deleteFailed') });
            }
          },
        },
      ]
    });
  };

  const handleSelfAssign = async () => {
    if (!task || !user || isButtonDisabled()) return;

    try {
      await TaskService.selfAssignTask(task.id, user.uid);
      crossPlatformAlert.showAlert({ 
        title: t('common.success'), 
        message: t('tasks.selfAssignSuccess')
      });
      await fetchTask(); // Refresh task data
    } catch (error) {
      console.error('Error self-assigning task:', error);
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: error instanceof Error ? error.message : t('tasks.errors.selfAssignFailed')
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!task || !user || isButtonDisabled()) return;

    setUpdatingStatus(true);
    try {
      await TaskService.updateTaskStatus(
        task.id,
        { status: newStatus, statusUpdateText },
        user.role,
        user.uid
      );
      crossPlatformAlert.showAlert({ 
        title: t('common.success'), 
        message: t('tasks.statusUpdateSuccess')
      });
      await fetchTask(); // Refresh task data
    } catch (error) {
      console.error('Error updating task status:', error);
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: error instanceof Error ? error.message : t('tasks.errors.statusUpdateFailed')
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const canUpdateStatus = useCallback(() => {
    if (!task || !user) return false;
    const isAdminOrManager = TaskService.canModifyTasks(user.role);
    const isAssignedUser = task.assignedTo === user.uid;
    return isAdminOrManager || isAssignedUser;
  }, [task, user]);

  const formatDate = (date?: Date): string => {
    if (!date) return t('common.notSet');
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('tasks.errors.notFound')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Task Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: TaskService.getStatusColor(task.status) }]}>
            <Text style={styles.statusBadgeText}>{TaskService.formatTaskStatus(task.status)}</Text>
          </View>
        </View>

        {/* Task Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tasks.description')}</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>

        {/* Task Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tasks.details')}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('tasks.createdBy')}:</Text>
            <Text style={styles.detailValue}>{createdByName || t('common.unknown')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('tasks.assignedTo')}:</Text>
            <Text style={styles.detailValue}>{assignedToName || t('tasks.unassigned')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('tasks.selfSignEnabled')}:</Text>
            <Text style={styles.detailValue}>{task.selfSign ? t('common.yes') : t('common.no')}</Text>
          </View>
          {task.droneId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('tasks.attachedToDrone')}:</Text>
              {drone ? (
                <Link href={`/drones/${task.droneId}`} asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>
                      {drone.name} ({drone.inventoryCode})
                    </Text>
                  </TouchableOpacity>
                </Link>
              ) : (
                <Text style={styles.detailValue}>{task.droneId}</Text>
              )}
            </View>
          ) : null}
          {task.procedureId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('tasks.attachedToProcedure')}:</Text>
              {procedure ? (
                <Link href={`/procedures/${task.procedureId}`} asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>{procedure.title}</Text>
                  </TouchableOpacity>
                </Link>
              ) : (
                <Text style={styles.detailValue}>{task.procedureId}</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tasks.timeline')}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('tasks.created')}:</Text>
            <Text style={styles.detailValue}>{formatDate(task.createdAt)}</Text>
          </View>
          {task.startedAt ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('tasks.started')}:</Text>
              <Text style={styles.detailValue}>{formatDate(task.startedAt)}</Text>
            </View>
          ) : null}
          {task.finishedAt ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('tasks.finished')}:</Text>
              <Text style={styles.detailValue}>{formatDate(task.finishedAt)}</Text>
            </View>
          ) : null}
        </View>

        {/* Status Update Section */}
        {canUpdateStatus() ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('tasks.updateStatus')}</Text>
            
            <Text style={styles.inputLabel}>{t('tasks.status')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newStatus}
                onValueChange={(value) => setNewStatus(value as TaskStatus)}
                style={styles.picker}
              >
                <Picker.Item label={t('tasks.statusNotStarted')} value="not_started" />
                <Picker.Item label={t('tasks.statusInProgress')} value="in_progress" />
                <Picker.Item label={t('tasks.statusDone')} value="done" />
                <Picker.Item label={t('tasks.statusNotFinished')} value="not_finished" />
              </Picker>
            </View>

            <Text style={styles.inputLabel}>{t('tasks.statusUpdateText')}</Text>
            <TextInput
              style={styles.textArea}
              value={statusUpdateText}
              onChangeText={setStatusUpdateText}
              placeholder={t('tasks.statusUpdatePlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, getDisabledStyle()]}
              onPress={handleUpdateStatus}
              disabled={isButtonDisabled() || updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('tasks.updateStatus')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Current Status Update Text */}
        {task.statusUpdateText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('tasks.currentStatusUpdate')}</Text>
            <Text style={styles.statusUpdateDisplay}>{task.statusUpdateText}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Self-assign button */}
          {!task.assignedTo && task.selfSign ? (
            <TouchableOpacity
              style={[styles.button, styles.successButton, getDisabledStyle()]}
              onPress={handleSelfAssign}
              disabled={isButtonDisabled()}
            >
              <Text style={styles.buttonText}>{t('tasks.selfAssign')}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Edit and Delete buttons for admins/managers */}
          {user && TaskService.canModifyTasks(user.role) && !task.isDeleted ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, getDisabledStyle()]}
                onPress={handleEdit}
                disabled={isButtonDisabled()}
              >
                <Text style={styles.buttonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton, getDisabledStyle()]}
                onPress={handleDelete}
                disabled={isButtonDisabled()}
              >
                <Text style={styles.buttonText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    width: 150,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  linkText: {
    fontSize: 14,
    color: '#0066CC',
    textDecorationLine: 'underline',
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  statusUpdateDisplay: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0066CC',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
});
