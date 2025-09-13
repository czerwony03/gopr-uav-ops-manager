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

  const fallbackReverseGeocode = async (coordinates: LocationCoordinates): Promise<string | null> => {
    try {
      const { latitude, longitude } = coordinates;
      
      console.log('LocationButton: Trying fallback geocoding with Nominatim...');
      
      // Use OpenStreetMap Nominatim (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GOPRUAVOpsManager/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('LocationButton: Nominatim response:', data);
      
      if (data && data.display_name) {
        // Clean up and format the display name
        let address = data.display_name;
        
        // Remove postal codes and coordinates from the display name
        address = address.replace(/\d{2}-\d{3}/g, ''); // Remove Polish postal codes
        address = address.replace(/\b\d{5}\b/g, ''); // Remove US postal codes
        address = address.replace(/,\s*,/g, ','); // Remove double commas
        address = address.replace(/^,\s*|,\s*$/g, ''); // Remove leading/trailing commas
        address = address.trim();
        
        console.log('LocationButton: Formatted Nominatim address:', address);
        return address;
      }
      
      return null;
    } catch (error) {
      console.error('LocationButton: Fallback geocoding failed:', error);
      return null;
    }
  };

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
        
        if (parts.length > 0) {
          const formattedAddress = parts.join(', ');
          console.log('LocationButton: Formatted Expo address:', formattedAddress);
          return formattedAddress;
        }
      }
      
      console.log('LocationButton: Expo geocoding failed or returned no useful data, trying fallback...');
      
      // Try fallback geocoding
      const fallbackAddress = await fallbackReverseGeocode(coordinates);
      if (fallbackAddress) {
        console.log('LocationButton: Fallback geocoding succeeded:', fallbackAddress);
        return fallbackAddress;
      }
      
      console.log('LocationButton: All geocoding methods failed, returning coordinates');
      // Final fallback: return coordinates
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