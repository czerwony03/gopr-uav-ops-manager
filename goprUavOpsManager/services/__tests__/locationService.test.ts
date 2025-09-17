// Mock all external dependencies first
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import { LocationService, LocationCoordinates } from '../locationService';

// Get references to mocked functions
const mockLocation = Location as jest.Mocked<typeof Location>;

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 49.2992,
        longitude: 19.9496,
        altitude: 650,
        accuracy: 5,
        heading: 0,
        speed: 0,
        altitudeAccuracy: 10,
      },
      timestamp: Date.now(),
    });
    mockLocation.reverseGeocodeAsync.mockResolvedValue([{
      name: 'Test Location',
      street: 'Test Street',
      streetNumber: '123',
      city: 'Zakopane',
      postalCode: '34-500',
      region: 'Lesser Poland',
      country: 'Poland',
      district: 'Tatra',
      subregion: 'Tatra County',
      timezone: 'Europe/Warsaw',
      isoCountryCode: 'PL',
      formattedAddress: 'Test Street 123, 34-500 Zakopane, Poland',
    }]);

    // Mock fetch for external geocoding API
    global.fetch = jest.fn();
  });

  describe('getCurrentLocation', () => {
    test('should get current GPS location successfully', async () => {
      const result = await LocationService.getCurrentLocation();

      expect(result).toEqual({
        coordinates: {
          latitude: 49.2992,
          longitude: 19.9496,
        },
        address: expect.any(String),
      });
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalled();
    });

    test('should throw error when location permission denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      await expect(LocationService.getCurrentLocation()).rejects.toThrow(
        'Location permission denied'
      );
    });

    test('should handle GPS retrieval failure', async () => {
      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'));

      await expect(LocationService.getCurrentLocation()).rejects.toThrow(
        'Failed to get current location'
      );
    });

    test('should work without reverse geocoding', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const result = await LocationService.getCurrentLocation();

      expect(result.coordinates).toEqual({
        latitude: 49.2992,
        longitude: 19.9496,
      });
      expect(result.address).toBeUndefined();
    });
  });

  describe('reverseGeocode', () => {
    const testCoordinates: LocationCoordinates = {
      latitude: 49.2992,
      longitude: 19.9496,
    };

    test('should reverse geocode coordinates successfully using Expo API', async () => {
      const result = await LocationService.reverseGeocode(testCoordinates);

      expect(result).toContain('34-500');
      expect(result).toContain('Zakopane');
      expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledWith(testCoordinates);
    });

    test('should fallback to OpenStreetMap when Expo API fails', async () => {
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('Expo API failed'));
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          display_name: 'Zakopane, Tatra County, Lesser Poland, 34-500, Poland',
          address: {
            postcode: '34-500',
            city: 'Zakopane',
            road: 'Test Street',
            house_number: '123',
            state: 'Lesser Poland',
            country: 'Poland',
          }
        })
      } as any);

      const result = await LocationService.reverseGeocode(testCoordinates, { useFallback: true });

      expect(result).toContain('Zakopane');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org'),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    test('should handle invalid coordinates gracefully', async () => {
      const invalidCoordinates = { latitude: 999, longitude: 999 };
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const result = await LocationService.reverseGeocode(invalidCoordinates);

      expect(result).toBeNull();
    });

    test('should respect timeout option', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 2000));
      mockLocation.reverseGeocodeAsync.mockReturnValue(slowPromise as any);

      await expect(
        LocationService.reverseGeocode(testCoordinates, { timeout: 100 })
      ).rejects.toThrow();
    });

    test('should disable fallback when useFallback is false', async () => {
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('Expo API failed'));

      const result = await LocationService.reverseGeocode(testCoordinates, { useFallback: false });

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('parseCoordinates', () => {
    test('should parse valid coordinate string formats', async () => {
      const testCases = [
        { input: '49.2992, 19.9496', expected: { latitude: 49.2992, longitude: 19.9496 } },
        { input: '49.2992,19.9496', expected: { latitude: 49.2992, longitude: 19.9496 } },
        { input: '  49.2992  ,  19.9496  ', expected: { latitude: 49.2992, longitude: 19.9496 } },
        { input: '-33.8688, 151.2093', expected: { latitude: -33.8688, longitude: 151.2093 } },
        { input: '0, 0', expected: { latitude: 0, longitude: 0 } },
      ];

      for (const testCase of testCases) {
        const result = LocationService.parseCoordinates(testCase.input);
        expect(result).toEqual(testCase.expected);
      }
    });

    test('should return null for invalid coordinate formats', async () => {
      const invalidInputs = [
        '',
        'not coordinates',
        '49.2992',
        '49.2992, ',
        ', 19.9496',
        '999, 999', // Out of valid range
        'abc, def',
        '49.2992, 19.9496, 123', // Too many parts
      ];

      for (const input of invalidInputs) {
        const result = LocationService.parseCoordinates(input);
        expect(result).toBeNull();
      }
    });

    test('should handle edge cases for coordinate ranges', async () => {
      const edgeCases = [
        { input: '90, 180', expected: { latitude: 90, longitude: 180 } },
        { input: '-90, -180', expected: { latitude: -90, longitude: -180 } },
        { input: '90.1, 180', expected: null }, // Out of range
        { input: '90, 180.1', expected: null }, // Out of range
      ];

      for (const testCase of edgeCases) {
        const result = LocationService.parseCoordinates(testCase.input);
        expect(result).toEqual(testCase.expected);
      }
    });
  });

  describe('formatCoordinates', () => {
    test('should format coordinates with default precision', async () => {
      const coordinates = { latitude: 49.2992123456, longitude: 19.9496789012 };
      const result = LocationService.formatCoordinates(coordinates);

      expect(result).toBe('49.299212, 19.949679');
    });

    test('should format coordinates with custom precision', async () => {
      const coordinates = { latitude: 49.2992123456, longitude: 19.9496789012 };
      const result = LocationService.formatCoordinates(coordinates, 2);

      expect(result).toBe('49.30, 19.95');
    });

    test('should handle zero coordinates', async () => {
      const coordinates = { latitude: 0, longitude: 0 };
      const result = LocationService.formatCoordinates(coordinates);

      expect(result).toBe('0.000000, 0.000000');
    });

    test('should handle negative coordinates', async () => {
      const coordinates = { latitude: -33.8688, longitude: -151.2093 };
      const result = LocationService.formatCoordinates(coordinates, 4);

      expect(result).toBe('-33.8688, -151.2093');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network timeout for external geocoding', async () => {
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('Network error'));
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 50)
        )
      );

      const result = await LocationService.reverseGeocode(
        { latitude: 49.2992, longitude: 19.9496 },
        { useFallback: true, timeout: 100 }
      );

      expect(result).toBeNull();
    });

    test('should handle malformed external API response', async () => {
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('Expo failed'));
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ invalid: 'response' })
      } as any);

      const result = await LocationService.reverseGeocode(
        { latitude: 49.2992, longitude: 19.9496 },
        { useFallback: true }
      );

      expect(result).toBeNull();
    });

    test('should handle GPS sensor unavailability', async () => {
      mockLocation.getCurrentPositionAsync.mockRejectedValue(
        new Error('GPS sensor not available')
      );

      await expect(LocationService.getCurrentLocation()).rejects.toThrow(
        'Failed to get current location'
      );
    });
  });

  describe('Address Formatting', () => {
    test('should format Polish addresses correctly', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValue([{
        name: 'Gubałówka',
        street: 'Gubałówka',
        streetNumber: '1',
        city: 'Zakopane',
        postalCode: '34-500',
        region: 'Lesser Poland',
        country: 'Poland',
        district: 'Tatra',
        subregion: 'Tatra County',
        timezone: 'Europe/Warsaw',
        isoCountryCode: 'PL',
        formattedAddress: 'Gubałówka 1, 34-500 Zakopane, Poland',
      }]);

      const result = await LocationService.reverseGeocode({
        latitude: 49.2992,
        longitude: 19.9496
      });

      expect(result).toContain('34-500');
      expect(result).toContain('Zakopane');
      expect(result).toContain('Lesser Poland');
      expect(result).toContain('Poland');
    });

    test('should handle addresses with missing components', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValue([{
        name: 'Remote Location',
        city: 'Unknown City',
        country: 'Poland',
        // Missing postal code, street, region
      } as any]);

      const result = await LocationService.reverseGeocode({
        latitude: 49.2992,
        longitude: 19.9496
      });

      expect(result).toContain('Unknown City');
      expect(result).toContain('Poland');
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });
  });

  describe('Performance and Caching', () => {
    test('should handle multiple concurrent requests', async () => {
      const coordinates = { latitude: 49.2992, longitude: 19.9496 };
      const promises = Array(5).fill(null).map(() => 
        LocationService.reverseGeocode(coordinates)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toContain('Zakopane');
      });
      expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(5);
    });

    test('should handle rapid sequential requests', async () => {
      const coordinates = [
        { latitude: 49.2992, longitude: 19.9496 },
        { latitude: 50.0647, longitude: 19.9450 },
        { latitude: 52.2297, longitude: 21.0122 },
      ];

      for (const coord of coordinates) {
        const result = await LocationService.reverseGeocode(coord);
        expect(result).toBeTruthy();
      }

      expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(3);
    });
  });
});