import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentVisibility } from '@/types/DroneComment';
import { MultiImagePicker } from './MultiImagePicker';

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
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<CommentVisibility>('public');

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter a comment');
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
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    }
  };

  const handleImagePicked = (newImages: string[]) => {
    setImages(newImages);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Comment</Text>
      
      {/* Comment text input */}
      <TextInput
        style={styles.textInput}
        value={content}
        onChangeText={setContent}
        placeholder="Enter your comment..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={1000}
      />
      
      <Text style={styles.characterCount}>{content.length}/1000</Text>

      {/* Image picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attach Images (Optional)</Text>
        <MultiImagePicker
          images={images}
          onImagesChange={handleImagePicked}
          maxImages={5}
          style={styles.imagePicker}
        />
      </View>

      {/* Visibility selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visibility</Text>
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
              <Text style={styles.optionTitle}>Public</Text>
              <Text style={styles.optionDescription}>Visible to all users</Text>
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
              <Text style={styles.optionTitle}>Hidden</Text>
              <Text style={styles.optionDescription}>Only visible to managers and admins</Text>
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
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Submitting...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Add Comment</Text>
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
  imagePicker: {
    // Styles will be handled by MultiImagePicker component
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