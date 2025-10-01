import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DroneComment } from '@/types/DroneComment';
import { UserRole } from '@/types/UserRole';
import { useCrossPlatformAlert } from './CrossPlatformAlert';

interface DroneCommentItemProps {
  comment: DroneComment;
  userRole: UserRole;
  currentUserId: string;
  onDeleteComment: (commentId: string) => void;
  onImagePress: (images: string[], index: number) => void;
  onHideComment: (commentId: string) => void;
}

export const DroneCommentItem: React.FC<DroneCommentItemProps> = ({
  comment,
  userRole,
  onDeleteComment,
  onImagePress,
  onHideComment,
}) => {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const canDelete = (userRole === 'admin' || userRole === 'manager') && !comment.isDeleted;
  const canHide = (userRole === 'admin' || userRole === 'manager') && !comment.isDeleted && comment.visibility === 'public';

  const handleDelete = () => {
    crossPlatformAlert.showAlert({
      title: t('comments.deleteConfirm.title'),
      message: t('comments.deleteConfirm.message'),
      buttons: [
        { text: t('comments.deleteConfirm.cancel'), style: 'cancel' },
        { 
          text: t('comments.deleteConfirm.delete'), 
          style: 'destructive',
          onPress: () => onDeleteComment(comment.id)
        }
      ]
    });
  };

  const handleHide = () => {
    crossPlatformAlert.showAlert({
      title: t('comments.hideConfirm.title', 'Ukryj komentarz'),
      message: t('comments.hideConfirm.message', 'Czy na pewno chcesz ukryć ten komentarz?'),
      buttons: [
        { text: t('comments.hideConfirm.cancel', 'Anuluj'), style: 'cancel' },
        {
          text: t('comments.hideConfirm.hide', 'Ukryj'),
          style: 'destructive',
          onPress: () => onHideComment(comment.id)
        }
      ]
    });
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
          <View style={styles.commentMeta}>
            <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
            {getVisibilityIcon()}
            {comment.visibility === 'hidden' && (
              <Text style={styles.visibilityLabel}>{t('comments.visibility.hidden')}</Text>
            )}
          </View>
        </View>
        <View style={styles.actionButtons}>
          {canHide && (
            <TouchableOpacity onPress={handleHide} style={styles.deleteButton}>
              <Ionicons name="eye-off-outline" size={20} color="#FF9800" />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color="#d32f2f" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Comment content */}
      <Text style={[
        styles.commentContent,
        comment.isDeleted && styles.deletedContent
      ]}>
        {comment.isDeleted ? t('comments.messages.commentRemoved') : comment.content}
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'column',
    flex: 1,
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  visibilityIcon: {
    marginRight: 4,
  },
  visibilityLabel: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
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
