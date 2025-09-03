import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from '../../../components/ImageViewer';
import { ProcedureChecklist, ChecklistItem } from '@/types/ProcedureChecklist';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { UserService } from '@/services/userService';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { ImageCacheService } from '@/utils/imageCache';

export default function ProcedureDetailsScreen() {
  const [checklist, setChecklist] = useState<ProcedureChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [createdByEmail, setCreatedByEmail] = useState<string>('');
  const [updatedByEmail, setUpdatedByEmail] = useState<string>('');
  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedImageUris, setCachedImageUris] = useState<Map<string, string>>(new Map());
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation('common');
  const router = useRouter();
  const crossPlatformAlert = useCrossPlatformAlert();

  const fetchChecklist = useCallback(async () => {
    if (!user || !id) return;
    
    try {
      // Try to get procedure from offline service first
      const { procedure, isFromCache: fromCache } = await OfflineProcedureChecklistService.getProcedureChecklist(id, user.role);
      
      if (procedure) {
        setChecklist(procedure);
        setIsFromCache(fromCache);
        
        // Load cached images for all procedure items
        await loadCachedImages(procedure);
        
        // Fetch user emails for audit trail (only if online and not from cache)
        if (!fromCache && isConnected) {
          if (procedure.createdBy) {
            const createdEmail = await UserService.getUserEmail(procedure.createdBy).catch(() => '');
            setCreatedByEmail(createdEmail);
          }
          if (procedure.updatedBy) {
            const updatedEmail = await UserService.getUserEmail(procedure.updatedBy).catch(() => '');
            setUpdatedByEmail(updatedEmail);
          }
        }
        
        // If we got cached data and we're online, try to get fresh data in background
        if (fromCache && isConnected) {
          try {
            const freshProcedure = await ProcedureChecklistService.getProcedureChecklist(id, user.role);
            if (freshProcedure) {
              setChecklist(freshProcedure);
              setIsFromCache(false);
              
              // Update cached images for fresh data
              await loadCachedImages(freshProcedure);
              
              // Update user emails for fresh data
              if (freshProcedure.createdBy) {
                const createdEmail = await UserService.getUserEmail(freshProcedure.createdBy).catch(() => '');
                setCreatedByEmail(createdEmail);
              }
              if (freshProcedure.updatedBy) {
                const updatedEmail = await UserService.getUserEmail(freshProcedure.updatedBy).catch(() => '');
                setUpdatedByEmail(updatedEmail);
              }
            }
          } catch (error) {
            console.log('Failed to fetch fresh procedure data, keeping cached data:', error);
          }
        }
      } else {
        // Procedure not found
        crossPlatformAlert.showAlert({
          title: t('procedures.error'), 
          message: t('procedures.failedToLoad'),
          buttons: [{ text: 'OK', onPress: () => router.back() }]
        });
      }
    } catch (error) {
      console.error('Error fetching procedure/checklist:', error);
      crossPlatformAlert.showAlert({
        title: t('procedures.error'), 
        message: t('procedures.failedToLoad'),
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    } finally {
      setLoading(false);
    }
  }, [user, id, isConnected, router, t, crossPlatformAlert]);

  // Load cached images for procedure items
  const loadCachedImages = useCallback(async (procedure: ProcedureChecklist) => {
    try {
      await ImageCacheService.initialize();
      
      const newCachedUris = new Map<string, string>();
      
      // Load cached images for all items that have images
      await Promise.all(
        procedure.items.map(async (item) => {
          if (item.image) {
            try {
              const cachedUri = await ImageCacheService.getCachedImage(item.image);
              newCachedUris.set(item.image, cachedUri);
            } catch (error) {
              console.error(`Error loading cached image for item ${item.id}:`, error);
              // Fallback to original URI
              newCachedUris.set(item.image, item.image);
            }
          }
        })
      );
      
      setCachedImageUris(newCachedUris);
    } catch (error) {
      console.error('Error loading cached images:', error);
    }
  }, []);

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
      router.push(`/procedures/${checklist.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!user || !checklist) return;

    crossPlatformAlert.showAlert({
      title: t('procedures.deleteTitle'),
      message: t('procedures.deleteConfirmation', { title: checklist.title }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('procedures.delete.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ProcedureChecklistService.softDeleteProcedureChecklist(checklist.id, user.role, user.uid);
              crossPlatformAlert.showAlert({ 
                title: t('common.success'), 
                message: t('procedures.deleteSuccess'),
                buttons: [
                  { text: 'OK', onPress: () => router.back() }
                ]
              });
            } catch (error) {
              console.error('Error deleting procedure/checklist:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('procedures.deleteError') });
            }
          },
        },
      ]
    });
  };

  const handleRestore = async () => {
    if (!user || !checklist) return;

    try {
      await ProcedureChecklistService.restoreProcedureChecklist(checklist.id, user.role, user.uid);
      await fetchChecklist(); // Refresh the data
      crossPlatformAlert.showAlert({ title: t('common.success'), message: t('procedures.restoreSuccess') });
    } catch (error) {
      console.error('Error restoring procedure/checklist:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('procedures.restoreError') });
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        crossPlatformAlert.showAlert({ title: t('common.error'), message: t('contact.cannotOpenLink') });
      }
    } catch (error) {
      console.error('Error opening link:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('contact.failedToOpenLink') });
    }
  };

  const canModifyChecklists = user?.role === 'manager' || user?.role === 'admin';

  // Get all images from checklist items for the image viewer
  const getImages = useCallback(() => {
    if (!checklist) return [];
    
    return checklist.items
      .filter(item => item.image)
      .sort((a, b) => a.number - b.number)
      .map(item => ({ uri: item.image! }));
  }, [checklist]);

  // Find the index of the selected image in the images array
  const getImageIndex = useCallback((selectedImage: string) => {
    const images = getImages();
    return images.findIndex(img => img.uri === selectedImage);
  }, [getImages]);

  // Handle opening image viewer
  const handleImagePress = useCallback((imageUri: string) => {
    const index = getImageIndex(imageUri);
    if (index >= 0) {
      setImageIndex(index);
      setImageViewerVisible(true);
    }
  }, [getImageIndex]);

  const renderChecklistItem = (item: ChecklistItem, _index: number) => (
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
        <TouchableOpacity 
          style={styles.itemImageContainer}
          onPress={() => handleImagePress(item.image!)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: cachedImageUris.get(item.image) || item.image }} 
            style={styles.itemImage} 
          />
        </TouchableOpacity>
      )}

      <Text style={styles.itemContentText}>{item.content}</Text>

      {item.link && (
        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={() => handleOpenLink(item.link!)}
        >
          <Ionicons name="link-outline" size={16} color="#0066CC" />
          <Text style={styles.linkButtonText}>{t('procedures.openLink')}</Text>
        </TouchableOpacity>
      )}

      {item.file && (
        <TouchableOpacity 
          style={styles.fileButton} 
          onPress={() => handleOpenLink(item.file!)}
        >
          <Ionicons name="document-outline" size={16} color="#4CAF50" />
          <Text style={styles.fileButtonText}>{t('procedures.openFile')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('procedures.loading')}</Text>
      </View>
    );
  }

  if (!checklist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>{t('procedures.notFound')}</Text>
        <Text style={styles.errorDescription}>
          {t('procedures.notFoundDescription')}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('procedures.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline info bar */}
      <OfflineInfoBar 
        visible={!isConnected || isFromCache} 
        message={!isConnected ? t('offline.noConnection') : t('offline.viewingCachedData')}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{checklist.title}</Text>
          {checklist.description ? (
            <Text style={styles.description}>{checklist.description}</Text>
          ) : null}
          
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {checklist.items.length} {checklist.items.length === 1 ? t('procedures.items') : t('procedures.itemsPlural')}
            </Text>
            {checklist.createdAt ? (
              <Text style={styles.metadataText}>
                {t('procedures.created')} {checklist.createdAt.toLocaleDateString()} {checklist.createdAt.toLocaleTimeString()}
                {createdByEmail && ` ${t('procedures.by')} ${createdByEmail}`}
              </Text>
            ) : null}
            {checklist.updatedAt ? (
              <Text style={styles.metadataText}>
                {t('procedures.updated')} {checklist.updatedAt.toLocaleDateString()} {checklist.updatedAt.toLocaleTimeString()}
                {updatedByEmail && ` ${t('procedures.by')} ${updatedByEmail}`}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Status badge for deleted items (admin only) */}
        {checklist.isDeleted && user?.role === 'admin' && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>{t('procedures.deleted')}</Text>
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
                <Text style={styles.editButtonText}>{t('procedures.edit')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>{t('procedures.delete.button')}</Text>
              </TouchableOpacity>
            </>
          )}

          {user?.role === 'admin' && checklist.isDeleted && (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.restoreButtonText}>{t('procedures.restore.button')}</Text>
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

      {/* Image Viewer Modal */}
      <ImageViewer
        images={getImages()}
        imageIndex={imageIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        onImageIndexChange={setImageIndex}
      />
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
