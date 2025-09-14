/**
 * Map Utilities
 * 
 * Provides utility functions for working with maps and generating map URLs.
 * Includes Google Maps URL generation and coordinate-based map functionality.
 * 
 * Features:
 * - Google Maps URL generation from coordinates
 * - Map platform-specific URL handling
 * - Coordinate validation for map operations
 * - Cross-platform map integration utilities
 * 
 * Usage:
 * ```typescript
 * import { MapUtils } from '@/utils/mapUtils';
 * 
 * // Generate Google Maps URL
 * const url = MapUtils.generateGoogleMapsUrl('49.299200, 19.949600');
 * 
 * // Open coordinates in map
 * MapUtils.openInGoogleMaps(coordinates);
 * ```
 */

import { CoordinateUtils, Coordinates } from './coordinateUtils';
import { Linking, Platform } from 'react-native';

export class MapUtils {
  /**
   * Generate Google Maps URL from coordinate string
   * @param coordinatesString String representation of coordinates (lat, lng)
   * @returns Google Maps URL or null if coordinates are invalid
   */
  static generateGoogleMapsUrl(coordinatesString: string): string | null {
    if (!coordinatesString || typeof coordinatesString !== 'string') {
      return null;
    }

    const coordinates = CoordinateUtils.parse(coordinatesString);
    if (!coordinates) {
      return null;
    }

    return this.generateGoogleMapsUrlFromCoordinates(coordinates);
  }

  /**
   * Generate Google Maps URL from coordinates object
   * @param coordinates Coordinates object with latitude and longitude
   * @returns Google Maps URL
   */
  static generateGoogleMapsUrlFromCoordinates(coordinates: Coordinates): string {
    if (!CoordinateUtils.isValid(coordinates)) {
      throw new Error('Invalid coordinates provided');
    }

    const { latitude, longitude } = coordinates;
    return `https://maps.google.com/maps?q=${latitude},${longitude}&z=15`;
  }

  /**
   * Open coordinates in Google Maps application or web browser
   * @param coordinatesString String representation of coordinates
   * @returns Promise that resolves when the map is opened or rejects if unable to open
   */
  static async openInGoogleMaps(coordinatesString: string): Promise<void> {
    const url = this.generateGoogleMapsUrl(coordinatesString);
    if (!url) {
      throw new Error('Invalid coordinates provided');
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Unable to open maps application');
      }
    } catch (error) {
      console.error('MapUtils: Error opening Google Maps:', error);
      throw error;
    }
  }

  /**
   * Open coordinates from coordinates object in Google Maps
   * @param coordinates Coordinates object with latitude and longitude
   * @returns Promise that resolves when the map is opened or rejects if unable to open
   */
  static async openCoordinatesInGoogleMaps(coordinates: Coordinates): Promise<void> {
    if (!CoordinateUtils.isValid(coordinates)) {
      throw new Error('Invalid coordinates provided');
    }

    const coordinatesString = CoordinateUtils.format(coordinates);
    return this.openInGoogleMaps(coordinatesString);
  }

  /**
   * Get platform-specific Google Maps app URL scheme
   * Falls back to web URL if app is not available
   * @param coordinates Coordinates object
   * @returns Platform-optimized URL for Google Maps
   */
  static getPlatformOptimizedMapsUrl(coordinates: Coordinates): string {
    if (!CoordinateUtils.isValid(coordinates)) {
      throw new Error('Invalid coordinates provided');
    }

    const { latitude, longitude } = coordinates;

    if (Platform.OS === 'ios') {
      // iOS: Try Google Maps app first, fallback to Apple Maps
      return `comgooglemaps://?q=${latitude},${longitude}&zoom=15`;
    } else if (Platform.OS === 'android') {
      // Android: Try Google Maps app
      return `geo:${latitude},${longitude}?q=${latitude},${longitude}&z=15`;
    } else {
      // Web or other platforms: Use web URL
      return this.generateGoogleMapsUrlFromCoordinates(coordinates);
    }
  }

  /**
   * Open coordinates using platform-optimized method
   * @param coordinatesString String representation of coordinates
   * @returns Promise that resolves when the map is opened
   */
  static async openInPlatformOptimizedMaps(coordinatesString: string): Promise<void> {
    const coordinates = CoordinateUtils.parse(coordinatesString);
    if (!coordinates) {
      throw new Error('Invalid coordinates provided');
    }

    try {
      let url: string;
      
      if (Platform.OS === 'ios') {
        // Try Google Maps app first
        const googleMapsUrl = this.getPlatformOptimizedMapsUrl(coordinates);
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
        
        if (canOpenGoogleMaps) {
          url = googleMapsUrl;
        } else {
          // Fallback to Apple Maps
          url = `http://maps.apple.com/?q=${coordinates.latitude},${coordinates.longitude}&z=15`;
        }
      } else if (Platform.OS === 'android') {
        // Android geo intent
        url = this.getPlatformOptimizedMapsUrl(coordinates);
      } else {
        // Web fallback
        url = this.generateGoogleMapsUrlFromCoordinates(coordinates);
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error('MapUtils: Error opening platform-optimized maps:', error);
      // Fallback to standard Google Maps URL
      await this.openInGoogleMaps(coordinatesString);
    }
  }

  /**
   * Validate if coordinates string can be used for map operations
   * @param coordinatesString String representation of coordinates
   * @returns True if coordinates are valid for maps
   */
  static canGenerateMapUrl(coordinatesString: string): boolean {
    return this.generateGoogleMapsUrl(coordinatesString) !== null;
  }

  /**
   * Get a formatted coordinate display string for UI
   * @param coordinatesString String representation of coordinates
   * @returns Formatted coordinates string or null if invalid
   */
  static getDisplayCoordinates(coordinatesString: string): string | null {
    const coordinates = CoordinateUtils.parse(coordinatesString);
    if (!coordinates) {
      return null;
    }

    return CoordinateUtils.format(coordinates, 6);
  }

  /**
   * Create a shareable map link with location description
   * @param coordinatesString String representation of coordinates
   * @param locationName Optional location name for the link
   * @returns Formatted share text with map link
   */
  static createShareableMapLink(coordinatesString: string, locationName?: string): string | null {
    const url = this.generateGoogleMapsUrl(coordinatesString);
    if (!url) {
      return null;
    }

    if (locationName) {
      return `${locationName}: ${url}`;
    } else {
      const displayCoords = this.getDisplayCoordinates(coordinatesString);
      return `Location (${displayCoords}): ${url}`;
    }
  }
}