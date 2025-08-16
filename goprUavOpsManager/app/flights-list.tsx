import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { FlightService } from '../services/flightService';
import { Flight } from '../types/Flight';

export default function FlightsListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFlights = async () => {
    if (!user) return;

    try {
      const fetchedFlights = await FlightService.getFlights(user.role, user.uid);
      setFlights(fetchedFlights);
    } catch (error) {
      console.error('Error fetching flights:', error);
      Alert.alert('Error', 'Failed to fetch flights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFlights();
  };

  const canEditFlight = (flight: Flight): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || flight.userId === user.uid;
  };

  const handleEditFlight = (flightId: string) => {
    router.push(`/flight-form?id=${flightId}`);
  };

  const handleAddFlight = () => {
    router.push('/flight-form');
  };

  const renderFlightItem = ({ item }: { item: Flight }) => (
    <View style={styles.flightCard}>
      <View style={styles.flightHeader}>
        <Text style={styles.flightDate}>{item.date}</Text>
        <Text style={styles.flightTime}>
          {item.startTime} - {item.endTime}
        </Text>
      </View>
      
      <View style={styles.flightInfo}>
        <Text style={styles.flightLocation}>{item.location}</Text>
        <Text style={styles.droneName}>{item.droneName || item.droneId}</Text>
      </View>

      <View style={styles.flightDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{item.flightCategory}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Operation:</Text>
          <Text style={styles.detailValue}>{item.operationType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Activity:</Text>
          <Text style={styles.detailValue}>{item.activityType}</Text>
        </View>
        {item.conditions && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Conditions:</Text>
            <Text style={styles.detailValue}>{item.conditions}</Text>
          </View>
        )}
        {(user?.role === 'admin' || user?.role === 'manager') && item.userEmail && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Operator:</Text>
            <Text style={styles.detailValue}>{item.userEmail}</Text>
          </View>
        )}
      </View>

      {canEditFlight(item) && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditFlight(item.id)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading flights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddFlight}>
          <Text style={styles.addButtonText}>+ Add Flight</Text>
        </TouchableOpacity>
      </View>

      {flights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No flights found</Text>
          <Text style={styles.emptySubtext}>
            Tap "Add Flight" to create your first flight log
          </Text>
        </View>
      ) : (
        <FlatList
          data={flights}
          renderItem={renderFlightItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  flightCard: {
    backgroundColor: '#fff',
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
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flightDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  flightTime: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  flightInfo: {
    marginBottom: 12,
  },
  flightLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  droneName: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  flightDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});