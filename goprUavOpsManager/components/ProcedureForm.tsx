import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProcedureChecklistFormData, ChecklistItemFormData } from '@/types/ProcedureChecklist';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { ImageProcessingService } from '@/utils/imageProcessing';

interface ProcedureFormProps {
  mode: 'create' | 'edit';
  initialData?: ProcedureChecklistFormData;
  onSave: (data: ProcedureChecklistFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProcedureForm({ mode, initialData, onSave, onCancel, loading = false }: ProcedureFormProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  // Default form data
  const defaultFormData: ProcedureChecklistFormData = {
    title: '',
    description: '',
    items: [],
  };

  const [formData, setFormData] = useState<ProcedureChecklistFormData>(initialData || defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (mode === 'create') {
      setFormData(defaultFormData);
    }
  }, [initialData, mode]);

  const updateFormData = (field: keyof ProcedureChecklistFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItemFormData = (index: number, field: keyof ChecklistItemFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    const newItem: ChecklistItemFormData = {
      id: `new-${Date.now()}`,
      topic: '',
      content: '',
      number: formData.items.length + 1,
      link: '',
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
    crossPlatformAlert.showAlert({
      title: t('procedureForm.confirmDelete'),
      message: t('procedureForm.confirmDeleteMessage'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              items: prev.items.filter((_, i) => i !== index).map((item, i) => ({
                ...item,
                number: i + 1
              }))
            }));
          }
        }
      ]
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.items.length) return;

    setFormData(prev => {
      const newItems = [...prev.items];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      
      // Update numbers
      return {
        ...prev,
        items: newItems.map((item, i) => ({ ...item, number: i + 1 }))
      };
    });
  };

  const pickImage = async (itemId: string) => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        crossPlatformAlert.showAlert({ 
          title: t('procedureForm.permissionRequired'), 
          message: t('procedureForm.permissionDenied') 
        });
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const itemIndex = formData.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
          try {
            // Process the image for preview (lighter processing than upload)
            const processedImage = await ImageProcessingService.processImageForUpload(
              result.assets[0].uri,
              {
                maxWidth: 800, // Smaller for preview
                maxHeight: 600,
                quality: 0.7,
                format: 'jpeg'
              }
            );
            
            console.log(`[ProcedureForm] New image picked for item ${itemId}: ${processedImage.uri.substring(0, 50)}...`);
            
            // Store the new image URI for upload
            updateItemFormData(itemIndex, 'image', processedImage.uri);
            
          } catch (error) {
            console.error('Error processing image:', error);
            // Fallback to original image
            const originalUri = result.assets[0].uri;
            console.log(`[ProcedureForm] Fallback to original image for item ${itemId}: ${originalUri}`);
            
            updateItemFormData(itemIndex, 'image', originalUri);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      crossPlatformAlert.showAlert({ 
        title: t('procedureForm.error'), 
        message: t('procedureForm.failedToPickImage') 
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      crossPlatformAlert.showAlert({ 
        title: t('procedureForm.error'), 
        message: t('procedureForm.titleRequired') 
      });
      return false;
    }

    if (formData.items.length === 0) {
      crossPlatformAlert.showAlert({ 
        title: t('procedureForm.error'), 
        message: t('procedureForm.itemsRequired') 
      });
      return false;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.topic.trim()) {
        crossPlatformAlert.showAlert({ 
          title: t('procedureForm.error'), 
          message: t('procedureForm.itemTopicRequired', { number: i + 1 }) 
        });
        return false;
      }
      if (!item.content.trim()) {
        crossPlatformAlert.showAlert({ 
          title: t('procedureForm.error'), 
          message: t('procedureForm.itemContentRequired', { number: i + 1 }) 
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // Form data is already clean - no need for sanitization since we're not using caching
      console.log('[ProcedureForm] Saving form data', formData);
      await onSave(formData);
    } catch (error) {
      // Error handling is done by the parent component
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === 'create' ? t('procedureForm.create') : t('procedureForm.update')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('procedureForm.header')}</Text>
            
            <Text style={styles.label}>{t('procedureForm.title')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              placeholder={t('procedureForm.titlePlaceholder')}
            />

            <Text style={styles.label}>{t('procedureForm.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder={t('procedureForm.descriptionPlaceholder')}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('procedureForm.checklistItems')}</Text>
              <TouchableOpacity style={styles.addButton} onPress={addItem}>
                <Ionicons name="add-circle" size={24} color="#0066CC" />
                <Text style={styles.addButtonText}>{t('procedureForm.addItem')}</Text>
              </TouchableOpacity>
            </View>

            {formData.items.map((item, index) => (
              <View key={item.id} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>{index + 1}</Text>
                  <View style={styles.itemControls}>
                    {index > 0 && (
                      <TouchableOpacity onPress={() => moveItem(index, 'up')}>
                        <Ionicons name="arrow-up" size={20} color="#666" />
                      </TouchableOpacity>
                    )}
                    {index < formData.items.length - 1 && (
                      <TouchableOpacity onPress={() => moveItem(index, 'down')}>
                        <Ionicons name="arrow-down" size={20} color="#666" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="trash" size={20} color="#ff0000" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.label}>{t('procedureForm.topic')} *</Text>
                <TextInput
                  style={styles.input}
                  value={item.topic}
                  onChangeText={(value) => updateItemFormData(index, 'topic', value)}
                  placeholder={t('procedureForm.topicPlaceholder')}
                />

                <Text style={styles.label}>{t('procedureForm.content')} *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={item.content}
                  onChangeText={(value) => updateItemFormData(index, 'content', value)}
                  placeholder={t('procedureForm.contentPlaceholder')}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>{t('procedureForm.image')}</Text>
                {item.image ? (
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: item.image }} 
                      style={styles.previewImage} 
                    />
                    <TouchableOpacity
                      style={styles.changeImageButton}
                      onPress={() => pickImage(item.id)}
                    >
                      <Text style={styles.changeImageText}>{t('procedureForm.changeImage')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        updateItemFormData(index, 'image', undefined);
                      }}
                    >
                      <Text style={styles.removeImageText}>{t('procedureForm.removeImage')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={() => pickImage(item.id)}
                  >
                    <Ionicons name="image-outline" size={24} color="#0066CC" />
                    <Text style={styles.addImageText}>{t('procedureForm.addImage')}</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.label}>{t('procedureForm.link')}</Text>
                <TextInput
                  style={styles.input}
                  value={item.link || ''}
                  onChangeText={(value) => updateItemFormData(index, 'link', value)}
                  placeholder={t('procedureForm.linkPlaceholder')}
                />
              </View>
            ))}

            {formData.items.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>{t('procedureForm.noItemsYet')}</Text>
                <TouchableOpacity style={styles.addFirstButton} onPress={addItem}>
                  <Text style={styles.addFirstButtonText}>{t('procedureForm.clickAddItem')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'create' ? t('procedureForm.create') : t('procedureForm.update')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
  card: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#0066CC',
    fontWeight: '500',
  },
  itemContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  itemControls: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addFirstButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addFirstButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  imageContainer: {
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  changeImageButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  changeImageText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  removeImageButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeImageText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addImageText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
