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

interface WebCompatibleDatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export default function WebCompatibleDatePicker({
  label,
  value,
  onDateChange,
  placeholder = "YYYY-MM-DD (e.g. 2024-12-31)",
  error,
  required = false,
}: WebCompatibleDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    value ? new Date(value) : new Date()
  );

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch {
      return placeholder;
    }
  };

  const handleDateSelect = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      onDateChange(dateString);
    }
  };

  const handleWebDateChange = (dateString: string) => {
    onDateChange(dateString);
  };

  const handleOpenPicker = () => {
    setShowPicker(true);
  };

  const handleClosePicker = () => {
    setShowPicker(false);
  };

  const clearDate = () => {
    onDateChange('');
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
          type="date"
          value={value}
          onChange={(e: any) => handleWebDateChange(e.target.value)}
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
        style={[styles.dateButton, error && styles.dateButtonError]}
        onPress={handleOpenPicker}
      >
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {formatDisplayDate(value)}
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
                <TouchableOpacity onPress={clearDate}>
                  <Text style={styles.modalButton}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClosePicker}>
                  <Text style={styles.modalButton}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateSelect}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateSelect}
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  dateButtonError: {
    borderColor: '#ff0000',
  },
  dateText: {
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