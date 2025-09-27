import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CommentVisibility } from '@/types/DroneComment';
import MultiImagePicker from './MultiImagePicker';

interface DroneCommentFormProps {
  onSubmit: (content: string, images: string[], visibility: CommentVisibility) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DroneCommentForm: React.FC<DroneCommentFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const { t } = useTranslation('common');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<CommentVisibility>('public');

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert(t('common.error'), t('comments.messages.enterComment'));
      return;
    }

    try {
      await onSubmit(content.trim(), images, visibility);
      // Reset form
      setContent('');
      setImages([]);
      setVisibility('public');
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert(t('common.error'), t('comments.messages.addCommentError'));
    }
  };

  const handleImagePicked = (newImages: string[]) => {
    setImages(newImages);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('comments.addCommentForm.title')}</Text>
      
      {/* Comment text input */}
      <TextInput
        style={styles.textInput}
        value={content}
        onChangeText={setContent}
        placeholder={t('comments.addCommentForm.contentPlaceholder')}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={1000}
      />
      
      <Text style={styles.characterCount}>{t('comments.addCommentForm.characterCount', { current: content.length, max: 1000 })}</Text>

      {/* Image picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('comments.addCommentForm.attachImages')}</Text>
        <MultiImagePicker
          images={images}
          onImagesChange={handleImagePicked}
          maxImages={5}
        />
      </View>

      {/* Visibility selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('comments.addCommentForm.visibilityTitle')}</Text>
        <View style={styles.visibilityOptions}>
          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'public' && styles.selectedOption
            ]}
            onPress={() => setVisibility('public')}
          >
            <Ionicons 
              name={visibility === 'public' ? 'radio-button-on' : 'radio-button-off'} 
              size={20} 
              color={visibility === 'public' ? '#4CAF50' : '#666'} 
            />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{t('comments.addCommentForm.visibilityPublic')}</Text>
              <Text style={styles.optionDescription}>{t('comments.addCommentForm.visibilityPublicDesc')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'hidden' && styles.selectedOption
            ]}
            onPress={() => setVisibility('hidden')}
          >
            <Ionicons 
              name={visibility === 'hidden' ? 'radio-button-on' : 'radio-button-off'} 
              size={20} 
              color={visibility === 'hidden' ? '#4CAF50' : '#666'} 
            />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{t('comments.addCommentForm.visibilityHidden')}</Text>
              <Text style={styles.optionDescription}>{t('comments.addCommentForm.visibilityHiddenDesc')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>{t('comments.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>{t('comments.addCommentForm.submittingButton')}</Text>
          ) : (
            <Text style={styles.submitButtonText}>{t('comments.addCommentForm.submitButton')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#fafafa',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  visibilityOptions: {
    gap: 12,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  optionContent: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
