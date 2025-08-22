import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Drone } from '@/types/Drone';
import { useAuth } from '@/contexts/AuthContext';
import { DroneService } from '@/services/droneService';

export default function DronesListScreen() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  const fetchDrones = useCallback(async () => {
    if (!user) return;
    
    try {
      const dronesList = await DroneService.getDrones(user.role);
      setDrones(dronesList);
    } catch (error) {
      console.error('Error fetching drones:', error);
      Alert.alert(
        t('common.error'), 
        t('drones.errors.fetchFailed')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  // Refresh drones when the screen comes into focus (e.g., returning from drone form)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchDrones();
      }
    }, [fetchDrones, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrones();
  };

  const handleCreateDrone = () => {
    router.push('/drones/create');
  };

  const handleEditDrone = (drone: Drone) => {
    router.push(`/drones/${drone.id}/edit`);
  };

  const handleDeleteDrone = async (drone: Drone) => {
    if (!user) return;

    Alert.alert(
      t('drones.deleteTitle'),
      t('drones.deleteConfirmation', { name: drone.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DroneService.softDeleteDrone(drone.id, user.role, user.uid);
              await fetchDrones(); // Refresh the list
              Alert.alert(t('common.success'), t('drones.deleteSuccess'));
            } catch (error) {
              console.error('Error deleting drone:', error);
              Alert.alert(t('common.error'), t('drones.errors.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleRestoreDrone = async (drone: Drone) => {
    if (!user) return;

    Alert.alert(
      t('drones.restoreTitle'),
      t('drones.restoreConfirmation', { name: drone.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('drones.restore'),
          onPress: async () => {
            try {
              await DroneService.restoreDrone(drone.id, user.role, user.uid);
              await fetchDrones(); // Refresh the list
              Alert.alert(t('common.success'), t('drones.restoreSuccess'));
            } catch (error) {
              console.error('Error restoring drone:', error);
              Alert.alert(t('common.error'), t('drones.errors.restoreFailed'));
            }
          },
        },
      ]
    );
  };

  const renderDroneItem = ({ item }: { item: Drone }) => (
    <View style={[styles.droneCard, item.isDeleted && styles.deletedCard]}>
      <View style={styles.droneHeader}>
        <Text style={styles.droneName}>{item.name}</Text>
        {item.isDeleted && user?.role === 'admin' && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>{t('drones.deleted')}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.droneDetail}>{t('drones.callSign')}: {item.callSign}</Text>
      <Text style={styles.droneDetail}>{t('drones.registration')}: {item.registrationNumber}</Text>
      <Text style={styles.droneDetail}>{t('drones.location')}: {item.location}</Text>
      <Text style={styles.droneDetail}>
        {t('drones.flightTime')}: {DroneService.formatFlightTime(item.totalFlightTime)}
      </Text>
      <Text style={styles.droneDetail}>{t('drones.insurance')}: {item.insurance}</Text>
      <Text style={styles.droneDetail}>{t('drones.maxSpeed')}: {item.maxSpeed} km/h</Text>
      <Text style={styles.droneDetail}>{t('drones.range')}: {DroneService.formatRange(item.range)}</Text>
      <Text style={styles.droneDetail}>
        {t('drones.weight')}: {DroneService.formatWeight(item.weight)} ({t('drones.maxWeight')}: {DroneService.formatWeight(item.maxTakeoffWeight)})
      </Text>
      <Text style={styles.droneDetail}>
        {t('drones.manufactured')}: {item.yearOfManufacture} | {t('drones.commissioned')}: {item.yearOfCommissioning}
      </Text>

      <View style={styles.actionButtons}>
        <Link href={`/drones/${item.id}`} asChild>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>{t('drones.viewDetails')}</Text>
          </TouchableOpacity>
        </Link>

        {user && (user.role === 'manager' || user.role === 'admin') && !item.isDeleted && (
          <>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditDrone(item)}>
              <Text style={styles.editButtonText}>{t('common.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteDrone(item)}>
              <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </>
        )}

        {user?.role === 'admin' && item.isDeleted && (
          <TouchableOpacity style={styles.restoreButton} onPress={() => handleRestoreDrone(item)}>
            <Text style={styles.restoreButtonText}>{t('drones.restore')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const canCreateDrones = user && (user.role === 'manager' || user.role === 'admin');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('drones.title')}</Text>
        {canCreateDrones && (
          <TouchableOpacity style={styles.createButton} onPress={handleCreateDrone}>
            <Text style={styles.createButtonText}>+ {t('drones.add')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {drones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('drones.noDronesFound')}</Text>
          <Text style={styles.emptySubtext}>
            {canCreateDrones 
              ? t('drones.addFirstDrone')
              : t('drones.noDronesAvailable')
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={drones}
          renderItem={renderDroneItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContainer: {
    paddingBottom: 16,
  },
  droneCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
  droneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  droneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deletedBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deletedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  droneDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
    gap: 8,
  },
  viewButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  restoreButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  restoreButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
