import React, { useEffect, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/taskService';
import { TaskTemplateFormData } from '@/types/Task';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function CreateTemplateScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TaskTemplateFormData>({
    title: '',
    description: '',
    selfSign: false,
  });

  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    if (!TaskService.canModifyTasks(user.role)) {
      crossPlatformAlert.showAlert({ 
        title: t('common.accessDenied'), 
        message: t('common.permissionDenied'),
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
      return;
    }
  }, [user, router, t]);

  const handleSave = async () => {
    if (!user) return;

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
      await TaskService.createTemplate(formData, user.role, user.uid);
      router.back();
      crossPlatformAlert.showAlert({ 
        title: t('common.success'), 
        message: t('tasks.createTemplateSuccess')
      });
    } catch (error) {
      console.error('Error creating template:', error);
      crossPlatformAlert.showAlert({ 
        title: t('common.error'), 
        message: t('tasks.errors.createTemplateFailed')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>{t('tasks.title')} *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder={t('tasks.titlePlaceholder')}
          />
        </View>

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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
