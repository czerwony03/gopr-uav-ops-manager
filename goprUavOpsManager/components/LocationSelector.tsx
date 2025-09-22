/**
 * LocationSelector Component
 * 
 * A reusable component that provides comprehensive location selection functionality.
 * Combines GPS location retrieval, manual coordinate input, map selection, and 
 * automatic reverse geocoding into a unified interface.
 * 
 * Features:
 * - GPS location button with permission handling
 * - Manual coordinate input with validation
 * - Interactive map selector integration
 * - Automatic reverse geocoding with fallback
 * - Address field that auto-updates from coordinates
 * - Cross-platform support (Web, Android, iOS)
 * - Comprehensive error handling
 * - Loading states and user feedback
 * - Internationalization support
 * 
 * Usage:
 * ```tsx
 * <LocationSelector
 *   coordinates={formData.coordinates}
 *   location={formData.location}
 *   onCoordinatesChange={(coords) => setCoordinates(coords)}
 *   onLocationChange={(address) => setLocation(address)}
 *   disabled={isSubmitting}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LocationService, LocationCoordinates } from '@/services/locationService';
import { CoordinateUtils } from '@/utils/coordinateUtils';
import InteractiveMapSelector from './InteractiveMapSelector';

interface LocationSelectorProps {
  /** Current coordinates string value */
  coordinates: string;
  /** Current location/address string value */
  location: string;
  /** Callback when coordinates change */
  onCoordinatesChange: (coordinates: string) => void;
  /** Callback when location/address changes */
  onLocationChange: (location: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Show GPS button (default: true) */
  showGpsButton?: boolean;
  /** Show map button (default: true) */
  showMapButton?: boolean;
  /** Show location field (default: true) */
  showLocationField?: boolean;
  /** Custom placeholder for coordinates input */
  coordinatesPlaceholder?: string;
  /** Custom placeholder for location input */
  locationPlaceholder?: string;
  /** Custom style for the container */
  style?: any;
  /** Whether to auto-update location from coordinates (default: true) */
  autoUpdateLocation?: boolean;
  /** Whether the location field is required */
  required?: boolean;
}

