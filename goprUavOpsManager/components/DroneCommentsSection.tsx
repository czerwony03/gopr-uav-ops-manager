import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DroneComment, CommentVisibility, PaginatedDroneCommentResponse } from '@/types/DroneComment';
import { UserRole } from '@/types/UserRole';
import { DroneCommentService } from '@/services/droneCommentService';
import { DroneCommentItem } from './DroneCommentItem';
import { DroneCommentForm } from './DroneCommentForm';
import { ImageViewer } from './ImageViewer';

interface DroneCommentsSectionProps {
  droneId: string;
  userRole: UserRole;
  userId: string;
  userEmail?: string;
  isOffline?: boolean;
}

export const DroneCommentsSection: React.FC<DroneCommentsSectionProps> = ({
  droneId,
  userRole,
  userId,
  userEmail,
  isOffline = false
}) => {
  const [comments, setComments] = useState<DroneComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image viewer state
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Pagination state
  const [hasNextPage, setHasNextPage] = useState(false);
  const [lastDocumentSnapshot, setLastDocumentSnapshot] = useState<any>(null);

  const loadComments = useCallback(async (refresh = false) => {
    if (isOffline) {
      setError('Comments require internet connection');
      return;
    }

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await DroneCommentService.getPaginatedDroneComments(droneId, userRole, {
        limit: 20,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        ...(refresh ? {} : { lastDocumentSnapshot })
      });

      if (refresh) {
        setComments(response.comments);
      } else {
        setComments(prev => [...prev, ...response.comments]);
      }
      
      setHasNextPage(response.hasNextPage);
      setLastDocumentSnapshot(response.lastDocumentSnapshot);

    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [droneId, userRole, isOffline, lastDocumentSnapshot]);

  const handleRefresh = useCallback(() => {
    setLastDocumentSnapshot(null);
    loadComments(true);
  }, [loadComments]);

  const handleAddComment = async (content: string, images: string[], visibility: CommentVisibility) => {
    if (isOffline) {
      Alert.alert('Offline', 'Comments require internet connection');
      return;
    }

    setSubmitting(true);
    try {
      await DroneCommentService.createDroneComment(
        {
          droneId,
          content,
          images,
          visibility
        },
        userRole,
        userId,
        userEmail
      );

      setShowAddForm(false);
      // Refresh comments list
      handleRefresh();
      Alert.alert('Success', 'Comment added successfully');

    } catch (err) {
      console.error('Error adding comment:', err);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (isOffline) {
      Alert.alert('Offline', 'Comments require internet connection');
      return;
    }

    try {
      await DroneCommentService.deleteDroneComment(commentId, userRole, userId, userEmail);
      
      // Update the comment in the local state to show as deleted
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, isDeleted: true, deletedAt: new Date() }
            : comment
        )
      );

      Alert.alert('Success', 'Comment deleted successfully');
    } catch (err) {
      console.error('Error deleting comment:', err);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  const handleImagePress = (images: string[], index: number) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const loadMoreComments = () => {
    if (hasNextPage && !loading) {
      loadComments();
    }
  };

  useEffect(() => {
    loadComments(true);
  }, [droneId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Comments ({comments.length})</Text>
        {!isOffline && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons 
              name={showAddForm ? "close" : "add"} 
              size={20} 
              color="#4CAF50" 
            />
            <Text style={styles.addButtonText}>
              {showAddForm ? 'Cancel' : 'Add Comment'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add comment form */}
      {showAddForm && !isOffline && (
        <DroneCommentForm
          onSubmit={handleAddComment}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={submitting}
        />
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadComments(true)} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comments list */}
      <ScrollView
        style={styles.commentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {comments.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No comments yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to add a comment about this drone
            </Text>
          </View>
        ) : (
          comments.map((comment) => (
            <DroneCommentItem
              key={comment.id}
              comment={comment}
              userRole={userRole}
              currentUserId={userId}
              onDeleteComment={handleDeleteComment}
              onImagePress={handleImagePress}
            />
          ))
        )}

        {/* Load more button */}
        {hasNextPage && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadMoreComments}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Text style={styles.loadMoreText}>Load More Comments</Text>
            )}
          </TouchableOpacity>
        )}

        {loading && comments.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading comments...</Text>
          </View>
        )}
      </ScrollView>

      {/* Image viewer */}
      <ImageViewer
        images={selectedImages.map(uri => ({ uri }))}
        imageIndex={selectedImageIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        onImageIndexChange={setSelectedImageIndex}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f5e8',
    borderRadius: 20,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});