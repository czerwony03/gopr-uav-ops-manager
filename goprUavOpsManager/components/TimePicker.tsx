import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimePickerProps {
  label: string;
  value: string; // HH:mm format
  onTimeChange: (time: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export default function TimePicker({
  label,
  value,
  onTimeChange,
  placeholder = "HH:mm (e.g. 14:30)",
  error,
  required = false,
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (value) {
      // Parse HH:mm format to create a Date object
      const [hours, minutes] = value.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    return new Date();
  });

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return placeholder;
    // Validate HH:mm format
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
      return placeholder;
    }
    return timeString;
  };

  const handleTimeSelect = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (time) {
      setSelectedTime(time);
      // Format as HH:mm
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      onTimeChange(timeString);
    }
  };

  const handleWebTimeChange = (timeString: string) => {
    onTimeChange(timeString);
  };

  const handleOpenPicker = () => {
    setShowPicker(true);
  };

  const handleClosePicker = () => {
    setShowPicker(false);
  };

  const clearTime = () => {
    onTimeChange('');
    setShowPicker(false);
  };

  // Web-specific rendering
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        
        {/* @ts-ignore - Web-specific HTML input element */}
        <input
          style={{
            borderWidth: 1,
            borderColor: error ? '#ff0000' : '#ddd',
            borderRadius: 6,
            padding: 12,
            fontSize: 16,
            backgroundColor: '#fff',
            color: '#333',
            width: '100%',
            fontFamily: 'inherit',
            outline: 'none',
          }}
          type="time"
          value={value}
          onChange={(e: any) => handleWebTimeChange(e.target.value)}
          placeholder={placeholder}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // Mobile rendering (iOS/Android)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.timeButton, error && styles.timeButtonError]}
        onPress={handleOpenPicker}
      >
        <Text style={[styles.timeText, !value && styles.placeholderText]}>
          {formatDisplayTime(value)}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showPicker}
          onRequestClose={handleClosePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={clearTime}>
                  <Text style={styles.modalButton}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClosePicker}>
                  <Text style={styles.modalButton}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleTimeSelect}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={handleTimeSelect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  required: {
    color: '#ff0000',
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  timeButtonError: {
    borderColor: '#ff0000',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding for iOS
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalButton: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  iosPicker: {
    height: 200,
  },
});