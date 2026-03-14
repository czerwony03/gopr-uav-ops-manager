import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ChecklistSubItemFormData, ChecklistItemType } from '@/types/ProcedureChecklist';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

interface SubItemFormProps {
  subItem: ChecklistSubItemFormData;
  depth?: number;
  onUpdate: (updated: ChecklistSubItemFormData) => void;
  onRemove: () => void;
}

export default function SubItemForm({
  subItem,
  depth = 0,
  onUpdate,
  onRemove,
}: SubItemFormProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const update = (field: keyof ChecklistSubItemFormData, value: any) => {
    onUpdate({ ...subItem, [field]: value });
  };

  const setType = (type: ChecklistItemType) => {
    update('type', type);
  };

  const addChildSubItem = () => {
    const newChild: ChecklistSubItemFormData = {
      id: `sub-${Date.now()}`,
      topic: '',
      type: 'simple',
    };
    update('subItems', [...(subItem.subItems || []), newChild]);
  };

  const updateChild = (index: number, updated: ChecklistSubItemFormData) => {
    const newChildren = [...(subItem.subItems || [])];
    newChildren[index] = updated;
    update('subItems', newChildren);
  };

  const removeChild = (index: number) => {
    crossPlatformAlert.showAlert({
      title: t('procedureForm.subItems.confirmDelete'),
      message: t('procedureForm.subItems.confirmDeleteMessage'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const newChildren = (subItem.subItems || []).filter((_, i) => i !== index);
            update('subItems', newChildren);
          },
        },
      ],
    });
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        crossPlatformAlert.showAlert({
          title: t('procedureForm.permissionRequired'),
          message: t('procedureForm.permissionDenied'),
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        update('image', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image for sub-item:', error);
      crossPlatformAlert.showAlert({
        title: t('procedureForm.error'),
        message: t('procedureForm.failedToPickImage'),
      });
    }
  };

  const indentStyle = depth > 0 ? { marginLeft: depth * 12 } : undefined;
  const isControl = subItem.type === 'control';

  return (
    <View style={[styles.container, indentStyle]}>
      {/* Sub-item header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.collapseButton}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={16}
            color="#555"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {subItem.topic || t('procedureForm.subItems.newSubItem')}
        </Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="close-circle" size={20} color="#cc0000" />
        </TouchableOpacity>
      </View>

      {!isCollapsed && (
        <View style={styles.body}>
          {/* Type selector */}
          <Text style={styles.label}>{t('procedureForm.subItems.type')}</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, !isControl && styles.typeButtonActive]}
              onPress={() => setType('simple')}
            >
              <Text style={[styles.typeButtonText, !isControl && styles.typeButtonTextActive]}>
                {t('procedureForm.subItems.typeSimple')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, isControl && styles.typeButtonActive]}
              onPress={() => setType('control')}
            >
              <Text style={[styles.typeButtonText, isControl && styles.typeButtonTextActive]}>
                {t('procedureForm.subItems.typeControl')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Topic */}
          <Text style={styles.label}>{t('procedureForm.topic')} *</Text>
          <TextInput
            style={styles.input}
            value={subItem.topic}
            onChangeText={(v) => update('topic', v)}
            placeholder={t('procedureForm.topicPlaceholder')}
          />

          {/* Simple: content */}
          {!isControl && (
            <>
              <Text style={styles.label}>{t('procedureForm.content')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={subItem.content || ''}
                onChangeText={(v) => update('content', v)}
                placeholder={t('procedureForm.contentPlaceholder')}
                multiline
                numberOfLines={3}
              />
            </>
          )}

          {/* Control: control + requiredState */}
          {isControl && (
            <>
              <Text style={styles.label}>{t('procedureForm.subItems.control')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={subItem.control || ''}
                onChangeText={(v) => update('control', v)}
                placeholder={t('procedureForm.subItems.controlPlaceholder')}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.label}>{t('procedureForm.subItems.requiredState')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={subItem.requiredState || ''}
                onChangeText={(v) => update('requiredState', v)}
                placeholder={t('procedureForm.subItems.requiredStatePlaceholder')}
                multiline
                numberOfLines={3}
              />
            </>
          )}

          {/* Image */}
          <Text style={styles.label}>{t('procedureForm.image')}</Text>
          {subItem.image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: subItem.image }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                <Text style={styles.changeImageText}>{t('procedureForm.changeImage')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeImageButton} onPress={() => update('image', undefined)}>
                <Text style={styles.removeImageText}>{t('procedureForm.removeImage')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color="#0066CC" />
              <Text style={styles.addImageText}>{t('procedureForm.addImage')}</Text>
            </TouchableOpacity>
          )}

          {/* Link */}
          <Text style={styles.label}>{t('procedureForm.link')}</Text>
          <TextInput
            style={styles.input}
            value={subItem.link || ''}
            onChangeText={(v) => update('link', v)}
            placeholder={t('procedureForm.linkPlaceholder')}
          />

          {/* Add nested sub-item */}
          <TouchableOpacity style={styles.addSubItemButton} onPress={addChildSubItem}>
            <Ionicons name="add-circle-outline" size={16} color="#0066CC" />
            <Text style={styles.addSubItemText}>{t('procedureForm.subItems.addNested')}</Text>
          </TouchableOpacity>

          {/* Nested sub-items */}
          {subItem.subItems && subItem.subItems.length > 0 && (
            <View style={styles.childrenContainer}>
              {subItem.subItems.map((child, idx) => (
                <SubItemForm
                  key={child.id}
                  subItem={child}
                  depth={depth + 1}
                  onUpdate={(updated) => updateChild(idx, updated)}
                  onRemove={() => removeChild(idx)}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 2,
    borderLeftColor: '#b0c4de',
    backgroundColor: '#f4f8ff',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#dce8f8',
  },
  collapseButton: {
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3a5c',
  },
  removeButton: {
    padding: 2,
  },
  body: {
    padding: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c8d8e8',
    borderRadius: 5,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#aac',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  imageContainer: {
    marginBottom: 4,
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 6,
    marginBottom: 6,
  },
  changeImageButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    borderRadius: 5,
    marginBottom: 6,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  removeImageButton: {
    backgroundColor: '#F44336',
    paddingVertical: 6,
    borderRadius: 5,
    marginBottom: 4,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b0c4de',
    borderStyle: 'dashed',
    borderRadius: 5,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 4,
    gap: 6,
  },
  addImageText: {
    color: '#0066CC',
    fontSize: 13,
    fontWeight: '600',
  },
  addSubItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    gap: 4,
  },
  addSubItemText: {
    color: '#0066CC',
    fontSize: 13,
    fontWeight: '500',
  },
  childrenContainer: {
    marginTop: 6,
  },
});
