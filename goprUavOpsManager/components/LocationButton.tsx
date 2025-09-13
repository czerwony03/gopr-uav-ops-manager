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
      
      console.log('LocationButton: Starting reverse geocoding for coordinates:', { latitude, longitude });
      
      // Try Expo's built-in reverse geocoding first
      const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      console.log('LocationButton: Reverse geocoding response:', reverseGeocodedAddress);

      if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
        const address = reverseGeocodedAddress[0];
        
        console.log('LocationButton: Processing address object:', address);
        
        // Format a readable location string - check all possible fields
        const parts: string[] = [];
        
        // Add more comprehensive field mapping
        if (address.name) parts.push(address.name);
        if (address.streetNumber) parts.push(address.streetNumber);
        if (address.street) parts.push(address.street);
        if (address.district) parts.push(address.district);
        if (address.city) parts.push(address.city);
        if (address.subregion && address.subregion !== address.city) parts.push(address.subregion);
        if (address.region && address.region !== address.city && address.region !== address.subregion) parts.push(address.region);
        if (address.country && address.country !== address.region) parts.push(address.country);
        if (address.postalCode) parts.push(address.postalCode);
        
        const formattedAddress = parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        console.log('LocationButton: Formatted address:', formattedAddress);
        console.log('LocationButton: Address parts found:', parts);
        console.log('LocationButton: All address fields:', {
          name: address.name,
          streetNumber: address.streetNumber,
          street: address.street,
          district: address.district,
          city: address.city,
          subregion: address.subregion,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode,
          timezone: address.timezone,
          isoCountryCode: address.isoCountryCode,
        });
        
        return formattedAddress;
      }
      
      console.log('LocationButton: No reverse geocoding results, returning coordinates');
      // Fallback: return coordinates if geocoding fails
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('LocationButton: Reverse geocoding failed with error:', error);
      console.error('LocationButton: Error type:', typeof error);
      console.error('LocationButton: Error name:', error?.constructor?.name);
      console.error('LocationButton: Error message:', error instanceof Error ? error.message : 'Unknown error');
      
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

    console.log('LocationButton: Starting location request');
    setLoading(true);
    try {
      console.log('LocationButton: Getting current coordinates...');
      const coordinates = await getCurrentLocation();
      console.log('LocationButton: Got coordinates:', coordinates);
      
      console.log('LocationButton: Starting reverse geocoding...');
      const locationString = await reverseGeocode(coordinates);
      console.log('LocationButton: Final location string:', locationString);
      
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