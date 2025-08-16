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
import { Link, useRouter } from 'expo-router';
import { Drone } from '../types/Drone';
import { useAuth } from '../contexts/AuthContext';
import { DroneService } from '../services/droneService';

export default function DronesListScreen() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchDrones = useCallback(async () => {
    if (!user) return;
    
    try {
      const dronesList = await DroneService.getDrones(user.role);
      setDrones(dronesList);
    } catch (error) {
      console.error('Error fetching drones:', error);
      Alert.alert(
        'Error', 
        'Failed to fetch drones. Please check your Firebase configuration and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrones();
  };

  const handleCreateDrone = () => {
    router.push('/drone-form');
  };

  const handleEditDrone = (drone: Drone) => {
    router.push(`/drone-form?id=${drone.id}`);
  };

  const handleDeleteDrone = async (drone: Drone) => {
    if (!user) return;

    Alert.alert(
      'Delete Drone',
      `Are you sure you want to delete "${drone.name}"? This action can be undone by an admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DroneService.softDeleteDrone(drone.id, user.role);
              await fetchDrones(); // Refresh the list
              Alert.alert('Success', 'Drone deleted successfully');
            } catch (error) {
              console.error('Error deleting drone:', error);
              Alert.alert('Error', 'Failed to delete drone');
            }
          },
        },
      ]
    );
  };

  const handleRestoreDrone = async (drone: Drone) => {
    if (!user) return;

    Alert.alert(
      'Restore Drone',
      `Are you sure you want to restore "${drone.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await DroneService.restoreDrone(drone.id, user.role);
              await fetchDrones(); // Refresh the list
              Alert.alert('Success', 'Drone restored successfully');
            } catch (error) {
              console.error('Error restoring drone:', error);
              Alert.alert('Error', 'Failed to restore drone');
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
            <Text style={styles.deletedBadgeText}>DELETED</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.droneDetail}>Call Sign: {item.callSign}</Text>
      <Text style={styles.droneDetail}>Registration: {item.registrationNumber}</Text>
      <Text style={styles.droneDetail}>Location: {item.location}</Text>
      <Text style={styles.droneDetail}>
        Flight Time: {DroneService.formatFlightTime(item.totalFlightTime)}
      </Text>
      <Text style={styles.droneDetail}>Insurance: {item.insurance}</Text>
      <Text style={styles.droneDetail}>Max Speed: {item.maxSpeed} km/h</Text>
      <Text style={styles.droneDetail}>Range: {item.range} km</Text>
      <Text style={styles.droneDetail}>
        Weight: {item.weight}kg (Max: {item.maxTakeoffWeight}kg)
      </Text>
      <Text style={styles.droneDetail}>
        Manufactured: {item.yearOfManufacture} | Commissioned: {item.yearOfCommissioning}
      </Text>

      <View style={styles.actionButtons}>
        <Link href={`/drone-details?id=${item.id}`} asChild>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </Link>

        {user && (user.role === 'manager' || user.role === 'admin') && !item.isDeleted && (
          <>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditDrone(item)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteDrone(item)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}

        {user?.role === 'admin' && item.isDeleted && (
          <TouchableOpacity style={styles.restoreButton} onPress={() => handleRestoreDrone(item)}>
            <Text style={styles.restoreButtonText}>Restore</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading drones...</Text>
      </View>
    );
  }

  const canCreateDrones = user && (user.role === 'manager' || user.role === 'admin');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Drones List</Text>
        {canCreateDrones && (
          <TouchableOpacity style={styles.createButton} onPress={handleCreateDrone}>
            <Text style={styles.createButtonText}>+ Add Drone</Text>
          </TouchableOpacity>
        )}
      </View>

      {drones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No drones found</Text>
          <Text style={styles.emptySubtext}>
            {canCreateDrones 
              ? "Add your first drone using the 'Add Drone' button above"
              : "No drones are available at the moment"
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