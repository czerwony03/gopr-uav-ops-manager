import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { FlightService } from '@/services/flightService';
import { DroneService } from '@/services/droneService';
import FlightForm, { FlightFormData } from '@/components/FlightForm';
import { 
  FlightCategory, 
  OperationType, 
  ActivityType
} from '@/types/Flight';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function EditFlightScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<FlightFormData | undefined>();

  const fetchFlight = useCallback(async (flightId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const flight = await FlightService.getFlight(flightId, user.role, user.uid);
      if (flight) {
        // Handle backward compatibility for time format
        const parseDateTime = (timeStr: string, fallbackDate: string) => {
          // If it's already a datetime string, parse it
          if (timeStr.includes('T') || timeStr.includes('Z')) {
            const dt = new Date(timeStr);
            return {
              date: dt.toISOString().split('T')[0],
              time: dt.toTimeString().substring(0, 5)
            };
          }
          // If it's in HH:mm format, use fallback date
          if (timeStr.match(/^\d{2}:\d{2}$/)) {
            return {
              date: fallbackDate,
              time: timeStr
            };
          }
          return { date: fallbackDate, time: '' };
        };

        const startDateTime = parseDateTime(flight.startTime, flight.date);
        const endDateTime = parseDateTime(flight.endTime, flight.date);

        setInitialData({
          location: flight.location,
          coordinates: flight.coordinates || '', // Include coordinates from existing flight
          flightCategory: flight.flightCategory as FlightCategory,
          operationType: flight.operationType as OperationType,
          activityType: flight.activityType as ActivityType,
          droneId: flight.droneId,
          startDate: startDateTime.date,
          startTime: startDateTime.time,
          endDate: endDateTime.date,
          endTime: endDateTime.time,
          conditions: flight.conditions || '',
        });
      } else {
        crossPlatformAlert.showAlert({ title: t('common.error'), message: t('flightForm.notFound') });
        router.back();
      }
    } catch (error) {
      console.error('Error fetching flight:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('flightForm.loadError') });
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user, router, t]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchFlight(id);
    } else {
      // If no ID, navigate back
      router.back();
    }
  }, [fetchFlight, id, router]);

  const handleSave = async (formData: FlightFormData) => {
    if (!user || !id || typeof id !== 'string') return;

    setLoading(true);
    try {
      // Get drone name for the snapshot
      const fetchedDrones = await DroneService.getDrones(user.role);
      const selectedDrone = fetchedDrones.find(drone => drone.id === formData.droneId);
      const droneName = selectedDrone?.name || '';

      // Convert separate date/time fields to datetime strings
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;

      const flightData = {
        date: formData.startDate, // Derive date from startDate for database indexing
        location: formData.location,
        coordinates: formData.coordinates || undefined, // Save coordinates if provided
        flightCategory: formData.flightCategory as FlightCategory,
        operationType: formData.operationType as OperationType,
        activityType: formData.activityType as ActivityType,
        droneId: formData.droneId,
        droneName,
        startTime: startDateTime,
        endTime: endDateTime,
        conditions: formData.conditions,
        // Don't include userId and userEmail in updates - they should remain as the original user's data
        // Only the updatedBy field should track who made the change
      };

      await FlightService.updateFlight(id, flightData, user.role, user.uid);
      // Navigate back immediately after successful update
      router.back();
      // Show success alert without blocking navigation
      crossPlatformAlert.showAlert({ title: t('common.success'), message: t('flightForm.updateSuccess') });
    } catch (error) {
      console.error('Error saving flight:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('flightForm.saveError') });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{
        title: t('flights.editFlight'),
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }} />
      <FlightForm
        mode="edit"
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
      />
    </>
  );
}


