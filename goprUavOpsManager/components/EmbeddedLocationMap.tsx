/**
 * EmbeddedLocationMap Component
 * 
 * A small embedded map component that displays flight coordinates using Leaflet.
 * Provides a quick location preview without opening external map applications.
 * 
 * Features:
 * - Cross-platform compatibility (Web and Mobile)
 * - Small, embedded map display
 * - Marker at specified coordinates
 * - Fallback handling for unsupported platforms
 * - Optimized for flight location display
 * 
 * Usage:
 * ```tsx
 * <EmbeddedLocationMap 
 *   coordinates="49.299200, 19.949600"
 *   height={200}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CoordinateUtils } from '@/utils/coordinateUtils';

interface EmbeddedLocationMapProps {
  coordinates: string;
  height?: number;
  width?: number;
}

export const EmbeddedLocationMap: React.FC<EmbeddedLocationMapProps> = ({
  coordinates,
  height = 200,
  width,
}) => {
  const [WebView, setWebView] = useState<any>(null);
  const parsedCoordinates = CoordinateUtils.parse(coordinates);

  useEffect(() => {
    // Dynamically import WebView for mobile platforms
    if (Platform.OS !== 'web') {
      import('react-native-webview')
        .then((webViewModule) => {
          setWebView(() => webViewModule.WebView);
        })
        .catch((error) => {
          console.error('Failed to load react-native-webview:', error);
        });
    }
  }, []);

  if (!parsedCoordinates) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.errorText}>Invalid coordinates</Text>
      </View>
    );
  }

  const { latitude, longitude } = parsedCoordinates;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Flight Location Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossorigin=""/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossorigin=""></script>
      <style>
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        #map {
          height: 100vh;
          width: 100vw;
        }
        .leaflet-control-attribution {
          font-size: 8px !important;
        }
        .leaflet-control-zoom {
          margin: 5px !important;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        try {
          // Initialize the map
          const map = L.map('map').setView([${latitude}, ${longitude}], 13);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
          }).addTo(map);
          
          // Add marker at flight location
          const marker = L.marker([${latitude}, ${longitude}])
            .addTo(map)
            .bindPopup('<b>Flight Location</b><br/>Lat: ${latitude}<br/>Lng: ${longitude}');
          
          // Disable map interaction for embedded view
          map.dragging.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();
          
          // Show popup on load
          marker.openPopup();
          
        } catch (error) {
          console.error('Error initializing embedded map:', error);
          document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; color: #666;">Map unavailable</div>';
        }
      </script>
    </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    // Web platform - use iframe
    return (
      <View style={[styles.container, { height, width }]}>
        <iframe
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #ddd',
            borderRadius: 8,
          }}
          title="Flight Location Map"
        />
      </View>
    );
  }

  // Mobile platforms - use WebView if available
  if (WebView) {
    return (
      <View style={[styles.container, { height, width }]}>
        <WebView
          source={{ html: mapHtml }}
          style={styles.webView}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
          onError={(error) => {
            console.error('WebView error in EmbeddedLocationMap:', error);
          }}
        />
      </View>
    );
  }

  // Fallback when WebView is not available
  return (
    <View style={[styles.container, { height, width }]}>
      <Text style={styles.errorText}>
        Map not available on this platform
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});