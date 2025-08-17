import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProcedureChecklist, ChecklistItem } from '../types/ProcedureChecklist';
import { useAuth } from '../contexts/AuthContext';
import { ProcedureChecklistService } from '../services/procedureChecklistService';

export default function ProcedureChecklistDetailsScreen() {
  const [checklist, setChecklist] = useState<ProcedureChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const fetchChecklist = useCallback(async () => {
    if (!user || !id) return;
    
    try {
      const checklistData = await ProcedureChecklistService.getProcedureChecklist(id, user.role);
      setChecklist(checklistData);
    } catch (error) {
      console.error('Error fetching procedure/checklist:', error);
      Alert.alert(
        'Error', 
        'Failed to fetch procedure/checklist details. Please try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  }, [user, id, router]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Refresh when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && id) {
        fetchChecklist();
      }
    }, [fetchChecklist, user, id])
  );

  const handleEdit = () => {
    if (checklist) {
      router.push(`/procedures-checklist-form?id=${checklist.id}`);
    }
  };

  const handleDelete = async () => {
    if (!user || !checklist) return;

    Alert.alert(
      'Delete Procedure/Checklist',
      `Are you sure you want to delete "${checklist.title}"? This action can be undone by an admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProcedureChecklistService.softDeleteProcedureChecklist(checklist.id, user.role);
              Alert.alert('Success', 'Procedure/checklist deleted successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting procedure/checklist:', error);
              Alert.alert('Error', 'Failed to delete procedure/checklist');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    if (!user || !checklist) return;

    try {
      await ProcedureChecklistService.restoreProcedureChecklist(checklist.id, user.role);
      await fetchChecklist(); // Refresh the data
      Alert.alert('Success', 'Procedure/checklist restored successfully');
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      Alert.alert('Error', 'Failed to restore procedure/checklist');
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const canModifyChecklists = user?.role === 'manager' || user?.role === 'admin';

  const renderChecklistItem = (item: ChecklistItem, index: number) => (
    <View key={item.id} style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <View style={styles.itemNumber}>
          <Text style={styles.itemNumberText}>{item.number}</Text>
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTopic}>{item.topic}</Text>
        </View>
      </View>

      {item.image && (
        <View style={styles.itemImageContainer}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        </View>
      )}

      <Text style={styles.itemContentText}>{item.content}</Text>

      {item.link && (
        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={() => handleOpenLink(item.link!)}
        >
          <Ionicons name="link-outline" size={16} color="#0066CC" />
          <Text style={styles.linkButtonText}>Open Link</Text>
        </TouchableOpacity>
      )}

      {item.file && (
        <TouchableOpacity 
          style={styles.fileButton} 
          onPress={() => handleOpenLink(item.file!)}
        >
          <Ionicons name="document-outline" size={16} color="#4CAF50" />
          <Text style={styles.fileButtonText}>Open File</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading procedure/checklist...</Text>
      </View>
    );
  }

  if (!checklist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Procedure/Checklist Not Found</Text>
        <Text style={styles.errorDescription}>
          The requested procedure or checklist could not be found.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{checklist.title}</Text>
          {checklist.description && (
            <Text style={styles.description}>{checklist.description}</Text>
          )}
          
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {checklist.items.length} item{checklist.items.length !== 1 ? 's' : ''}
            </Text>
            {checklist.createdAt && (
              <Text style={styles.metadataText}>
                Created {checklist.createdAt.toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Status badge for deleted items (admin only) */}
        {checklist.isDeleted && user?.role === 'admin' && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>DELETED</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {canModifyChecklists && (
        <View style={styles.actionButtons}>
          {!checklist.isDeleted && (
            <>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}

          {user?.role === 'admin' && checklist.isDeleted && (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.restoreButtonText}>Restore</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Checklist items */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {checklist.items
          .sort((a, b) => a.number - b.number)
          .map((item, index) => renderChecklistItem(item, index))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    marginRight: 16,
  },
  deletedBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deletedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  restoreButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemNumber: {
    backgroundColor: '#0066CC',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemTopic: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemImageContainer: {
    marginBottom: 12,
  },
  itemImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  itemContentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  linkButtonText: {
    color: '#0066CC',
    fontSize: 16,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fileButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
});