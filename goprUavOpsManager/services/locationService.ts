/**
 * Location Service
 * 
 * Provides reusable location and geocoding functionality for the application.
 * Handles GPS location retrieval, reverse geocoding, and coordinate formatting.
 * 
 * Features:
 * - GPS location retrieval with permission handling
 * - Reverse geocoding using Expo's built-in API and OpenStreetMap Nominatim fallback
 * - Standardized address formatting: Postal code, City, Street, voivodeship, country
 * - Cross-platform support (Web, Android, iOS)
 * - Error handling with detailed logging
 * - Coordinate validation and parsing
 * 
 * Usage:
 * ```typescript
 * import { LocationService } from '@/services/locationService';
 * 
 * // Get current GPS location
 * const location = await LocationService.getCurrentLocation();
 * 
 * // Reverse geocode coordinates to address
 * const address = await LocationService.reverseGeocode({ latitude: 49.2992, longitude: 19.9496 });
 * 
 * // Parse coordinate string
 * const coords = LocationService.parseCoordinates('49.299200, 19.949600');
 * ```
 */

import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coordinates: LocationCoordinates;
  address?: string;
}

export interface ReverseGeocodeOptions {
  /** Whether to use fallback geocoding if primary fails */
  useFallback?: boolean;
  /** Timeout in milliseconds for geocoding requests */
  timeout?: number;
}

export class LocationService {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly USER_AGENT = 'GOPRUAVOpsManager/1.0';

