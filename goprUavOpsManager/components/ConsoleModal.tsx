import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConsole, ConsoleMessage } from '@/contexts/ConsoleContext';

const ConsoleModal: React.FC = () => {
  const { messages, clearMessages, isConsoleVisible, hideConsole } = useConsole();

  const getLevelColor = (level: ConsoleMessage['level']) => {
    switch (level) {
      case 'error':
        return '#FF4444';
      case 'warn':
        return '#FFA500';
      case 'info':
        return '#2196F3';
      case 'log':
      default:
        return '#666666';
    }
  };

  const getLevelIcon = (level: ConsoleMessage['level']) => {
    switch (level) {
      case 'error':
        return 'alert-circle';
      case 'warn':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'log':
      default:
        return 'chatbox-ellipses';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const renderMessage = ({ item }: { item: ConsoleMessage }) => (
    <View style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <Ionicons 
          name={getLevelIcon(item.level) as any} 
          size={14} 
          color={getLevelColor(item.level)} 
        />
        <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>
          {item.level.toUpperCase()}
        </Text>
        <Text style={styles.timestampText}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      <Text style={styles.messageText} selectable={true}>
        {item.message}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={isConsoleVisible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug Console</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearMessages}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={hideConsole}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Total: {messages.length} | 
            Errors: {messages.filter(m => m.level === 'error').length} | 
            Warnings: {messages.filter(m => m.level === 'warn').length} |
            Info: {messages.filter(m => m.level === 'info').length}
          </Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No console messages yet</Text>
              <Text style={styles.emptySubtext}>
                Console logs, warnings, and errors will appear here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2D2D2D',
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
  },
  closeButton: {
    backgroundColor: '#6B73FF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2D2D2D',
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  statsText: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: 'bold',
    minWidth: 50,
  },
  timestampText: {
    fontSize: 10,
    color: '#888888',
    marginLeft: 'auto',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ConsoleModal;