import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ImageZoom from 'react-native-image-pan-zoom';
import { Image } from 'expo-image';
import { ProcedureChecklist, ChecklistItem } from '@/types/ProcedureChecklist';
import { useAuth } from '@/contexts/AuthContext';
import { ProcedureChecklistService } from '@/services/procedureChecklistService';
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { AuditLogService } from '@/services/auditLogService';
import { UserService } from '@/services/userService';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';
import { ImageCacheService } from '@/utils/imageCache';
import { useResponsiveLayout } from '@/utils/useResponsiveLayout';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ProcedureExecuteScreen() {
  const [checklist, setChecklist] = useState<ProcedureChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string>('');
  const [executionStartTime] = useState<Date>(new Date());
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation('common');
  const router = useRouter();
  const crossPlatformAlert = useCrossPlatformAlert();
  const responsive = useResponsiveLayout();

  const fetchChecklist = useCallback(async () => {
    if (!user || !id) return;
    
    try {
      // Try to get procedure from offline service first
      const { procedure, isFromCache: fromCache } = await OfflineProcedureChecklistService.getProcedureChecklist(id, user.role);
      
      if (procedure) {
        setChecklist(procedure);
        setIsFromCache(fromCache);
        
        // If we got cached data and we're online, try to get fresh data in background
        if (fromCache && isConnected) {
          try {
            const freshProcedure = await ProcedureChecklistService.getProcedureChecklist(id, user.role);
            if (freshProcedure) {
              setChecklist(freshProcedure);
              setIsFromCache(false);
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

  // Load cached image for current step
  const loadCachedImage = useCallback(async (imageUri: string) => {
    try {
      await ImageCacheService.initialize();
      const cachedUri = await ImageCacheService.getCachedImage(imageUri);
      setCachedImageUri(cachedUri);
    } catch (error) {
      console.error('Error loading cached image:', error);
      // Fallback to original URI
      setCachedImageUri(imageUri);
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

  // Log execution start
  useEffect(() => {
    if (user && checklist) {
      const logExecutionStart = async () => {
        try {
          const userEmail = await UserService.getUserEmail(user.uid);
          await AuditLogService.createAuditLog({
            entityType: 'procedureChecklist',
            entityId: checklist.id,
            action: 'execute_start',
            userId: user.uid,
            userEmail,
            details: `Started executing procedure: ${checklist.title}`,
          });
        } catch (error) {
          console.error('Error logging procedure execution start:', error);
        }
      };
      logExecutionStart();
    }
  }, [user, checklist]);

  // Load cached image when step changes
  useEffect(() => {
    if (checklist && checklist.items[currentStep]?.image) {
      loadCachedImage(checklist.items[currentStep].image);
    } else {
      setCachedImageUri('');
    }
  }, [currentStep, checklist, loadCachedImage]);

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

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (checklist && currentStep < checklist.items.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = async () => {
    if (!user || !checklist) return;

    try {
      const userEmail = await UserService.getUserEmail(user.uid);
      const executionDuration = Math.floor((new Date().getTime() - executionStartTime.getTime()) / 1000);
      
      await AuditLogService.createAuditLog({
        entityType: 'procedureChecklist',
        entityId: checklist.id,
        action: 'execute_finish',
        userId: user.uid,
        userEmail,
        details: `Completed executing procedure: ${checklist.title} (Duration: ${executionDuration}s)`,
      });

      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('procedures.execute.completed'),
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    } catch (error) {
      console.error('Error logging procedure execution finish:', error);
      // Still navigate back even if logging fails
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('procedures.loading')}</Text>
      </View>
    );
  }

  if (!checklist || checklist.items.length === 0) {
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

  const currentItem: ChecklistItem = checklist.items
    .sort((a, b) => a.number - b.number)[currentStep];
  const isLastStep = currentStep === checklist.items.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline info bar */}
      <OfflineInfoBar 
        visible={!isConnected || isFromCache} 
        message={!isConnected ? t('offline.noConnection') : t('offline.viewingCachedData')}
      />

      {/* Header with step counter */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleFinish}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { fontSize: responsive.fontSize.title }]} numberOfLines={1}>
            {checklist.title}
          </Text>
          <Text style={styles.stepCounter}>
            {t('procedures.execute.step', { current: currentStep + 1, total: checklist.items.length })}
          </Text>
        </View>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {/* Image viewer with zoom */}
        {currentItem.image && cachedImageUri ? (
          <View style={styles.imageContainer}>
            {Platform.OS === 'web' ? (
              // For web, use a simpler approach without ImageZoom
              <Image
                source={{ uri: cachedImageUri }}
                style={styles.webImage}
                contentFit="contain"
                transition={200}
              />
            ) : (
              // For mobile, use ImageZoom for pinch/zoom
              <ImageZoom
                cropWidth={screenWidth}
                cropHeight={responsive.isDesktop ? 400 : screenHeight * 0.5}
                imageWidth={screenWidth - 32}
                imageHeight={responsive.isDesktop ? 380 : screenHeight * 0.48}
                enableCenterFocus={false}
                maxOverflow={0}
                minScale={0.6}
                maxScale={3}
                enableDoubleClickZoom={true}
                doubleClickInterval={250}
                style={styles.imageZoom}
              >
                <Image
                  source={{ uri: cachedImageUri }}
                  style={styles.image}
                  contentFit="contain"
                  transition={200}
                />
              </ImageZoom>
            )}
          </View>
        ) : null}

        {/* Item details */}
        <View style={[
          styles.detailsContainer,
          responsive.isDesktop && { paddingHorizontal: responsive.spacing.large }
        ]}>
          <View style={styles.itemHeader}>
            <View style={styles.itemNumber}>
              <Text style={styles.itemNumberText}>{currentItem.number}</Text>
            </View>
            <Text style={[
              styles.itemTopic,
              { fontSize: responsive.fontSize.subtitle }
            ]}>
              {currentItem.topic}
            </Text>
          </View>

          <Text style={[
            styles.itemContent,
            { fontSize: responsive.fontSize.body }
          ]}>
            {currentItem.content}
          </Text>

          {currentItem.link && (
            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => handleOpenLink(currentItem.link!)}
            >
              <Ionicons name="link-outline" size={16} color="#0066CC" />
              <Text style={styles.linkButtonText}>{t('procedures.openLink')}</Text>
            </TouchableOpacity>
          )}

          {currentItem.file && (
            <TouchableOpacity 
              style={styles.fileButton} 
              onPress={() => handleOpenLink(currentItem.file!)}
            >
              <Ionicons name="document-outline" size={16} color="#4CAF50" />
              <Text style={styles.fileButtonText}>{t('procedures.openFile')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navigation buttons */}
      <View style={[
        styles.navigationContainer,
        responsive.isDesktop && { paddingHorizontal: responsive.spacing.large }
      ]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.previousButton,
            currentStep === 0 && styles.navButtonDisabled,
            responsive.isDesktop && { flex: 1, maxWidth: 200 }
          ]}
          onPress={handlePrevious}
          disabled={currentStep === 0}
        >
          <Ionicons 
            name="chevron-back" 
            size={20} 
            color={currentStep === 0 ? "#999" : "#fff"} 
          />
          <Text style={[
            styles.navButtonText,
            currentStep === 0 && styles.navButtonTextDisabled
          ]}>
            {t('procedures.execute.previous')}
          </Text>
        </TouchableOpacity>

        {isLastStep ? (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.finishButton,
              responsive.isDesktop && { flex: 1, maxWidth: 200 }
            ]}
            onPress={handleFinish}
          >
            <Text style={styles.navButtonText}>
              {t('procedures.execute.finish')}
            </Text>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              responsive.isDesktop && { flex: 1, maxWidth: 200 }
            ]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonText}>
              {t('procedures.execute.next')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: '#000',
    width: '100%',
    height: Platform.OS === 'web' ? 400 : screenHeight * 0.5,
  },
  imageZoom: {
    backgroundColor: '#000',
  },
  image: {
    width: screenWidth - 32,
    height: screenHeight * 0.48,
  },
  webImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  itemTopic: {
    flex: 1,
    fontWeight: 'bold',
    color: '#333',
  },
  itemContent: {
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
  navigationContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  previousButton: {
    backgroundColor: '#666',
  },
  nextButton: {
    backgroundColor: '#0066CC',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
});