  /**
   * Request location permissions from the user
   * @returns Promise resolving to permission status
   */
  static async requestLocationPermission(): Promise<Location.PermissionStatus> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }

  /**
   * Get current GPS location
   * @returns Promise resolving to current coordinates
   * @throws Error if permission denied or location unavailable
   */
  static async getCurrentLocation(): Promise<LocationCoordinates> {
    console.log('LocationService: Requesting location permissions...');
    
    const status = await this.requestLocationPermission();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location permission denied');
    }

    console.log('LocationService: Getting current position...');
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    console.log('LocationService: Got coordinates:', coordinates);
    return coordinates;
  }

  /**
   * Get current location with address
   * @param options Reverse geocoding options
   * @returns Promise resolving to location with coordinates and address
   */
  static async getCurrentLocationWithAddress(options?: ReverseGeocodeOptions): Promise<LocationResult> {
    const coordinates = await this.getCurrentLocation();
    const address = await this.reverseGeocode(coordinates, options);
    
    return {
      coordinates,
      address,
    };
  }

  /**
   * Parse coordinates from string format
   * @param coordinatesString String in format "lat, lng" or "lat,lng"
   * @returns Parsed coordinates or null if invalid
   */
  static parseCoordinates(coordinatesString: string): LocationCoordinates | null {
    if (!coordinatesString || !coordinatesString.trim()) {
      return null;
    }

    try {
      const coords = coordinatesString.split(',').map(c => parseFloat(c.trim()));
      if (coords.length !== 2 || coords.some(c => isNaN(c))) {
        return null;
      }

      const [latitude, longitude] = coords;
      
      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
      }

      return { latitude, longitude };
    } catch (error) {
      console.error('LocationService: Error parsing coordinates:', error);
      return null;
    }
  }

  /**
   * Format coordinates as string
   * @param coordinates Coordinates to format
   * @param precision Number of decimal places (default: 6)
   * @returns Formatted coordinate string
   */
  static formatCoordinates(coordinates: LocationCoordinates, precision: number = 6): string {
    return `${coordinates.latitude.toFixed(precision)}, ${coordinates.longitude.toFixed(precision)}`;
  }

  /**
   * Perform reverse geocoding using Expo's built-in API
   * @param coordinates Coordinates to reverse geocode
   * @returns Formatted address string or null if failed
   */
  private static async reverseGeocodeWithExpo(coordinates: LocationCoordinates): Promise<string | null> {
    try {
      console.log('LocationService: Trying Expo reverse geocoding for:', coordinates);
      
      const reverseGeocodedAddress = await Location.reverseGeocodeAsync(coordinates);

      if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
        const address = reverseGeocodedAddress[0];
        
        console.log('LocationService: Expo geocoding response:', address);
        
        // Format address in the requested order: Postal code, City, Street, voivodeship, country (if available)
        const parts: string[] = [];
        
        // Add postal code first
        if (address.postalCode) parts.push(address.postalCode);
        
        // Add city
        if (address.city) parts.push(address.city);
        
        // Add street (combine street number and street name if available)
        const streetParts = [];
        if (address.street) streetParts.push(address.street);
        if (address.streetNumber) streetParts.push(address.streetNumber);
        if (streetParts.length > 0) {
          parts.push(streetParts.join(' '));
        }
        
        // Add voivodeship (region in Poland context)
        if (address.region && address.region !== address.city) parts.push(address.region);
        
        // Add country
        if (address.country && address.country !== address.region) parts.push(address.country);
        
        if (parts.length > 0) {
          const formattedAddress = parts.join(', ');
          console.log('LocationService: Formatted Expo address:', formattedAddress);
          return formattedAddress;
        }
      }
      
      console.log('LocationService: Expo geocoding returned no useful data');
      return null;
    } catch (error) {
      console.error('LocationService: Expo reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Perform reverse geocoding using OpenStreetMap Nominatim API
   * @param coordinates Coordinates to reverse geocode
   * @param timeout Timeout in milliseconds
   * @returns Formatted address string or null if failed
   */
  private static async reverseGeocodeWithNominatim(coordinates: LocationCoordinates, timeout: number = this.DEFAULT_TIMEOUT): Promise<string | null> {
    try {
      console.log('LocationService: Trying Nominatim reverse geocoding for:', coordinates);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': this.USER_AGENT
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('LocationService: Nominatim response:', data);
      
      if (data && data.address) {
        // Format address in the requested order: Postal code, City, Street, voivodeship, country (if available)
        const addr = data.address;
        const parts: string[] = [];
        
        // Add postal code first
        if (addr.postcode) parts.push(addr.postcode);
        
        // Add city (try multiple city fields)
        const city = addr.city || addr.town || addr.village || addr.municipality;
        if (city) parts.push(city);
        
        // Add street (combine house number and street)
        const streetParts = [];
        if (addr.road) streetParts.push(addr.road);
        if (addr.house_number) streetParts.push(addr.house_number);
        if (streetParts.length > 0) {
          parts.push(streetParts.join(' '));
        }
        
        // Add voivodeship (state/region)
        const voivodeship = addr.state || addr.region;
        if (voivodeship && voivodeship !== city) parts.push(voivodeship);
        
        // Add country
        if (addr.country && addr.country !== voivodeship) parts.push(addr.country);
        
        if (parts.length > 0) {
          const formattedAddress = parts.join(', ');
          console.log('LocationService: Formatted Nominatim address:', formattedAddress);
          return formattedAddress;
        }
      }
      
      if (data && data.display_name) {
        // Fallback to display name if address components are not available
        let address = data.display_name;
        
        // Remove postal codes and coordinates from the display name
        address = address.replace(/\d{2}-\d{3}/g, ''); // Remove Polish postal codes
        address = address.replace(/\b\d{5}\b/g, ''); // Remove US postal codes
        address = address.replace(/,\s*,/g, ','); // Remove double commas
        address = address.replace(/^,\s*|,\s*$/g, ''); // Remove leading/trailing commas
        address = address.trim();
        
        console.log('LocationService: Cleaned Nominatim display name:', address);
        return address;
      }
      
      return null;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('LocationService: Nominatim request timed out');
      } else {
        console.error('LocationService: Nominatim reverse geocoding failed:', error);
      }
      return null;
    }
  }

  /**
   * Perform reverse geocoding to get address from coordinates
   * @param coordinates Coordinates to reverse geocode
   * @param options Geocoding options
   * @returns Formatted address string or coordinates as fallback
   */
  static async reverseGeocode(coordinates: LocationCoordinates, options?: ReverseGeocodeOptions): Promise<string> {
    const { useFallback = true, timeout = this.DEFAULT_TIMEOUT } = options || {};
    
    console.log('LocationService: Starting reverse geocoding for:', coordinates);
    
    // Try Expo's built-in reverse geocoding first
    const expoResult = await this.reverseGeocodeWithExpo(coordinates);
    if (expoResult) {
      return expoResult;
    }
    
    // Try fallback geocoding if enabled
    if (useFallback) {
      console.log('LocationService: Expo geocoding failed, trying fallback...');
      const nominatimResult = await this.reverseGeocodeWithNominatim(coordinates, timeout);
      if (nominatimResult) {
        return nominatimResult;
      }
    }
    
    // Final fallback: return coordinates as string
    console.log('LocationService: All geocoding methods failed, returning coordinates');
    return this.formatCoordinates(coordinates);
  }

  /**
   * Validate if coordinates are within reasonable bounds for Earth
   * @param coordinates Coordinates to validate
   * @returns True if coordinates are valid
   */
  static validateCoordinates(coordinates: LocationCoordinates): boolean {
    const { latitude, longitude } = coordinates;
    return (
      typeof latitude === 'number' && 
      typeof longitude === 'number' &&
      !isNaN(latitude) && 
      !isNaN(longitude) &&
      latitude >= -90 && 
      latitude <= 90 &&
      longitude >= -180 && 
      longitude <= 180
    );
  }
}