/**
 * LocationButton Component
 * 
 * A cross-platform GPS location button for automatically filling location fields.
 * Now refactored to use the LocationService for all location operations.
 * 
 * Features:
 * - Requests location permissions automatically
 * - Gets current GPS coordinates using LocationService
 * - Performs reverse geocoding with fallback support
 * - Shows loading states during location retrieval
 * - Handles errors gracefully with user-friendly messages
 * - Supports internationalization (i18n)
 * 
 * Platform Support:
 * - Web: Uses browser's Geolocation API via expo-location
 * - Android: Uses native Android location services
 * - iOS: Uses native iOS Core Location services
 * 
 * Usage:
 * ```tsx
 * <LocationButton
 *   onLocationReceived={(location) => setLocationField(location)}
 *   disabled={isFormDisabled}
 * />
 * ```
 * 
 * @param onLocationReceived - Callback function called with the location string
 * @param disabled - Whether the button should be disabled
 * @param style - Optional style object for the button
 */
import React, { useState } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LocationService } from '@/services/locationService';
import { useCrossPlatformAlert } from './CrossPlatformAlert';

interface LocationButtonProps {
  onLocationReceived: (location: string) => void;
  disabled?: boolean;
  style?: any;
}

const LocationButton: React.FC<LocationButtonProps> = ({ 
  onLocationReceived, 
  disabled = false,
  style 
}) => {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const [loading, setLoading] = useState(false);

  const handleLocationPress = async () => {
    if (disabled || loading) return;

    console.log('LocationButton: Starting location request');
    setLoading(true);
    try {
      console.log('LocationButton: Getting current location with address...');
      const result = await LocationService.getCurrentLocationWithAddress();
      console.log('LocationButton: Got result:', result);
      
      // Use address if available, otherwise fall back to coordinates
      const locationString = result.address || LocationService.formatCoordinates(result.coordinates);
      
      // Check if we only got coordinates back (indicating all geocoding failed)
      const coordinatePattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;
      if (coordinatePattern.test(locationString.trim())) {
        console.log('LocationButton: Only coordinates returned, all geocoding methods failed');
        console.log('LocationButton: User will see coordinates instead of address');
      } else {
        console.log('LocationButton: Successfully got readable address:', locationString);
      }
      
      onLocationReceived(locationString);
    } catch (error) {
      console.error('LocationButton: Error getting location:', error);
      
      let errorMessage = t('location.error');
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = t('location.permissionDenied');
        } else if (error.message.includes('timeout')) {
          errorMessage = t('location.timeout');
        } else if (error.message.includes('network')) {
          errorMessage = t('location.networkError');
        }
      }

      // Show error alert
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        crossPlatformAlert.showAlert({ title: t('location.errorTitle'), message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        {
          padding: 12,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: '#ddd',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 50,
        },
        style,
      ]}
      onPress={handleLocationPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#0066CC" />
      ) : (
        <Ionicons 
          name="location-outline" 
          size={20} 
          color={disabled ? '#ccc' : '#0066CC'} 
        />
      )}
    </TouchableOpacity>
  );
};

export default LocationButton;