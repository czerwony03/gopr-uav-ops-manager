import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface MapSelectorProps {
  visible: boolean;
  initialCoordinates?: { latitude: number; longitude: number };
  onLocationSelect: (coordinates: { latitude: number; longitude: number }) => void;
  onClose: () => void;
}

export default function MapSelector({ 
  visible, 
  initialCoordinates, 
  onLocationSelect, 
  onClose 
}: MapSelectorProps) {
  const { t } = useTranslation('common');
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialCoordinates || null
  );

  const { width, height } = Dimensions.get('window');

  // Default to Zakopane, Poland (GOPR headquarters area) if no initial coordinates
  const defaultLat = initialCoordinates?.latitude || 49.2992;
  const defaultLng = initialCoordinates?.longitude || 19.9496;
  const defaultZoom = 13;

  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords);
      onClose();
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'coordinatesSelected' && data.coordinates) {
        setSelectedCoords({
          latitude: data.coordinates.lat,
          longitude: data.coordinates.lng,
        });
      }
    } catch (error) {
      console.error('MapSelector: Error parsing message from WebView:', error);
    }
  };

  // HTML for the interactive map using OpenStreetMap and Leaflet
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Map Selector</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        #map { 
          height: 100vh; 
          width: 100vw; 
        }
        .info-panel {
          position: absolute;
          top: 10px;
          left: 10px;
          background: white;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 1000;
          max-width: 250px;
        }
        .coordinates {
          font-weight: bold;
          color: #0066CC;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="info-panel">
        <div>${t('map.selectLocation', 'Tap on the map to select a location')}</div>
        <div class="coordinates" id="coordinates">
          ${selectedCoords ? 
            `${selectedCoords.latitude.toFixed(6)}, ${selectedCoords.longitude.toFixed(6)}` : 
            t('map.noLocationSelected', 'No location selected')
          }
        </div>
      </div>
      <div id="map"></div>

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Initialize the map
        const map = L.map('map').setView([${defaultLat}, ${defaultLng}], ${defaultZoom});
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        let marker = null;
        const coordinatesEl = document.getElementById('coordinates');

        // Add initial marker if coordinates provided
        ${selectedCoords ? `
        marker = L.marker([${selectedCoords.latitude}, ${selectedCoords.longitude}]).addTo(map);
        map.setView([${selectedCoords.latitude}, ${selectedCoords.longitude}], ${defaultZoom});
        ` : ''}

        // Handle map clicks
        map.on('click', function(e) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          
          // Remove existing marker
          if (marker) {
            map.removeLayer(marker);
          }
          
          // Add new marker
          marker = L.marker([lat, lng]).addTo(map);
          
          // Update coordinates display
          coordinatesEl.textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
          
          // Send coordinates to React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'coordinatesSelected',
              coordinates: { lat: lat, lng: lng }
            }));
          }
        });

        // Prevent zoom on double tap for better mobile experience
        map.doubleClickZoom.disable();
      </script>
    </body>
    </html>
  `;

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
          <Text style={styles.headerTitle}>{t('map.selectLocation', 'Select Location')}</Text>
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

        <WebView
          source={{ html: mapHtml }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={Platform.OS === 'android'}
          mixedContentMode="compatibility"
          originWhitelist={['*']}
        />

        {selectedCoords && (
          <View style={styles.coordsDisplay}>
            <Text style={styles.coordsText}>
              {t('map.selectedCoordinates', 'Selected:')} {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
            </Text>
          </View>
        )}
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
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
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
  coordsDisplay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  coordsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    textAlign: 'center',
  },
});