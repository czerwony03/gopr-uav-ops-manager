import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProcedureChecklistFormData, ChecklistItemFormData } from '@/types/ProcedureChecklist';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';

export default function CreateProcedureScreen() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  // Default form data
  const defaultFormData = useMemo((): ProcedureChecklistFormData => ({
    title: '',
    description: '',
    items: [],
  }), []);

  const [formData, setFormData] = useState<ProcedureChecklistFormData>(defaultFormData);

  // Authentication and permission check
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    // Only managers and admins can create procedures
    if (user.role !== 'manager' && user.role !== 'admin') {
      Alert.alert(t('procedureForm.permissionRequired'), t('procedureForm.permissionDenied'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }
  }, [user, router, t]);

  const handleSubmit = async () => {
    if (!user) return;

    // Basic validation
    if (!formData.title.trim()) {
      Alert.alert(t('procedureForm.validationError'), t('procedureForm.titleRequired'));
      return;
    }

    if (formData.items.length === 0) {
      Alert.alert(t('procedureForm.validationError'), t('procedureForm.atLeastOneItem'));
      return;
    }

    // Validate items
    for (const item of formData.items) {
      if (!item.topic.trim()) {
        Alert.alert(t('procedureForm.validationError'), t('procedureForm.allItemsMustHaveTopic'));
        return;
      }
      if (!item.content.trim()) {
        Alert.alert(t('procedureForm.validationError'), t('procedureForm.allItemsMustHaveContent'));
        return;
      }
    }

    setLoading(true);
    try {
      // Create new procedure and navigate to its details page
      const newId = await ProcedureChecklistService.createProcedureChecklist(formData, user.role, user.uid);
      router.push(`/procedures/${newId}`);
    } catch (error) {
      console.error('Error creating checklist:', error);
      Alert.alert(t('procedureForm.error'), t('procedureForm.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const addNewItem = () => {
    const newItem: ChecklistItemFormData = {
      id: Date.now().toString(),
      topic: '',
      content: '',
      number: formData.items.length + 1,
      link: '',
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  const updateItem = (itemId: string, field: keyof ChecklistItemFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const pickImage = async (itemId: string) => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('procedureForm.permissionRequired'), t('procedureForm.permissionDenied'));
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateItem(itemId, 'image', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('procedureForm.error'), t('procedureForm.failedToPickImage'));
    }
  };

  const renderItem = (item: ChecklistItemFormData, _index: number) => (
    <View key={item.id} style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{t('procedureForm.item')} {item.number}</Text>
        <TouchableOpacity
          style={styles.removeItemButton}
          onPress={() => removeItem(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('procedureForm.topic')} *</Text>
        <TextInput
          style={styles.input}
          value={item.topic}
          onChangeText={(text) => updateItem(item.id, 'topic', text)}
          placeholder={t('procedureForm.topicPlaceholder')}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('procedureForm.content')} *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={item.content}
          onChangeText={(text) => updateItem(item.id, 'content', text)}
          placeholder={t('procedureForm.contentPlaceholder')}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('procedureForm.image')}</Text>
        {item.image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => pickImage(item.id)}
            >
              <Text style={styles.changeImageText}>{t('procedureForm.changeImage')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => updateItem(item.id, 'image', undefined)}
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
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('procedureForm.link')}</Text>
        <TextInput
          style={styles.input}
          value={item.link || ''}
          onChangeText={(text) => updateItem(item.id, 'link', text)}
          placeholder={t('procedureForm.linkPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>{t('procedureForm.createTitle')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('procedureForm.title')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder={t('procedureForm.titlePlaceholder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('procedureForm.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder={t('procedureForm.descriptionPlaceholder')}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsTitle}>{t('procedureForm.checklistItems')}</Text>
                <TouchableOpacity style={styles.addItemButton} onPress={addNewItem}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addItemText}>{t('procedureForm.addItem')}</Text>
                </TouchableOpacity>
              </View>

              {formData.items.map((item, index) => renderItem(item, index))}

              {formData.items.length === 0 && (
                <View style={styles.emptyItemsContainer}>
                  <Text style={styles.emptyItemsText}>{t('procedureForm.noItemsYet')}</Text>
                  <Text style={styles.emptyItemsSubtext}>
                    {t('procedureForm.clickAddItem')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>{t('procedureForm.create')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  itemsSection: {
    marginTop: 24,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addItemText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  removeItemButton: {
    padding: 4,
  },
  imageContainer: {
    marginTop: 8,
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
  },
  addImageText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyItemsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptyItemsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});