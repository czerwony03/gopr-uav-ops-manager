import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Drone } from '@/types/Drone';
import { useAuth } from '@/contexts/AuthContext';
import { DroneService } from '@/services/droneService';
import { UserService } from '@/services/userService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import ImageGallery from '@/components/ImageGallery';
import EquipmentChecklistModal from '@/components/EquipmentChecklistModal';

export default function DroneDetailsScreen() {
  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdByEmail, setCreatedByEmail] = useState<string>('');
  const [updatedByEmail, setUpdatedByEmail] = useState<string>('');
  const [showEquipmentChecklist, setShowEquipmentChecklist] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();

  useEffect(() => {
    const fetchDrone = async () => {
      if (!id || !user) return;

      try {
        const droneData = await DroneService.getDrone(id, user.role);
        if (!droneData) {
          crossPlatformAlert.showAlert({ 
            title: t('common.error'), 
            message: t('drones.errors.notFoundOrNoPermission'),
            buttons: [
              { text: t('common.ok'), onPress: () => router.back() }
            ]
          });
          return;
        }
        setDrone(droneData);
        
        // Fetch user emails for audit trail
        if (droneData.createdBy) {
          const createdEmail = await UserService.getUserEmail(droneData.createdBy);
          setCreatedByEmail(createdEmail);
        }
        if (droneData.updatedBy) {
          const updatedEmail = await UserService.getUserEmail(droneData.updatedBy);
          setUpdatedByEmail(updatedEmail);
        }
      } catch (error) {
        console.error('Error fetching drone:', error);
        crossPlatformAlert.showAlert({ 
          title: t('common.error'), 
          message: t('droneDetails.loadError'),
          buttons: [
            { text: t('common.ok'), onPress: () => router.back() }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    // Check authentication first - redirect to login if not authenticated
    if (!user) {
      router.replace('/');
      return;
    }

    fetchDrone();
  }, [id, user, router, t]);

  const handleEdit = () => {
    if (!drone || isButtonDisabled()) return;
    router.push(`/drones/${drone.id}/edit`);
  };

  const handleDelete = async () => {
    if (!drone || !user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('droneDetails.deleteConfirmTitle'),
      message: t('droneDetails.deleteConfirmMessage', { name: drone.name }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DroneService.softDeleteDrone(drone.id, user.role, user.uid);
              crossPlatformAlert.showAlert({ 
                title: t('common.success'), 
                message: t('droneDetails.deleteSuccess'),
                buttons: [
                  { text: t('common.ok'), onPress: () => router.back() }
                ]
              });
            } catch (error) {
              console.error('Error deleting drone:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('droneDetails.deleteError') });
            }
          },
        },
      ]
    });
  };

  const handleRestore = async () => {
    if (!drone || !user || isButtonDisabled()) return;

    crossPlatformAlert.showAlert({
      title: t('droneDetails.restoreConfirmTitle'),
      message: t('droneDetails.restoreConfirmMessage', { name: drone.name }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('droneDetails.restoreButton'),
          onPress: async () => {
            try {
              await DroneService.restoreDrone(drone.id, user.role, user.uid);
              // Refresh the drone data
              const updatedDrone = await DroneService.getDrone(drone.id, user.role);
              setDrone(updatedDrone);
              
              // Refresh user emails
              if (updatedDrone?.updatedBy) {
                const updatedEmail = await UserService.getUserEmail(updatedDrone.updatedBy);
                setUpdatedByEmail(updatedEmail);
              }
              
              crossPlatformAlert.showAlert({ title: t('common.success'), message: t('droneDetails.restoreSuccess') });
            } catch (error) {
              console.error('Error restoring drone:', error);
              crossPlatformAlert.showAlert({ title: t('common.error'), message: t('droneDetails.restoreError') });
            }
          },
        },
      ]
    });
  };

  const handleOpenUserManual = () => {
    if (drone?.userManual) {
      Linking.openURL(drone.userManual).catch(() => {
        crossPlatformAlert.showAlert({ title: t('common.error'), message: t('droneDetails.manualError') });
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!drone) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('droneDetails.notFound')}</Text>
      </View>
    );
  }

  const canModify = user && (user.role === 'manager' || user.role === 'admin') && !drone.isDeleted;
  const canRestore = user?.role === 'admin' && drone.isDeleted;

  return (
    <>
      <Stack.Screen options={{
        title: t('drones.droneDetails'),
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <SafeAreaView style={styles.container}>
      <ScrollView>
      <View style={[styles.card, drone.isDeleted && styles.deletedCard]}>
        <View style={styles.header}>
          <Text style={styles.title}>{drone.name}</Text>
          {drone.isDeleted && user?.role === 'admin' ? (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>{t('droneDetails.deleted')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneDetails.basicInfo')}</Text>
          <Text style={styles.detail}>{t('droneDetails.callSign')}: {drone.callSign}</Text>
          <Text style={styles.detail}>{t('droneDetails.registration')}: {drone.registrationNumber}</Text>
          <Text style={styles.detail}>{t('droneDetails.equipmentRegistration')}: {drone.equipmentRegistrationNumber}</Text>
          <Text style={styles.detail}>{t('droneDetails.location')}: {drone.location}</Text>
          <Text style={styles.detail}>{t('droneDetails.insurance')}: {drone.insurance}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneDetails.operationalInfo')}</Text>
          <Text style={styles.detail}>
            {t('droneDetails.flightTime')}: {DroneService.formatFlightTime(drone.totalFlightTime)}
          </Text>
          <Text style={styles.detail}>{t('droneDetails.operatingTime')}: {DroneService.formatOperatingTime(drone.operatingTime)}</Text>
          <Text style={styles.detail}>{t('droneDetails.maxSpeed')}: {drone.maxSpeed} km/h</Text>
          <Text style={styles.detail}>{t('droneDetails.range')}: {DroneService.formatRange(drone.range)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneDetails.technicalInfo')}</Text>
          <Text style={styles.detail}>{t('droneDetails.weight')}: {DroneService.formatWeight(drone.weight)}</Text>
          <Text style={styles.detail}>{t('droneDetails.maxWeight')}: {DroneService.formatWeight(drone.maxTakeoffWeight)}</Text>
          <Text style={styles.detail}>
            {t('droneDetails.dimensions')}: {DroneService.formatDimensions(drone.dimensions.length, drone.dimensions.width, drone.dimensions.height)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneDetails.batteryInfo')}</Text>
          <Text style={styles.detail}>{t('droneDetails.batteryType')}: {drone.battery.type}</Text>
          <Text style={styles.detail}>{t('droneDetails.batteryCapacity')}: {drone.battery.capacity} mAh</Text>
          <Text style={styles.detail}>{t('droneDetails.batteryVoltage')}: {drone.battery.voltage} V</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('droneDetails.manufacturingInfo')}</Text>
          <Text style={styles.detail}>{t('droneDetails.manufactured')}: {drone.yearOfManufacture}</Text>
          <Text style={styles.detail}>{t('droneDetails.commissioned')}: {drone.yearOfCommissioning}</Text>
        </View>

        {drone.userManual ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneDetails.documentation')}</Text>
            <TouchableOpacity style={styles.manualButton} onPress={handleOpenUserManual}>
              <Text style={styles.manualButtonText}>{t('droneDetails.openManual')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {drone.images && drone.images.length > 0 && (
          <View style={styles.section}>
            <ImageGallery
              images={drone.images}
              title={t('droneDetails.images')}
              numColumns={2}
              containerStyle={styles.imageGalleryContainer}
            />
          </View>
        )}

        {drone.additionalInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneForm.additionalInfo')}</Text>
            <Text style={styles.additionalInfoText}>{drone.additionalInfo}</Text>
          </View>
        ) : null}

        {drone.equipmentStorages && drone.equipmentStorages.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.equipmentHeader}>
              <Text style={styles.sectionTitle}>{t('equipmentStorage.storages')}</Text>
              <TouchableOpacity
                style={styles.checkEquipmentButton}
                onPress={() => setShowEquipmentChecklist(true)}
              >
                <Text style={styles.checkEquipmentButtonText}>{t('equipment.checkEquipment')}</Text>
              </TouchableOpacity>
            </View>
            
            {drone.equipmentStorages.map((storage) => (
              <View key={storage.id} style={styles.storageSection}>
                <View style={styles.storageHeader}>
                  <Ionicons name="bag-outline" size={20} color="#0066CC" />
                  <Text style={styles.storageTitle}>{storage.name}</Text>
                </View>
                
                {storage.items.length > 0 ? (
                  <View style={styles.equipmentGrid}>
                    {storage.items.map((item) => (
                      <View key={item.id} style={styles.equipmentItem}>
                        {item.image && (
                          <Image source={{ uri: item.image }} style={styles.equipmentImage} />
                        )}
                        <Text style={styles.equipmentName}>{item.name}</Text>
                        <Text style={styles.equipmentQuantity}>
                          {t('equipment.quantity')}: {item.quantity}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyStorage}>
                    <Text style={styles.emptyStorageText}>{t('equipment.noEquipmentInStorage')}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {(drone.createdAt || drone.updatedAt || drone.deletedAt) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneDetails.auditInfo')}</Text>
            {drone.createdAt ? (
              <Text style={styles.detail}>
                {t('flightDetails.createdAt')}: {drone.createdAt.toLocaleDateString()} {drone.createdAt.toLocaleTimeString()}
                {createdByEmail && ` ${t('flightDetails.createdBy')} ${createdByEmail}`}
              </Text>
            ) : null}
            {drone.updatedAt ? (
              <Text style={styles.detail}>
                {t('flightDetails.updatedAt')}: {drone.updatedAt.toLocaleDateString()} {drone.updatedAt.toLocaleTimeString()}
                {updatedByEmail && ` ${t('flightDetails.updatedBy')} ${updatedByEmail}`}
              </Text>
            ) : null}
            {drone.deletedAt ? (
              <Text style={styles.detail}>{t('droneDetails.deletedAt')}: {drone.deletedAt.toLocaleDateString()} {drone.deletedAt.toLocaleTimeString()}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionButtons}>
          {canModify ? (
            <>
              <TouchableOpacity 
                style={[styles.editButton, getDisabledStyle()]} 
                onPress={handleEdit}
                disabled={isButtonDisabled()}
              >
                <Text style={[styles.editButtonText, isButtonDisabled() && { color: '#999' }]}>
                  {t('droneDetails.editButton')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteButton, getDisabledStyle()]} 
                onPress={handleDelete}
                disabled={isButtonDisabled()}
              >
                <Text style={[styles.deleteButtonText, isButtonDisabled() && { color: '#999' }]}>
                  {t('droneDetails.deleteButton')}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {canRestore ? (
            <TouchableOpacity 
              style={[styles.restoreButton, getDisabledStyle()]} 
              onPress={handleRestore}
              disabled={isButtonDisabled()}
            >
              <Text style={[styles.restoreButtonText, isButtonDisabled() && { color: '#999' }]}>
                {t('droneDetails.restoreButton')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </ScrollView>
    
    <EquipmentChecklistModal
      visible={showEquipmentChecklist}
      equipmentStorages={drone?.equipmentStorages || []}
      onClose={() => setShowEquipmentChecklist(false)}
    />
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
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
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deletedCard: {
    backgroundColor: '#f8f8f8',
    borderColor: '#d32f2f',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deletedBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deletedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  detail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
    lineHeight: 24,
  },
  manualButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  manualButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 20,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  restoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  additionalInfoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
  },
  imageGalleryContainer: {
    marginTop: 0,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkEquipmentButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  checkEquipmentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  equipmentItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  equipmentImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  equipmentQuantity: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  storageSection: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  emptyStorage: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyStorageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
