import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DroneComment } from '@/types/DroneComment';
import { UserRole } from '@/types/UserRole';

interface DroneCommentItemProps {
  comment: DroneComment;
  userRole: UserRole;
  currentUserId: string;
  onDeleteComment: (commentId: string) => void;
  onImagePress: (images: string[], index: number) => void;
}

export const DroneCommentItem: React.FC<DroneCommentItemProps> = ({
  comment,
  userRole,
  currentUserId,
  onDeleteComment,
  onImagePress
}) => {
  const canDelete = (userRole === 'admin' || userRole === 'manager') && !comment.isDeleted;
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDeleteComment(comment.id)
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const getVisibilityIcon = () => {
    if (comment.visibility === 'hidden') {
      return <Ionicons name="eye-off" size={14} color="#666" style={styles.visibilityIcon} />;
    }
    return <Ionicons name="eye" size={14} color="#666" style={styles.visibilityIcon} />;
  };

  return (
    <View style={[
      styles.commentContainer,
      comment.isDeleted && styles.deletedComment,
      comment.visibility === 'hidden' && styles.hiddenComment
    ]}>
      {/* Comment header */}
      <View style={styles.commentHeader}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>
            {comment.userName || comment.userEmail || 'Unknown User'}
          </Text>
          <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
          {getVisibilityIcon()}
          {comment.visibility === 'hidden' && (
            <Text style={styles.visibilityLabel}>Hidden</Text>
          )}
        </View>
        {canDelete && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color="#d32f2f" />
          </TouchableOpacity>
        )}
      </View>

      {/* Comment content */}
      <Text style={[
        styles.commentContent,
        comment.isDeleted && styles.deletedContent
      ]}>
        {comment.isDeleted ? 'This comment has been removed.' : comment.content}
      </Text>

      {/* Comment images */}
      {!comment.isDeleted && comment.images && comment.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {comment.images.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onImagePress(comment.images!, index)}
              style={styles.imageContainer}
            >
              <Image source={{ uri: imageUrl }} style={styles.commentImage} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Deleted info */}
      {comment.isDeleted && comment.deletedAt && (
        <Text style={styles.deletedInfo}>
          Deleted on {formatDate(comment.deletedAt)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  hiddenComment: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#fff3e0',
  },
  deletedComment: {
    borderLeftColor: '#f44336',
    backgroundColor: '#ffebee',
    opacity: 0.7,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  visibilityIcon: {
    marginRight: 4,
  },
  visibilityLabel: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 4,
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  deletedContent: {
    fontStyle: 'italic',
    color: '#666',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imageContainer: {
    marginRight: 8,
    marginBottom: 8,
  },
  commentImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  deletedInfo: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});