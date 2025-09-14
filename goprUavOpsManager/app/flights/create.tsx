import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
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

export default function CreateFlightScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const crossPlatformAlert = useCrossPlatformAlert();

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  const handleSave = async (formData: FlightFormData) => {
    if (!user) return;

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
        userId: user.uid,
        userEmail: user.email,
      };

      await FlightService.createFlight(flightData, user.uid, user.email);
      // Navigate back immediately after successful creation
      router.back();
      // Show success alert without blocking navigation
      crossPlatformAlert.showAlert({ title: t('common.success'), message: t('flightForm.createSuccess') });
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
    <FlightForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}

