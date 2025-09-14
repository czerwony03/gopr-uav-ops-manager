/**
 * InteractiveMapSelector Component
 * 
 * A reusable cross-platform interactive map component for coordinate selection.
 * Uses OpenStreetMap tiles and Leaflet for web and WebView for mobile platforms.
 * 
 * Features:
 * - Interactive map with tap-to-select functionality
 * - Cross-platform support (Web via iframe, Mobile via WebView)
 * - Real-time coordinate display and validation
 * - Marker placement and movement
 * - Default locations for GOPR/Poland region
 * - No API keys required (uses OpenStreetMap)
 * - Full modal interface with confirm/cancel actions
 * - Internationalization support
 * 
 * Platform Implementation:
 * - Web: Uses iframe with embedded Leaflet map
 * - Mobile: Uses WebView with react-native-webview
 * - Fallback: Shows error message when WebView unavailable
 * 
 * Usage:
 * ```tsx
 * <InteractiveMapSelector
 *   visible={isVisible}
 *   initialCoordinates={{ latitude: 49.2992, longitude: 19.9496 }}
 *   onLocationSelect={(coords) => handleSelection(coords)}
 *   onClose={() => setVisible(false)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LocationCoordinates } from '@/services/locationService';
import { CoordinateUtils } from '@/utils/coordinateUtils';

interface InteractiveMapSelectorProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Initial coordinates to center the map and place marker */
  initialCoordinates?: LocationCoordinates;
  /** Callback when user selects coordinates */
  onLocationSelect: (coordinates: LocationCoordinates) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Custom zoom level (default: 13) */
  zoom?: number;
  /** Whether to show coordinates in header (default: true) */
  showCoordinates?: boolean;
}

