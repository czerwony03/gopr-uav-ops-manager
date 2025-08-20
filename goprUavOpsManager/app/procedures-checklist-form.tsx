import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProcedureChecklistFormData, ChecklistItemFormData } from '../types/ProcedureChecklist';
import { useAuth } from '../contexts/AuthContext';
import { ProcedureChecklistService } from '../services/procedureChecklistService';

export default function ProcedureChecklistFormScreen() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const isEditing = !!id;
  const { t } = useTranslation('common');

  // Default form data
  const defaultFormData = useMemo((): ProcedureChecklistFormData => ({
    title: '',
    description: '',
    items: [],
  }), []);

  const [formData, setFormData] = useState<ProcedureChecklistFormData>(defaultFormData);

  const loadChecklistData = useCallback(async () => {
    if (!user || !id) return;

    setInitialLoading(true);
    try {
      const checklist = await ProcedureChecklistService.getProcedureChecklist(id, user.role);
      if (checklist) {
        setFormData({
          title: checklist.title,
          description: checklist.description || '',
          items: checklist.items.map(item => ({
            id: item.id,
            topic: item.topic,
            image: item.image,
            content: item.content,
            number: item.number,
            link: item.link || '',
            file: item.file,
          })),
        });
      }
    } catch (error) {
      console.error('Error loading checklist data:', error);
      Alert.alert('Error', 'Failed to load checklist data');
    } finally {
      setInitialLoading(false);
    }
  }, [user, id]);

  // Authentication and permission check
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    // Only managers and admins can create/edit procedures
    if (user.role !== 'manager' && user.role !== 'admin') {
      Alert.alert('Access Denied', 'Only managers and administrators can create or edit procedures/checklists.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Load existing checklist data for editing
    if (isEditing && id) {
      loadChecklistData();
    } else if (!isEditing) {
      // Reset form to default values when creating new
      setFormData(defaultFormData);
    }
  }, [id, user, isEditing, router, loadChecklistData, defaultFormData]);

  const handleSubmit = async () => {
    if (!user) return;

    // Basic validation
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }

    if (formData.items.length === 0) {
      Alert.alert('Validation Error', 'At least one checklist item is required');
      return;
    }

    // Validate items
    for (const item of formData.items) {
      if (!item.topic.trim()) {
        Alert.alert('Validation Error', 'All items must have a topic');
        return;
      }
      if (!item.content.trim()) {
        Alert.alert('Validation Error', 'All items must have content');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing && id) {
        await ProcedureChecklistService.updateProcedureChecklist(id, formData, user.role, user.uid);
        // Navigate back to details page for editing
        router.push(`/procedures-checklist-details?id=${id}`);
      } else {
        // Create new procedure and navigate to its details page
        const newId = await ProcedureChecklistService.createProcedureChecklist(formData, user.role, user.uid);
        router.push(`/procedures-checklist-details?id=${newId}`);
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} procedure/checklist`);
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
        Alert.alert('Permission Required', 'Please grant permission to access photos');
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
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const renderItem = (item: ChecklistItemFormData, index: number) => (
    <View key={item.id} style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>Item {item.number}</Text>
        <TouchableOpacity
          style={styles.removeItemButton}
          onPress={() => removeItem(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Topic *</Text>
        <TextInput
          style={styles.input}
          value={item.topic}
          onChangeText={(text) => updateItem(item.id, 'topic', text)}
          placeholder="Enter topic/title for this item"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Content *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={item.content}
          onChangeText={(text) => updateItem(item.id, 'content', text)}
          placeholder="Enter detailed content/instructions"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Image</Text>
        {item.image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => pickImage(item.id)}
            >
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => updateItem(item.id, 'image', undefined)}
            >
              <Text style={styles.removeImageText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={() => pickImage(item.id)}
          >
            <Ionicons name="image-outline" size={24} color="#0066CC" />
            <Text style={styles.addImageText}>Add Image</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Link</Text>
        <TextInput
          style={styles.input}
          value={item.link || ''}
          onChangeText={(text) => updateItem(item.id, 'link', text)}
          placeholder="Enter external link (optional)"
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>
    </View>
  );

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading checklist data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>
              {isEditing ? 'Edit Procedure/Checklist' : 'Create New Procedure/Checklist'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter procedure/checklist title"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Enter description (optional)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsTitle}>Checklist Items</Text>
                <TouchableOpacity style={styles.addItemButton} onPress={addNewItem}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {formData.items.map((item, index) => renderItem(item, index))}

              {formData.items.length === 0 && (
                <View style={styles.emptyItemsContainer}>
                  <Text style={styles.emptyItemsText}>No items added yet</Text>
                  <Text style={styles.emptyItemsSubtext}>
                    Click &quot;Add Item&quot; to create your first checklist item
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
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update' : 'Create'}
                </Text>
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