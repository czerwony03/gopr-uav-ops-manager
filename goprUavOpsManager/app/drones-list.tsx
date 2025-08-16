import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Drone } from '../types/Drone';

export default function DronesListScreen() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDrones = async () => {
    try {
      const dronesCollection = collection(db, 'drones');
      const droneSnapshot: QuerySnapshot<DocumentData> = await getDocs(dronesCollection);
      const dronesList: Drone[] = droneSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Drone));
      
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
  };

  useEffect(() => {
    fetchDrones();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrones();
  };

  const renderDroneItem = ({ item }: { item: Drone }) => (
    <View style={styles.droneCard}>
      <Text style={styles.droneName}>{item.name}</Text>
      <Text style={styles.droneDetail}>Call Sign: {item.callSign}</Text>
      <Text style={styles.droneDetail}>Registration: {item.registrationNumber}</Text>
      <Text style={styles.droneDetail}>Location: {item.location}</Text>
      <Text style={styles.droneDetail}>Flight Time: {item.totalFlightTime}h</Text>
      <Text style={styles.droneDetail}>Insurance: {item.insurance}</Text>
      <Text style={styles.droneDetail}>Max Speed: {item.maxSpeed} km/h</Text>
      <Text style={styles.droneDetail}>Range: {item.range} km</Text>
      <Text style={styles.droneDetail}>
        Weight: {item.weight}kg (Max: {item.maxTakeoffWeight}kg)
      </Text>
      <Text style={styles.droneDetail}>
        Manufactured: {item.yearOfManufacture} | Commissioned: {item.yearOfCommissioning}
      </Text>
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Drones List</Text>
      {drones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No drones found</Text>
          <Text style={styles.emptySubtext}>
            Add drone documents to the &apos;drones&apos; collection in Firestore
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
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
  droneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  droneDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});