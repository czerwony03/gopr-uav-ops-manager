/**
 * Coordinate Utilities
 * 
 * Provides utility functions for working with geographic coordinates.
 * Includes parsing, formatting, validation, and conversion utilities.
 * 
 * Features:
 * - Coordinate string parsing and formatting
 * - Distance calculations between points
 * - Coordinate validation and bounds checking
 * - Different coordinate format support
 * - Geographic utility functions
 * 
 * Usage:
 * ```typescript
 * import { CoordinateUtils } from '@/utils/coordinateUtils';
 * 
 * // Parse coordinates
 * const coords = CoordinateUtils.parse('49.299200, 19.949600');
 * 
 * // Format coordinates
 * const formatted = CoordinateUtils.format({ lat: 49.2992, lng: 19.9496 }, 4);
 * 
 * // Calculate distance
 * const distance = CoordinateUtils.calculateDistance(point1, point2);
 * ```
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CoordinatesBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

export interface DistanceResult {
  /** Distance in meters */
  meters: number;
  /** Distance in kilometers */
  kilometers: number;
  /** Distance in miles */
  miles: number;
}

export class CoordinateUtils {
  /** Earth's radius in kilometers */
  private static readonly EARTH_RADIUS_KM = 6371;
  
  /** Default precision for coordinate formatting */
  private static readonly DEFAULT_PRECISION = 6;
  
  /** Maximum valid latitude */
  private static readonly MAX_LATITUDE = 90;
  
  /** Minimum valid latitude */
  private static readonly MIN_LATITUDE = -90;
  
  /** Maximum valid longitude */
  private static readonly MAX_LONGITUDE = 180;
  
  /** Minimum valid longitude */
  private static readonly MIN_LONGITUDE = -180;

  /**
   * Parse coordinates from various string formats
   * Supports formats: "lat, lng", "lat,lng", "lat lng", "(lat, lng)"
   * @param coordinateString String representation of coordinates
   * @returns Parsed coordinates or null if invalid
   */
  static parse(coordinateString: string): Coordinates | null {
    if (!coordinateString || typeof coordinateString !== 'string') {
      return null;
    }

    try {
      // Clean the string - remove parentheses and extra whitespace
      const cleaned = coordinateString
        .replace(/[()]/g, '')
        .trim();

      // Split by comma, semicolon, or space
      const parts = cleaned.split(/[,;\s]+/).filter(part => part.length > 0);
      
      if (parts.length !== 2) {
        return null;
      }

      const latitude = parseFloat(parts[0]);
      const longitude = parseFloat(parts[1]);

      if (isNaN(latitude) || isNaN(longitude)) {
        return null;
      }

      const coordinates = { latitude, longitude };
      
      // Validate the coordinates
      if (!this.isValid(coordinates)) {
        return null;
      }

      return coordinates;
    } catch (error) {
      console.error('CoordinateUtils: Error parsing coordinates:', error);
      return null;
    }
  }

  /**
   * Format coordinates as a string
   * @param coordinates Coordinates to format
   * @param precision Number of decimal places (default: 6)
   * @param separator Separator between lat and lng (default: ', ')
   * @returns Formatted coordinate string
   */
  static format(coordinates: Coordinates, precision: number = this.DEFAULT_PRECISION, separator: string = ', '): string {
    if (!this.isValid(coordinates)) {
      throw new Error('Invalid coordinates provided');
    }

    return `${coordinates.latitude.toFixed(precision)}${separator}${coordinates.longitude.toFixed(precision)}`;
  }

