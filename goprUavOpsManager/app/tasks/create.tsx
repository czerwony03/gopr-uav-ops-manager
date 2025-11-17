import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/taskService';
import { TaskFormData, TaskTemplate } from '@/types/Task';
import { User } from '@/types/User';
import { Drone } from '@/types/Drone';
import { ProcedureChecklist } from '@/types/ProcedureChecklist';
import { UserService } from '@/services/userService';
import { DroneService } from '@/services/droneService';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function CreateTaskScreen() {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    selfSign: false,
    assignedTo: undefined,
    droneId: undefined,
    procedureId: undefined,
  });
  
  // Data for dropdowns
  const [users, setUsers] = useState<User[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [procedures, setProcedures] = useState<ProcedureChecklist[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  useEffect(() => {
    // Check authentication first
    if (!user) {
      router.replace('/');
      return;
    }

    // Check permissions
    if (!TaskService.canModifyTasks(user.role)) {
      crossPlatformAlert.showAlert({ 
        title: t('common.accessDenied'), 
        message: t('common.permissionDenied'),
        buttons: [
          { text: 'OK', onPress: () => router.back() }
        ]
      });
      return;
    }

    // Load dropdown data
    const loadData = async () => {
      try {
        const [usersData, dronesData, proceduresData, templatesData] = await Promise.all([
          UserService.getUsers(user.role),
          DroneService.getDrones(user.role),
          ProcedureChecklistService.getProcedureChecklists(user.role),
          TaskService.getTemplates(user.role),
        ]);
        setUsers(usersData);
        setDrones(dronesData.filter(d => !d.isDeleted));
        setProcedures(proceduresData.filter(p => !p.isDeleted));
        setTemplates(templatesData.filter(t => !t.isDeleted));
      } catch (error) {
        console.error('Error loading data:', error);
        crossPlatformAlert.showAlert({ 
          title: t('common.error'), 
          message: t('tasks.errors.loadDataFailed')
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user, router, t]);

  const handleTemplateChange = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: template.title,
          description: template.description,
          selfSign: template.selfSign || false,
        }));
      }
    }
  }, [templates]);

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!formData.title.trim()) {
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: t('tasks.errors.titleRequired')
      });
      return;
    }

    if (!formData.description.trim()) {
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: t('tasks.errors.descriptionRequired')
      });
      return;
    }

    setLoading(true);
    try {
      await TaskService.createTask(formData, user.role, user.uid);
      router.back();
      crossPlatformAlert.showAlert({ 
        title: t('common.success'), 
        message: t('tasks.createSuccess')
      });
    } catch (error) {
      console.error('Error creating task:', error);
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: t('tasks.errors.createFailed')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Template Selection */}
        {templates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>{t('tasks.useTemplate')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedTemplate}
                onValueChange={handleTemplateChange}
                style={styles.picker}
              >
                <Picker.Item label={t('tasks.selectTemplate')} value="" />
                {templates.map(template => (
                  <Picker.Item key={template.id} label={template.title} value={template.id} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('tasks.title')} *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder={t('tasks.titlePlaceholder')}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('tasks.description')} *</Text>
          <TextInput
            style={styles.textArea}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder={t('tasks.descriptionPlaceholder')}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Self-Sign */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('tasks.selfSignEnabled')}</Text>
            <Switch
              value={formData.selfSign}
              onValueChange={(value) => setFormData(prev => ({ ...prev, selfSign: value }))}
            />
          </View>
          <Text style={styles.helpText}>{t('tasks.selfSignHelp')}</Text>
        </View>

        {/* Assign To */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('tasks.assignTo')}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.assignedTo || ''}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                assignedTo: value || undefined 
              }))}
              style={styles.picker}
            >
              <Picker.Item label={t('tasks.unassigned')} value="" />
              {users.map(u => (
                <Picker.Item 
                  key={u.uid} 
                  label={`${u.firstname || ''} ${u.surname || ''} (${u.email})`} 
                  value={u.uid} 
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Attach to Drone */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('tasks.attachToDrone')}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.droneId || ''}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                droneId: value || undefined 
              }))}
              style={styles.picker}
            >
              <Picker.Item label={t('tasks.noDrone')} value="" />
              {drones.map(d => (
                <Picker.Item key={d.id} label={`${d.name} (${d.registrationNumber})`} value={d.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Attach to Procedure */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('tasks.attachToProcedure')}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.procedureId || ''}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                procedureId: value || undefined 
              }))}
              style={styles.picker}
            >
              <Picker.Item label={t('tasks.noProcedure')} value="" />
              {procedures.map(p => (
                <Picker.Item key={p.id} label={p.title} value={p.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#0066CC',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
