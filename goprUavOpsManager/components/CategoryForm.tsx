import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { CategoryFormData } from '@/types/Category';
import { useCrossPlatformAlert } from './CrossPlatformAlert';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';

// Available colors for categories
const AVAILABLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#6C5CE7', '#A29BFE', '#FD79A8', '#E17055', '#81ECEC',
  '#74B9FF', '#0984E3', '#6C5CE7', '#00B894', '#00CEC9',
  '#6B7280', '#9CA3AF', '#6366F1', '#8B5CF6', '#EF4444'
];

export interface CategoryFormProps {
  mode: 'create' | 'edit';
  initialData?: CategoryFormData;
  onSave: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function CategoryForm({ mode, initialData, onSave, onCancel, loading = false }: CategoryFormProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const responsive = useResponsiveLayout();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: AVAILABLE_COLORS[0],
    order: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  const updateFormData = (field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('categories.form.errors.nameRequired');
    }

    if (formData.order < 0) {
      newErrors.order = t('categories.form.errors.orderInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
    } catch (error) {
      console.error('Error saving category:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('categories.form.errors.saveFailed')
      });
    } finally {
      setSaving(false);
    }
  };

  const renderColorPicker = () => (
    <View style={styles.section}>
      <Text style={styles.label}>{t('categories.form.color')}</Text>
      <View style={styles.colorGrid}>
        {AVAILABLE_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.color === color && styles.colorOptionSelected
            ]}
            onPress={() => updateFormData('color', color)}
          >
            {formData.color === color && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.contentContainer,
        responsive.isDesktop && {
          paddingHorizontal: responsive.spacing.large,
          alignItems: 'center',
        }
      ]}
    >
      <View style={[
        styles.form,
        responsive.isDesktop && {
          maxWidth: responsive.maxContentWidth,
          width: '100%',
        }
      ]}>
        {/* Name Field */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('categories.form.name')} *
          </Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(text) => updateFormData('name', text)}
            placeholder={t('categories.form.namePlaceholder')}
            maxLength={50}
            editable={!loading && !saving}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Description Field */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('categories.form.description')}</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            value={formData.description}
            onChangeText={(text) => updateFormData('description', text)}
            placeholder={t('categories.form.descriptionPlaceholder')}
            multiline
            numberOfLines={3}
            maxLength={200}
            editable={!loading && !saving}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Color Picker */}
        {renderColorPicker()}

        {/* Order Field */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('categories.form.order')}</Text>
          <TextInput
            style={[styles.input, errors.order && styles.inputError]}
            value={formData.order.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              updateFormData('order', num);
            }}
            placeholder={t('categories.form.orderPlaceholder')}
            keyboardType="numeric"
            editable={!loading && !saving}
          />
          {errors.order && <Text style={styles.errorText}>{errors.order}</Text>}
          <Text style={styles.helpText}>{t('categories.form.orderHelp')}</Text>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('categories.form.preview')}</Text>
          <View style={styles.previewContainer}>
            <View style={styles.categoryPreview}>
              <View style={styles.categoryTitleRow}>
                {formData.color && (
                  <View style={[styles.colorIndicator, { backgroundColor: formData.color }]} />
                )}
                <Text style={styles.previewTitle}>
                  {formData.name || t('categories.form.namePlaceholder')}
                </Text>
              </View>
              {formData.description && (
                <Text style={styles.previewDescription}>{formData.description}</Text>
              )}
              <Text style={styles.previewMeta}>
                {t('categories.form.previewMeta')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={loading || saving}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (loading || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {mode === 'create' ? t('common.create') : t('common.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
  },
  previewContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  categoryPreview: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewMeta: {
    fontSize: 12,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});