export default function LocationSelector({
  coordinates,
  location,
  onCoordinatesChange,
  onLocationChange,
  disabled = false,
  showGpsButton = true,
  showMapButton = true,
  showLocationField = true,
  coordinatesPlaceholder,
  locationPlaceholder,
  style,
  autoUpdateLocation = true,
  required = false,
}: LocationSelectorProps) {
  const { t } = useTranslation('common');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapSelectorVisible, setMapSelectorVisible] = useState(false);

  // Handle GPS location request
  const handleGetCurrentLocation = useCallback(async () => {
    if (disabled || isLoadingLocation) return;

    setIsLoadingLocation(true);
    try {
      const result = await LocationService.getCurrentLocationWithAddress();
      const coordinatesString = LocationService.formatCoordinates(result.coordinates);
      
      onCoordinatesChange(coordinatesString);
      
      if (result.address && autoUpdateLocation) {
        onLocationChange(result.address);
      }
    } catch (error) {
      console.error('LocationSelector: Error getting current location:', error);
      
      let errorMessage = t('location.error');
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = t('location.permissionDenied');
        } else if (error.message.includes('timeout')) {
          errorMessage = t('location.timeout');
        }
      }

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert(t('location.errorTitle'), errorMessage);
      }
    } finally {
      setIsLoadingLocation(false);
    }
  }, [disabled, isLoadingLocation, onCoordinatesChange, onLocationChange, autoUpdateLocation, t]);

  // Handle coordinate changes and auto-update location
  const handleCoordinatesChange = useCallback(async (newCoordinates: string) => {
    onCoordinatesChange(newCoordinates);
    
    if (!autoUpdateLocation || !(newCoordinates || '').trim()) {
      return;
    }

    // Parse and validate coordinates
    const parsedCoords = CoordinateUtils.parse(newCoordinates);
    if (!parsedCoords) {
      return;
    }

    setIsLoadingLocation(true);
    try {
      const address = await LocationService.reverseGeocode(parsedCoords);
      if (address) {
        onLocationChange(address);
      }
    } catch (error) {
      console.error('LocationSelector: Error updating location from coordinates:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [onCoordinatesChange, onLocationChange, autoUpdateLocation]);

  // Handle map selection
  const handleMapSelection = useCallback(() => {
    if (disabled) return;
    setMapSelectorVisible(true);
  }, [disabled]);

  // Handle location selection from map
  const handleLocationFromMap = useCallback(async (selectedCoordinates: LocationCoordinates) => {
    const coordinatesString = LocationService.formatCoordinates(selectedCoordinates);
    await handleCoordinatesChange(coordinatesString);
  }, [handleCoordinatesChange]);

  // Parse coordinates for map initial position
  const getInitialMapCoordinates = useCallback((): LocationCoordinates | undefined => {
    return CoordinateUtils.parse(coordinates) || undefined;
  }, [coordinates]);

  return (
    <View style={[styles.container, style]}>
      {/* GPS Button */}
      {showGpsButton && (
        <TouchableOpacity
          style={[
            styles.gpsButton,
            isLoadingLocation && styles.disabledButton,
            disabled && styles.disabledButton
          ]}
          onPress={handleGetCurrentLocation}
          disabled={disabled || isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="location-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.gpsButtonText}>
            {isLoadingLocation 
              ? t('location.loading', 'Getting location...') 
              : t('location.getCurrentLocation', 'Get current location')
            }
          </Text>
        </TouchableOpacity>
      )}

      {/* Coordinates Field with Map Button */}
      <Text style={styles.label}>{t('flightForm.coordinates', 'Coordinates')}{required ? ' *' : ''}</Text>
      <View style={styles.coordinatesContainer}>
        <TextInput
          style={[
            styles.input, 
            styles.coordinatesInput,
            disabled && styles.disabledInput,
          ]}
          value={coordinates}
          onChangeText={handleCoordinatesChange}
          placeholder={coordinatesPlaceholder || t('flightForm.coordinatesPlaceholder', 'Enter coordinates (lat, lng)')}
          editable={!disabled}
        />
        {showMapButton && (
          <TouchableOpacity
            style={[styles.mapButton, disabled && styles.disabledButton]}
            onPress={handleMapSelection}
            disabled={disabled}
          >
            <Ionicons name="map-outline" size={20} color={disabled ? "#ccc" : "#0066CC"} />
          </TouchableOpacity>
        )}
      </View>

      {/* Location Field (Auto-updated) */}
      {showLocationField && (
        <>
          <Text style={styles.label}>{t('flightForm.location')}{required ? ' *' : ''}</Text>
          <View style={styles.locationContainer}>
            <TextInput
              style={[
                styles.input, 
                styles.locationInput,
                disabled && styles.disabledInput,
              ]}
              value={location}
              onChangeText={onLocationChange}
              placeholder={locationPlaceholder || t('flightForm.locationPlaceholder')}
              editable={!disabled}
            />
            {isLoadingLocation && (
              <View style={styles.locationLoadingIndicator}>
                <ActivityIndicator size="small" color="#0066CC" />
              </View>
            )}
          </View>
        </>
      )}

      {/* Interactive Map Selector Modal */}
      <InteractiveMapSelector
        visible={mapSelectorVisible}
        initialCoordinates={getInitialMapCoordinates()}
        onLocationSelect={handleLocationFromMap}
        onClose={() => setMapSelectorVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No default styles - let parent control spacing
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  gpsButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
    gap: 8,
  },
  coordinatesInput: {
    flex: 1,
    marginBottom: 0,
  },
  mapButton: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  locationInput: {
    flex: 1,
    marginBottom: 0,
  },
  locationLoadingIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

