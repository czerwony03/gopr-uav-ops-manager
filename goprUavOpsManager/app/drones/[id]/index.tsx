import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Drone } from '@/types/Drone';
import { useAuth } from '@/contexts/AuthContext';
import { DroneService } from '@/services/droneService';
import { UserService } from '@/services/userService';

export default function DroneDetailsScreen() {
  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdByEmail, setCreatedByEmail] = useState<string>('');
  const [updatedByEmail, setUpdatedByEmail] = useState<string>('');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    const fetchDrone = async () => {
      if (!id || !user) return;

      try {
        const droneData = await DroneService.getDrone(id, user.role);
        if (!droneData) {
          Alert.alert(t('common.error'), t('drones.errors.notFoundOrNoPermission'), [
            { text: t('common.ok'), onPress: () => router.back() }
          ]);
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
        Alert.alert(t('common.error'), t('droneDetails.loadError'), [
          { text: t('common.ok'), onPress: () => router.back() }
        ]);
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
  }, [id, user, router]);

  const handleEdit = () => {
    if (!drone) return;
    router.push(`/drones/${drone.id}/edit`);
  };

  const handleDelete = async () => {
    if (!drone || !user) return;

    Alert.alert(
      t('droneDetails.deleteConfirmTitle'),
      t('droneDetails.deleteConfirmMessage', { name: drone.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DroneService.softDeleteDrone(drone.id, user.role, user.uid);
              Alert.alert(t('common.success'), t('droneDetails.deleteSuccess'), [
                { text: t('common.ok'), onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting drone:', error);
              Alert.alert(t('common.error'), t('droneDetails.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    if (!drone || !user) return;

    Alert.alert(
      t('droneDetails.restoreConfirmTitle'),
      t('droneDetails.restoreConfirmMessage', { name: drone.name }),
      [
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
              
              Alert.alert(t('common.success'), t('droneDetails.restoreSuccess'));
            } catch (error) {
              console.error('Error restoring drone:', error);
              Alert.alert(t('common.error'), t('droneDetails.restoreError'));
            }
          },
        },
      ]
    );
  };

  const handleOpenUserManual = () => {
    if (drone?.userManual) {
      Linking.openURL(drone.userManual).catch(() => {
        Alert.alert(t('common.error'), t('droneDetails.manualError'));
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
          {drone.isDeleted && user?.role === 'admin' && (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>{t('droneDetails.deleted')}</Text>
            </View>
          )}
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

        {drone.userManual && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneDetails.documentation')}</Text>
            <TouchableOpacity style={styles.manualButton} onPress={handleOpenUserManual}>
              <Text style={styles.manualButtonText}>{t('droneDetails.openManual')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {(drone.createdAt || drone.updatedAt || drone.deletedAt) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneDetails.auditInfo')}</Text>
            {drone.createdAt && (
              <Text style={styles.detail}>
                {t('flightDetails.createdAt')}: {drone.createdAt.toLocaleDateString()} {drone.createdAt.toLocaleTimeString()}
                {createdByEmail && ` ${t('flightDetails.createdBy')} ${createdByEmail}`}
              </Text>
            )}
            {drone.updatedAt && (
              <Text style={styles.detail}>
                {t('flightDetails.updatedAt')}: {drone.updatedAt.toLocaleDateString()} {drone.updatedAt.toLocaleTimeString()}
                {updatedByEmail && ` ${t('flightDetails.updatedBy')} ${updatedByEmail}`}
              </Text>
            )}
            {drone.deletedAt && (
              <Text style={styles.detail}>{t('droneDetails.deletedAt')}: {drone.deletedAt.toLocaleDateString()} {drone.deletedAt.toLocaleTimeString()}</Text>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          {canModify && (
            <>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>{t('droneDetails.editButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>{t('droneDetails.deleteButton')}</Text>
              </TouchableOpacity>
            </>
          )}

          {canRestore && (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Text style={styles.restoreButtonText}>{t('droneDetails.restoreButton')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
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
});