export default function InteractiveMapSelector({ 
  visible, 
  initialCoordinates, 
  onLocationSelect, 
  onClose,
  zoom = 13,
  showCoordinates = true,
}: InteractiveMapSelectorProps) {
  const { t } = useTranslation('common');
  const [selectedCoords, setSelectedCoords] = useState<LocationCoordinates | null>(
    initialCoordinates || null
  );
  const [WebView, setWebView] = useState<any>(null);

  // Try to load WebView component for mobile platforms
  useEffect(() => {
    const loadWebView = async () => {
      if (Platform.OS !== 'web') {
        try {
          const ReactNativeWebView = await import('react-native-webview');
          setWebView(() => ReactNativeWebView.WebView);
        } catch (error) {
          console.log('InteractiveMapSelector: WebView not available:', error);
        }
      }
    };
    loadWebView();
  }, []);

  // Update selected coordinates when initial coordinates change
  useEffect(() => {
    if (initialCoordinates) {
      setSelectedCoords(initialCoordinates);
    }
  }, [initialCoordinates]);

  // Removed unused dimensions since the map is handled by CSS in the WebView
  // const { width, height } = Dimensions.get('window');

  // Default to Zakopane, Poland (GOPR headquarters area) if no initial coordinates
  const defaultCoords = initialCoordinates || CoordinateUtils.getZakopaneCenter();

  const handleConfirm = () => {
    if (selectedCoords && CoordinateUtils.isValid(selectedCoords)) {
      onLocationSelect(selectedCoords);
      onClose();
    }
  };

  // Handle messages from mobile WebView
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'coordinatesSelected' && data.coordinates) {
        const coords = {
          latitude: data.coordinates.lat,
          longitude: data.coordinates.lng,
        };
        
        if (CoordinateUtils.isValid(coords)) {
          setSelectedCoords(coords);
        }
      }
    } catch (error) {
      console.error('InteractiveMapSelector: Error parsing message from WebView:', error);
    }
  };

  // Handle messages from web iframe
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleWebMessage = (event: any) => {
        if (event.data && event.data.type === 'coordinatesSelected' && event.data.coordinates) {
          const coords = {
            latitude: event.data.coordinates.lat,
            longitude: event.data.coordinates.lng,
          };
          
          if (CoordinateUtils.isValid(coords)) {
            setSelectedCoords(coords);
          }
        }
      };

      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [visible]);

  // Generate HTML for the interactive map using OpenStreetMap and Leaflet
  const generateMapHtml = () => {
    const coordsForMap = selectedCoords || defaultCoords;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Interactive Map Selector</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          overflow: hidden;
        }
        #map { 
          height: 100vh; 
          width: 100vw; 
        }
        .info-panel {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(255, 255, 255, 0.95);
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 1000;
          max-width: 280px;
          backdrop-filter: blur(4px);
        }
        .instruction {
          font-size: 14px;
          color: #333;
          margin-bottom: 8px;
        }
        .coordinates {
          font-weight: bold;
          color: #0066CC;
          font-size: 13px;
          font-family: 'Courier New', monospace;
        }
        .marker-info {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 102, 204, 0.9);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
      </style>
    </head>
    <body>
      <div class="info-panel">
        <div class="instruction">${t('map.selectLocation', 'Tap on the map to select a location')}</div>
        <div class="coordinates" id="coordinates">
          ${selectedCoords ? 
            CoordinateUtils.format(selectedCoords, 6) : 
            t('map.noLocationSelected', 'No location selected')
          }
        </div>
      </div>
      <div id="map"></div>
      <div class="marker-info" id="markerInfo" style="display: none;">
        ${t('map.markerPlaced', 'Marker placed')}
      </div>

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Initialize the map
        const map = L.map('map').setView([${defaultCoords.latitude}, ${defaultCoords.longitude}], ${zoom});
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        let marker = null;
        const coordinatesEl = document.getElementById('coordinates');
        const markerInfoEl = document.getElementById('markerInfo');

        // Add initial marker if coordinates provided
        ${coordsForMap ? `
        marker = L.marker([${coordsForMap.latitude}, ${coordsForMap.longitude}])
          .addTo(map)
          .bindPopup('Selected location')
          .openPopup();
        ` : ''}

        // Show marker info temporarily
        function showMarkerInfo() {
          markerInfoEl.style.display = 'block';
          setTimeout(() => {
            markerInfoEl.style.display = 'none';
          }, 2000);
        }

        // Handle map clicks
        map.on('click', function(e) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          
          // Validate coordinates
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return;
          }
          
          // Remove existing marker
          if (marker) {
            map.removeLayer(marker);
          }
          
          // Add new marker with popup
          marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(\`Selected: \${lat.toFixed(6)}, \${lng.toFixed(6)}\`)
            .openPopup();
          
          // Update coordinates display
          coordinatesEl.textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
          
          // Show marker placement feedback
          showMarkerInfo();
          
          // Send coordinates to React Native or parent window
          const messageData = {
            type: 'coordinatesSelected',
            coordinates: { lat: lat, lng: lng }
          };
          
          try {
            if (window.ReactNativeWebView) {
              // Mobile: Send to React Native WebView
              window.ReactNativeWebView.postMessage(JSON.stringify(messageData));
            } else if (window.parent !== window) {
              // Web: Send to parent window
              window.parent.postMessage(messageData, '*');
            }
          } catch (error) {
            console.error('Error sending coordinates:', error);
          }
        });

        // Disable default double-click zoom for better mobile experience
        map.doubleClickZoom.disable();
        
        // Add scale control
        L.control.scale({
          metric: true,
          imperial: false,
          position: 'bottomright'
        }).addTo(map);
        
        // Ensure map renders properly
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      </script>
    </body>
    </html>
    `;
  };

  const renderMapContent = () => {
    if (Platform.OS === 'web') {
      // Web implementation using iframe
      const mapHtml = generateMapHtml();
      const mapUrl = `data:text/html,${encodeURIComponent(mapHtml)}`;
      
      return (
        <iframe
          src={mapUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Interactive Map Selector"
        />
      );
    } else if (WebView) {
      // Mobile implementation using WebView
      return (
        <WebView
          source={{ html: generateMapHtml() }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={Platform.OS === 'android'}
          mixedContentMode="compatibility"
          originWhitelist={['*']}
          onError={(error: any) => {
            console.error('InteractiveMapSelector: WebView error:', error);
          }}
        />
      );
    } else {
      // Fallback for when WebView is not available
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="map-outline" size={48} color="#ccc" />
          <Text style={styles.errorText}>
            {t('map.notAvailable', 'Interactive map is not available on this platform')}
          </Text>
          <Text style={styles.errorSubText}>
            {t('map.useCoordinatesInput', 'Please use the coordinates input field instead')}
          </Text>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {t('map.selectLocation', 'Select Location')}
            </Text>
            {showCoordinates && selectedCoords && (
              <Text style={styles.headerCoordinates}>
                {CoordinateUtils.format(selectedCoords, 6)}
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.confirmButton, !selectedCoords && styles.disabledButton]} 
            onPress={handleConfirm}
            disabled={!selectedCoords}
          >
            <Text style={[styles.confirmText, !selectedCoords && styles.disabledText]}>
              {t('common.ok', 'OK')}
            </Text>
          </TouchableOpacity>
        </View>

        {renderMapContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 70,
  },
  closeButton: {
    padding: 8,
    minWidth: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerCoordinates: {
    fontSize: 12,
    color: '#0066CC',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  confirmButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 50,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#666',
  },
  webView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});