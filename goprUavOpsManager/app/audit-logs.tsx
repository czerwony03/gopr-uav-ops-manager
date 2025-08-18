import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  Text, 
  View, 
  ActivityIndicator,
  Alert,
  RefreshControl 
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuditLogService } from '../services/auditLogService';
import { AuditLog } from '../types/AuditLog';
import { useAuth } from '../contexts/AuthContext';

export default function AuditLogsScreen() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadAuditLogs = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    
    try {
      const logs = await AuditLogService.getRecentAuditLogs(100);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      Alert.alert('Error', 'Failed to load audit logs');
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuditLogs(false);
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Ionicons name="add-circle-outline" size={16} color="#4CAF50" />;
      case 'edit':
        return <Ionicons name="pencil-outline" size={16} color="#FF9800" />;
      case 'delete':
        return <Ionicons name="trash-outline" size={16} color="#F44336" />;
      case 'restore':
        return <Ionicons name="refresh-outline" size={16} color="#2196F3" />;
      case 'view':
        return <Ionicons name="eye-outline" size={16} color="#9E9E9E" />;
      default:
        return <Ionicons name="ellipse-outline" size={16} color="#9E9E9E" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return '#4CAF50';
      case 'edit':
        return '#FF9800';
      case 'delete':
        return '#F44336';
      case 'restore':
        return '#2196F3';
      case 'view':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getEntityTypeDisplay = (entityType: string) => {
    switch (entityType) {
      case 'drone':
        return 'Drone';
      case 'flight':
        return 'Flight';
      case 'procedureChecklist':
        return 'Procedure/Checklist';
      default:
        return entityType;
    }
  };

  // Only show to admins
  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Audit Logs' }} />
        <View style={styles.unauthorized}>
          <Ionicons name="lock-closed-outline" size={48} color="#9E9E9E" />
          <Text style={styles.unauthorizedText}>
            You don&apos;t have permission to view audit logs.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Audit Logs' }} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading audit logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Audit Logs' }} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>System Audit Trail</Text>
          <Text style={styles.subtitle}>
            Complete history of all changes ({auditLogs.length} entries)
          </Text>
        </View>

        {auditLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#9E9E9E" />
            <Text style={styles.emptyText}>No audit logs found</Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {auditLogs.map((log, index) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <View style={styles.actionBadge}>
                    {getActionIcon(log.action)}
                    <Text style={[styles.actionText, { color: getActionColor(log.action) }]}>
                      {log.action.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(log.timestamp)}
                  </Text>
                </View>
                
                <View style={styles.logDetails}>
                  <Text style={styles.entityType}>
                    {getEntityTypeDisplay(log.entityType)}
                  </Text>
                  <Text style={styles.description}>
                    {log.details || `${log.action} ${log.entityType}`}
                  </Text>
                  <Text style={styles.user}>
                    by {log.userEmail || 'Unknown User'}
                  </Text>
                  <Text style={styles.metadata}>
                    {log.applicationPlatform} • v{log.applicationVersion}
                    {log.commitHash && ` • ${log.commitHash.substring(0, 7)}`}
                  </Text>
                </View>

                {log.entityId && (
                  <Text style={styles.entityId}>
                    ID: {log.entityId}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  unauthorized: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unauthorizedText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  logsList: {
    gap: 12,
  },
  logItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  logDetails: {
    marginBottom: 8,
  },
  entityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  user: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  metadata: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  entityId: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});