import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Flight } from '@/types/Flight';
import { useAuth } from '@/contexts/AuthContext';
import { FlightService } from '@/services/flightService';
import { UserService } from '@/services/userService';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { calculateFlightDuration } from '@/src/utils/flightUtils';
import { MapUtils } from '@/utils/mapUtils';
import { EmbeddedLocationMap } from '@/components/EmbeddedLocationMap';

export default function FlightDetailsScreen() {
  const { t } = useTranslation('common');
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdByEmail, setCreatedByEmail] = useState<string>('');
  const [updatedByEmail, setUpdatedByEmail] = useState<string>('');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const crossPlatformAlert = useCrossPlatformAlert();

  useEffect(() => {
    const fetchFlight = async () => {
      if (!id || !user) return;

      try {
        const flightData = await FlightService.getFlight(id, user.role, user.uid);
        if (!flightData) {
          crossPlatformAlert.showAlert({ 
            title: t('common.error'), 
            message: t('flightDetails.notFound'),
            buttons: [
              { text: t('common.ok'), onPress: () => router.back() }
            ]
          });
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
        crossPlatformAlert.showAlert({ 
          title: t('common.error'), 
          message: t('flightDetails.loadError'),
          buttons: [
            { text: t('common.ok'), onPress: () => router.back() }
          ]
        });
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
      router.push(`/flights/${flight.id}/edit`);
    }
  };

  const handleViewOnMap = async () => {
    if (!flight?.coordinates) {
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: 'No coordinates available for this flight',
        buttons: [{ text: t('common.ok') }]
      });
      return;
    }

    try {
      await MapUtils.openInPlatformOptimizedMaps(flight.coordinates);
    } catch (error) {
      console.error('Error opening map:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: 'Unable to open map application',
        buttons: [{ text: t('common.ok') }]
      });
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
    <>
      <Stack.Screen options={{
        title: t('flights.flightDetails'),
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
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
              
              {/* Coordinates section with embedded map and Google Maps button */}
              {flight.coordinates && (
                <View style={styles.coordinatesContainer}>
                  <View style={styles.coordinatesRow}>
                    <Text style={styles.detail}>{t('flightDetails.coordinates')}: {MapUtils.getDisplayCoordinates(flight.coordinates)}</Text>
                    <TouchableOpacity
                      style={styles.mapButton}
                      onPress={handleViewOnMap}
                      accessibilityLabel={t('flightDetails.viewOnMap')}
                    >
                      <Ionicons name="map" size={18} color="#007AFF" />
                      <Text style={styles.mapButtonText}>{t('flightDetails.viewOnMap')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Embedded location map for quick viewing */}
                  <View style={styles.embeddedMapContainer}>
                    <EmbeddedLocationMap 
                      coordinates={flight.coordinates}
                      height={180}
                    />
                  </View>
                </View>
              )}
              
              <Text style={styles.detail}>
                {t('common.time')}: {crossesMidnight ? (
                  `${formatDateTime(flight.startTime)} - ${formatDateTime(flight.endTime)}`
                ) : (
                  `${formatTime(flight.startTime)} - ${formatTime(flight.endTime)}`
                )}
              </Text>
              <Text style={styles.detail}>
                {calculateFlightDuration(flight.startTime, flight.endTime, t)}
              </Text>
              <Text style={styles.detail}>{t('flightDetails.conditions')}: {flight.conditions}</Text>
              
              {flight.additionalInfo && (
                <View style={styles.additionalInfoContainer}>
                  <Text style={styles.additionalInfoLabel}>{t('flightForm.additionalInfo')}:</Text>
                  <Text style={styles.additionalInfoText}>{flight.additionalInfo}</Text>
                </View>
              )}
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
              <Text style={styles.detail}>{t('flightDetails.pilot')}: {flight.userEmail || t('userDetails.noData')}</Text>
              <Text style={styles.detail}>{t('flightDetails.operator')}: {flight.operator || t('userDetails.noData')}</Text>
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
    </>
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
  coordinatesContainer: {
    marginBottom: 8,
  },
  coordinatesRow: {
    flexDirection: 'column',
    gap: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignSelf: 'flex-start',
    gap: 6,
  },
  mapButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  embeddedMapContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  additionalInfoContainer: {
    marginTop: 12,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
  },
  additionalInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  additionalInfoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});


