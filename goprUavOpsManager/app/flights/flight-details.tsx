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
import { useTranslation } from 'react-i18next';
import { Flight } from '@/types/Flight';
import { useAuth } from '@/contexts/AuthContext';
import { FlightService } from '@/services/flightService';
import { UserService } from '@/services/userService';

export default function FlightDetailsScreen() {
  const { t } = useTranslation('common');
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
          Alert.alert(t('common.error'), t('flightDetails.notFound'), [
            { text: t('common.ok'), onPress: () => router.back() }
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
        Alert.alert(t('common.error'), t('flightDetails.loadError'), [
          { text: t('common.ok'), onPress: () => router.back() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, router]); // t is stable from react-i18next and doesn't need to be in deps

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
      router.push(`/flights/flight-form?id=${flight.id}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!flight) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('flightDetails.notFound')}</Text>
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
            <Text style={styles.title}>{t('flightDetails.title')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('flightDetails.basicInfo')}</Text>
            <Text style={styles.detail}>{t('flightDetails.date')}: {flight.date}</Text>
            <Text style={styles.detail}>{t('flightDetails.location')}: {flight.location}</Text>
            <Text style={styles.detail}>
              {t('common.time')}: {crossesMidnight ? (
                `${formatDateTime(flight.startTime)} - ${formatDateTime(flight.endTime)}`
              ) : (
                `${formatTime(flight.startTime)} - ${formatTime(flight.endTime)}`
              )}
            </Text>
            <Text style={styles.detail}>{t('flightDetails.conditions')}: {flight.conditions}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('flightDetails.operationalInfo')}</Text>
            <Text style={styles.detail}>{t('flightDetails.category')}: {flight.flightCategory}</Text>
            <Text style={styles.detail}>{t('flightDetails.operation')}: {flight.operationType}</Text>
            <Text style={styles.detail}>{t('flightDetails.activity')}: {flight.activityType}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('drones.title')}</Text>
            <Text style={styles.detail}>{t('flightDetails.drone')}: {flight.droneName || flight.droneId}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('users.title')}</Text>
            <Text style={styles.detail}>{t('flightDetails.operator')}: {flight.userEmail || t('userDetails.noData')}</Text>
          </View>

          {(flight.createdAt || flight.updatedAt) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('flightDetails.auditInfo')}</Text>
              {flight.createdAt && (
                <Text style={styles.detail}>
                  {t('flightDetails.createdAt')}: {flight.createdAt.toLocaleDateString()} {flight.createdAt.toLocaleTimeString()}
                  {createdByEmail && ` ${t('flightDetails.createdBy')} ${createdByEmail}`}
                </Text>
              )}
              {flight.updatedAt && (
                <Text style={styles.detail}>
                  {t('flightDetails.updatedAt')}: {flight.updatedAt.toLocaleDateString()} {flight.updatedAt.toLocaleTimeString()}
                  {updatedByEmail && ` ${t('flightDetails.updatedBy')} ${updatedByEmail}`}
                </Text>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            {canEdit && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>{t('flightDetails.editButton')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
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
