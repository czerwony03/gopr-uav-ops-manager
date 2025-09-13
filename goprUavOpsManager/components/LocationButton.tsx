/**
 * LocationButton Component
 * 
 * A cross-platform GPS location button for automatically filling location fields.
 * Works on both Web and React Native (Android/iOS) platforms.
 * 
 * Features:
 * - Requests location permissions automatically
 * - Gets current GPS coordinates using expo-location
 * - Performs reverse geocoding to convert coordinates to readable addresses
 * - Provides fallback to raw coordinates if geocoding fails
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

interface LocationButtonProps {
  onLocationReceived: (location: string) => void;
  disabled?: boolean;
  style?: any;
}

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

const LocationButton: React.FC<LocationButtonProps> = ({ 
  onLocationReceived, 
  disabled = false,
  style 
}) => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);

  const reverseGeocode = async (coordinates: LocationCoordinates): Promise<string> => {
    try {
      const { latitude, longitude } = coordinates;
      
      // Try Expo's built-in reverse geocoding first
      const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
        const address = reverseGeocodedAddress[0];
        
        // Format a readable location string
        const parts: string[] = [];
        
        if (address.name) parts.push(address.name);
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.region && address.region !== address.city) parts.push(address.region);
        if (address.country && address.country !== address.region) parts.push(address.country);
        
        return parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
      
      // Fallback: return coordinates if geocoding fails
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      // Return coordinates as fallback
      return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }
  };

  const getCurrentLocation = async (): Promise<LocationCoordinates> => {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error(t('location.permissionDenied'));
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  };

  const handleLocationPress = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      const coordinates = await getCurrentLocation();
      const locationString = await reverseGeocode(coordinates);
      onLocationReceived(locationString);
    } catch (error) {
      console.error('Error getting location:', error);
      
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
        Alert.alert(t('location.errorTitle'), errorMessage);
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