  /**
   * Validate if coordinates are within valid Earth bounds
   * @param coordinates Coordinates to validate
   * @returns True if coordinates are valid
   */
  static isValid(coordinates: Coordinates): boolean {
    if (!coordinates || typeof coordinates !== 'object') {
      return false;
    }

    const { latitude, longitude } = coordinates;

    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= this.MIN_LATITUDE &&
      latitude <= this.MAX_LATITUDE &&
      longitude >= this.MIN_LONGITUDE &&
      longitude <= this.MAX_LONGITUDE
    );
  }

  /**
   * Check if coordinates are approximately equal within a tolerance
   * @param coords1 First coordinates
   * @param coords2 Second coordinates
   * @param tolerance Tolerance in degrees (default: 0.000001)
   * @returns True if coordinates are approximately equal
   */
  static areEqual(coords1: Coordinates, coords2: Coordinates, tolerance: number = 0.000001): boolean {
    if (!this.isValid(coords1) || !this.isValid(coords2)) {
      return false;
    }

    return (
      Math.abs(coords1.latitude - coords2.latitude) <= tolerance &&
      Math.abs(coords1.longitude - coords2.longitude) <= tolerance
    );
  }

  /**
   * Calculate the distance between two coordinates using the Haversine formula
   * @param coords1 First coordinates
   * @param coords2 Second coordinates
   * @returns Distance in various units
   */
  static calculateDistance(coords1: Coordinates, coords2: Coordinates): DistanceResult {
    if (!this.isValid(coords1) || !this.isValid(coords2)) {
      throw new Error('Invalid coordinates provided for distance calculation');
    }

    // Convert coordinates to radians
    const lat1Rad = this.toRadians(coords1.latitude);
    const lat2Rad = this.toRadians(coords2.latitude);
    const deltaLatRad = this.toRadians(coords2.latitude - coords1.latitude);
    const deltaLngRad = this.toRadians(coords2.longitude - coords1.longitude);

    // Haversine formula
    const a = 
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const kilometers = this.EARTH_RADIUS_KM * c;
    const meters = kilometers * 1000;
    const miles = kilometers * 0.621371;

    return {
      meters: Math.round(meters),
      kilometers: Math.round(kilometers * 1000) / 1000, // Round to 3 decimal places
      miles: Math.round(miles * 1000) / 1000 // Round to 3 decimal places
    };
  }

  /**
   * Get the center point (centroid) of multiple coordinates
   * @param coordinatesArray Array of coordinates
   * @returns Center coordinates or null if empty array
   */
  static getCenter(coordinatesArray: Coordinates[]): Coordinates | null {
    if (!coordinatesArray || coordinatesArray.length === 0) {
      return null;
    }

    if (coordinatesArray.length === 1) {
      return { ...coordinatesArray[0] };
    }

    let totalLat = 0;
    let totalLng = 0;
    let validCount = 0;

    for (const coords of coordinatesArray) {
      if (this.isValid(coords)) {
        totalLat += coords.latitude;
        totalLng += coords.longitude;
        validCount++;
      }
    }

    if (validCount === 0) {
      return null;
    }

    return {
      latitude: totalLat / validCount,
      longitude: totalLng / validCount
    };
  }

  /**
   * Get bounds that encompass all provided coordinates
   * @param coordinatesArray Array of coordinates
   * @returns Bounds or null if no valid coordinates
   */
  static getBounds(coordinatesArray: Coordinates[]): CoordinatesBounds | null {
    if (!coordinatesArray || coordinatesArray.length === 0) {
      return null;
    }

    const validCoords = coordinatesArray.filter(coords => this.isValid(coords));
    if (validCoords.length === 0) {
      return null;
    }

    let minLat = validCoords[0].latitude;
    let maxLat = validCoords[0].latitude;
    let minLng = validCoords[0].longitude;
    let maxLng = validCoords[0].longitude;

    for (const coords of validCoords) {
      minLat = Math.min(minLat, coords.latitude);
      maxLat = Math.max(maxLat, coords.latitude);
      minLng = Math.min(minLng, coords.longitude);
      maxLng = Math.max(maxLng, coords.longitude);
    }

    return {
      northEast: { latitude: maxLat, longitude: maxLng },
      southWest: { latitude: minLat, longitude: minLng }
    };
  }

  /**
   * Check if coordinates are within specified bounds
   * @param coordinates Coordinates to check
   * @param bounds Bounds to check against
   * @returns True if coordinates are within bounds
   */
  static isWithinBounds(coordinates: Coordinates, bounds: CoordinatesBounds): boolean {
    if (!this.isValid(coordinates)) {
      return false;
    }

    const { latitude, longitude } = coordinates;
    const { northEast, southWest } = bounds;

    return (
      latitude >= southWest.latitude &&
      latitude <= northEast.latitude &&
      longitude >= southWest.longitude &&
      longitude <= northEast.longitude
    );
  }

  /**
   * Generate a bounding box around coordinates with a specified radius
   * @param center Center coordinates
   * @param radiusKm Radius in kilometers
   * @returns Bounding box coordinates
   */
  static createBounds(center: Coordinates, radiusKm: number): CoordinatesBounds {
    if (!this.isValid(center) || radiusKm <= 0) {
      throw new Error('Invalid center coordinates or radius');
    }

    // Approximate degrees per km (varies by latitude)
    const latDegreesPerKm = 1 / 111.32;
    const lngDegreesPerKm = 1 / (111.32 * Math.cos(this.toRadians(center.latitude)));

    const latOffset = radiusKm * latDegreesPerKm;
    const lngOffset = radiusKm * lngDegreesPerKm;

    return {
      northEast: {
        latitude: Math.min(center.latitude + latOffset, this.MAX_LATITUDE),
        longitude: Math.min(center.longitude + lngOffset, this.MAX_LONGITUDE)
      },
      southWest: {
        latitude: Math.max(center.latitude - latOffset, this.MIN_LATITUDE),
        longitude: Math.max(center.longitude - lngOffset, this.MIN_LONGITUDE)
      }
    };
  }

  /**
   * Get coordinates for Poland's geographic center (approximate)
   * Useful as a default location for Polish applications
   * @returns Coordinates of Poland's center
   */
  static getPolandCenter(): Coordinates {
    return {
      latitude: 51.9194,
      longitude: 19.1451
    };
  }

  /**
   * Get coordinates for Zakopane (GOPR headquarters area)
   * Useful as a default location for GOPR applications
   * @returns Coordinates of Zakopane
   */
  static getZakopaneCenter(): Coordinates {
    return {
      latitude: 49.2992,
      longitude: 19.9496
    };
  }

  /**
   * Convert degrees to radians
   * @param degrees Degrees to convert
   * @returns Radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   * @param radians Radians to convert
   * @returns Degrees
   */
  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Normalize longitude to be within -180 to 180 range
   * @param longitude Longitude to normalize
   * @returns Normalized longitude
   */
  static normalizeLongitude(longitude: number): number {
    while (longitude > 180) {
      longitude -= 360;
    }
    while (longitude < -180) {
      longitude += 360;
    }
    return longitude;
  }

  /**
   * Create a coordinate object from separate latitude and longitude values
   * @param latitude Latitude value
   * @param longitude Longitude value
   * @returns Coordinates object or null if invalid
   */
  static create(latitude: number, longitude: number): Coordinates | null {
    const coordinates = { latitude, longitude };
    return this.isValid(coordinates) ? coordinates : null;
  }


}