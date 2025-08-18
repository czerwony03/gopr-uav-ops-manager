import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Flight } from '../types/Flight';
import { useAuth } from '../contexts/AuthContext';
import { FlightService } from '../services/flightService';
import { UserService } from '../services/userService';

export default function FlightDetailsScreen() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdByEmail, setCreatedByEmail] = useState<string>('');
  const [updatedByEmail, setUpdatedByEmail] = useState<string>('');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchFlight = async () => {
      if (!id || !user) return;

      try {
        const flightData = await FlightService.getFlight(id, user.role, user.uid);
        if (!flightData) {
          Alert.alert('Error', 'Flight not found or you do not have permission to view it', [
            { text: 'OK', onPress: () => router.back() }
          ]);
          return;
        }
        setFlight(flightData);
        
        // Fetch user emails for audit trail
        if (flightData.createdBy) {
          const createdEmail = await UserService.getUserEmail(flightData.createdBy);
          setCreatedByEmail(createdEmail);
        }
        if (flightData.updatedBy) {
          const updatedEmail = await UserService.getUserEmail(flightData.updatedBy);
          setUpdatedByEmail(updatedEmail);
        }
      } catch (error) {
        console.error('Error fetching flight:', error);
        Alert.alert('Error', 'Failed to fetch flight details', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlight();
  }, [id, user, router]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${formatTime(isoString)}`;
  };

  const checkIfCrossesMidnight = (start: string, end: string): boolean => {
    const startDate = new Date(start).toDateString();
    const endDate = new Date(end).toDateString();
    return startDate !== endDate;
  };

  const handleEdit = () => {
    if (flight) {
      router.push(`/flight-form?id=${flight.id}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading flight details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!flight) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Flight not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = user && (user.role === 'admin' || user.role === 'manager' || flight.userId === user.uid);
  const crossesMidnight = checkIfCrossesMidnight(flight.startTime, flight.endTime);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Flight Details</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Text style={styles.detail}>Date: {flight.date}</Text>
            <Text style={styles.detail}>Location: {flight.location}</Text>
            <Text style={styles.detail}>
              Time: {crossesMidnight ? (
                `${formatDateTime(flight.startTime)} - ${formatDateTime(flight.endTime)}`
              ) : (
                `${formatTime(flight.startTime)} - ${formatTime(flight.endTime)}`
              )}
            </Text>
            <Text style={styles.detail}>Conditions: {flight.conditions}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flight Categories</Text>
            <Text style={styles.detail}>Flight Category: {flight.flightCategory}</Text>
            <Text style={styles.detail}>Operation Type: {flight.operationType}</Text>
            <Text style={styles.detail}>Activity Type: {flight.activityType}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drone Information</Text>
            <Text style={styles.detail}>Drone: {flight.droneName || flight.droneId}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Information</Text>
            <Text style={styles.detail}>Pilot: {flight.userEmail || 'Unknown'}</Text>
          </View>

          {(flight.createdAt || flight.updatedAt) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Audit Trail</Text>
              {flight.createdAt && (
                <Text style={styles.detail}>
                  Created: {flight.createdAt.toLocaleDateString()} {flight.createdAt.toLocaleTimeString()}
                  {createdByEmail && ` by ${createdByEmail}`}
                </Text>
              )}
              {flight.updatedAt && (
                <Text style={styles.detail}>
                  Last Updated: {flight.updatedAt.toLocaleDateString()} {flight.updatedAt.toLocaleTimeString()}
                  {updatedByEmail && ` by ${updatedByEmail}`}
                </Text>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            {canEdit && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>Edit Flight</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
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
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  detail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
