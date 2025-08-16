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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Drone } from '../types/Drone';
import { useAuth } from '../contexts/AuthContext';
import { DroneService } from '../services/droneService';

export default function DroneDetailsScreen() {
  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchDrone = async () => {
      if (!id || !user) return;

      try {
        const droneData = await DroneService.getDrone(id, user.role);
        if (!droneData) {
          Alert.alert('Error', 'Drone not found or you do not have permission to view it', [
            { text: 'OK', onPress: () => router.back() }
          ]);
          return;
        }
        setDrone(droneData);
      } catch (error) {
        console.error('Error fetching drone:', error);
        Alert.alert('Error', 'Failed to fetch drone details', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDrone();
  }, [id, user, router]);

  const handleEdit = () => {
    if (!drone) return;
    router.push(`/drone-form?id=${drone.id}`);
  };

  const handleDelete = async () => {
    if (!drone || !user) return;

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
              Alert.alert('Success', 'Drone deleted successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting drone:', error);
              Alert.alert('Error', 'Failed to delete drone');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    if (!drone || !user) return;

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
              // Refresh the drone data
              const updatedDrone = await DroneService.getDrone(drone.id, user.role);
              setDrone(updatedDrone);
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

  const handleOpenUserManual = () => {
    if (drone?.userManual) {
      Linking.openURL(drone.userManual).catch(() => {
        Alert.alert('Error', 'Failed to open user manual');
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading drone details...</Text>
      </View>
    );
  }

  if (!drone) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Drone not found</Text>
      </View>
    );
  }

  const canModify = user && (user.role === 'manager' || user.role === 'admin') && !drone.isDeleted;
  const canRestore = user?.role === 'admin' && drone.isDeleted;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      <View style={[styles.card, drone.isDeleted && styles.deletedCard]}>
        <View style={styles.header}>
          <Text style={styles.title}>{drone.name}</Text>
          {drone.isDeleted && user?.role === 'admin' && (
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>DELETED</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.detail}>Call Sign: {drone.callSign}</Text>
          <Text style={styles.detail}>Registration Number: {drone.registrationNumber}</Text>
          <Text style={styles.detail}>Equipment Registration: {drone.equipmentRegistrationNumber}</Text>
          <Text style={styles.detail}>Location: {drone.location}</Text>
          <Text style={styles.detail}>Insurance: {drone.insurance}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>
          <Text style={styles.detail}>
            Total Flight Time: {DroneService.formatFlightTime(drone.totalFlightTime)}
          </Text>
          <Text style={styles.detail}>Operating Time: {drone.operatingTime}h</Text>
          <Text style={styles.detail}>Max Speed: {drone.maxSpeed} km/h</Text>
          <Text style={styles.detail}>Range: {drone.range} km</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Specifications</Text>
          <Text style={styles.detail}>Weight: {drone.weight} kg</Text>
          <Text style={styles.detail}>Max Takeoff Weight: {drone.maxTakeoffWeight} kg</Text>
          <Text style={styles.detail}>
            Dimensions: {drone.dimensions.length} x {drone.dimensions.width} x {drone.dimensions.height} cm
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battery Information</Text>
          <Text style={styles.detail}>Type: {drone.battery.type}</Text>
          <Text style={styles.detail}>Capacity: {drone.battery.capacity} mAh</Text>
          <Text style={styles.detail}>Voltage: {drone.battery.voltage} V</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manufacturing Information</Text>
          <Text style={styles.detail}>Year of Manufacture: {drone.yearOfManufacture}</Text>
          <Text style={styles.detail}>Year of Commissioning: {drone.yearOfCommissioning}</Text>
        </View>

        {drone.userManual && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentation</Text>
            <TouchableOpacity style={styles.manualButton} onPress={handleOpenUserManual}>
              <Text style={styles.manualButtonText}>Open User Manual</Text>
            </TouchableOpacity>
          </View>
        )}

        {(drone.createdAt || drone.updatedAt || drone.deletedAt) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timestamps</Text>
            {drone.createdAt && (
              <Text style={styles.detail}>Created: {drone.createdAt.toLocaleDateString()}</Text>
            )}
            {drone.updatedAt && (
              <Text style={styles.detail}>Last Updated: {drone.updatedAt.toLocaleDateString()}</Text>
            )}
            {drone.deletedAt && (
              <Text style={styles.detail}>Deleted: {drone.deletedAt.toLocaleDateString()}</Text>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          {canModify && (
            <>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>Edit Drone</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete Drone</Text>
              </TouchableOpacity>
            </>
          )}

          {canRestore && (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Text style={styles.restoreButtonText}>Restore Drone</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
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