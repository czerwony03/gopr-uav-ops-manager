import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Alert as RNAlert,
} from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CrossPlatformAlertProps {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  visible: boolean;
  onDismiss: () => void;
}

// Custom Alert Modal for Web
function WebAlertModal({ title, message, buttons = [], visible, onDismiss }: CrossPlatformAlertProps) {
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>{title}</Text>
          {message && <Text style={styles.alertMessage}>{message}</Text>}
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  buttons.length === 1 && styles.singleButton,
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text
                  style={[
                    styles.alertButtonText,
                    button.style === 'destructive' && styles.destructiveButtonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Cross-platform Alert utility
class CrossPlatformAlert {
  private static webAlertComponent: React.ComponentType<CrossPlatformAlertProps> | null = null;
  private static webAlertProps: CrossPlatformAlertProps | null = null;
  private static setWebAlertProps: ((props: CrossPlatformAlertProps | null) => void) | null = null;

  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: any
  ) {
    if (Platform.OS === 'web') {
      // Use custom modal for web
      if (this.setWebAlertProps) {
        const defaultButtons: AlertButton[] = buttons && buttons.length > 0 
          ? buttons 
          : [{ text: 'OK', style: 'default' }];

        this.setWebAlertProps({
          title,
          message,
          buttons: defaultButtons,
          visible: true,
          onDismiss: () => {
            if (this.setWebAlertProps) {
              this.setWebAlertProps(null);
            }
          },
        });
      }
    } else {
      // Use native Alert for mobile
      RNAlert.alert(title, message, buttons, options);
    }
  }

  static setWebAlertHandler(
    setProps: (props: CrossPlatformAlertProps | null) => void
  ) {
    this.setWebAlertProps = setProps;
  }
}

// Provider component for Web alerts
export function CrossPlatformAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertProps, setAlertProps] = useState<CrossPlatformAlertProps | null>(null);

  React.useEffect(() => {
    CrossPlatformAlert.setWebAlertHandler(setAlertProps);
    return () => {
      CrossPlatformAlert.setWebAlertHandler(() => {});
    };
  }, []);

  return (
    <>
      {children}
      {Platform.OS === 'web' && alertProps && (
        <WebAlertModal
          {...alertProps}
          onDismiss={() => setAlertProps(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  singleButton: {
    flex: 1,
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: '#fff',
  },
});

// Hook for using CrossPlatformAlert in components
export function useCrossPlatformAlert() {
  const showAlert = React.useCallback((options: {
    title: string;
    message?: string;
    buttons?: AlertButton[];
    options?: any;
  }) => {
    CrossPlatformAlert.alert(options.title, options.message, options.buttons, options.options);
  }, []);

  return React.useMemo(() => ({
    showAlert
  }), [showAlert]);
}

export default CrossPlatformAlert;