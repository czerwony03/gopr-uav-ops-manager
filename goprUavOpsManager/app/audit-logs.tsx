import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  Text, 
  View, 
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuditLogService } from '@/services/auditLogService';
import { AuditLog, AuditLogQuery, PaginatedAuditLogResponse, AuditEntityType, AuditAction } from '@/types/AuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function AuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paginationData, setPaginationData] = useState<PaginatedAuditLogResponse | null>(null);
  const crossPlatformAlert = useCrossPlatformAlert();
  
  // Filter states
  const [filters, setFilters] = useState<AuditLogQuery>({
    pageSize: 10,
    pageNumber: 1,
    entityType: undefined,
    action: undefined,
    userEmail: '',
    startDate: undefined,
    endDate: undefined,
  });

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  
  const { user } = useAuth();

  const loadAuditLogs = async (showLoadingIndicator = true, newFilters?: AuditLogQuery) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    
    try {
      const queryParams = newFilters || filters;
      // Clean up empty string filters
      const cleanedParams = {
        ...queryParams,
        userEmail: queryParams.userEmail?.trim() || undefined,
      };
      
      const response = await AuditLogService.getPaginatedAuditLogs(cleanedParams);
      setAuditLogs(response.logs);
      setPaginationData(response);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      crossPlatformAlert.showAlert({ title: 'Error', message: 'Failed to load audit logs' });
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

  const applyFilters = () => {
    const newFilters = {
      ...filters,
      pageNumber: 1, // Reset to first page when applying filters
      startDate: startDateInput ? new Date(startDateInput) : undefined,
      endDate: endDateInput ? new Date(endDateInput) : undefined,
    };
    setFilters(newFilters);
    loadAuditLogs(true, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      pageSize: 10,
      pageNumber: 1,
      entityType: undefined,
      action: undefined,
      userEmail: '',
      startDate: undefined,
      endDate: undefined,
    };
    setFilters(clearedFilters);
    setStartDateInput('');
    setEndDateInput('');
    loadAuditLogs(true, clearedFilters);
  };

  const goToPage = (pageNumber: number) => {
    const newFilters = { ...filters, pageNumber };
    setFilters(newFilters);
    loadAuditLogs(true, newFilters);
  };

  const nextPage = () => {
    if (paginationData?.hasNextPage) {
      goToPage(filters.pageNumber! + 1);
    }
  };

  const previousPage = () => {
    if (paginationData?.hasPreviousPage) {
      goToPage(filters.pageNumber! - 1);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPaginationControls = () => {
    if (!paginationData) return null;

    const { currentPage, totalPages, hasNextPage, hasPreviousPage } = paginationData;
    
    // Generate page numbers to show (show current page and 2 pages on each side)
    const pageNumbers = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages} ({paginationData.totalCount} total)
          </Text>
        </View>
        
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.paginationButton, !hasPreviousPage && styles.paginationButtonDisabled]}
            onPress={previousPage}
            disabled={!hasPreviousPage}
          >
            <Ionicons name="chevron-back" size={16} color={!hasPreviousPage ? '#ccc' : '#007AFF'} />
            <Text style={[styles.paginationButtonText, !hasPreviousPage && styles.paginationButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <View style={styles.pageNumbers}>
            {startPage > 1 && (
              <>
                <TouchableOpacity
                  style={styles.pageNumberButton}
                  onPress={() => goToPage(1)}
                >
                  <Text style={styles.pageNumberText}>1</Text>
                </TouchableOpacity>
                {startPage > 2 && <Text style={styles.pageEllipsis}>...</Text>}
              </>
            )}
            
            {pageNumbers.map(pageNum => (
              <TouchableOpacity
                key={pageNum}
                style={[
                  styles.pageNumberButton,
                  pageNum === currentPage && styles.pageNumberButtonActive
                ]}
                onPress={() => goToPage(pageNum)}
              >
                <Text style={[
                  styles.pageNumberText,
                  pageNum === currentPage && styles.pageNumberTextActive
                ]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <Text style={styles.pageEllipsis}>...</Text>}
                <TouchableOpacity
                  style={styles.pageNumberButton}
                  onPress={() => goToPage(totalPages)}
                >
                  <Text style={styles.pageNumberText}>{totalPages}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.paginationButton, !hasNextPage && styles.paginationButtonDisabled]}
            onPress={nextPage}
            disabled={!hasNextPage}
          >
            <Text style={[styles.paginationButtonText, !hasNextPage && styles.paginationButtonTextDisabled]}>
              Next
            </Text>
            <Ionicons name="chevron-forward" size={16} color={!hasNextPage ? '#ccc' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterControls = () => {
    return (
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.toggleFiltersButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={20} color="#007AFF" />
          <Text style={styles.toggleFiltersText}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filtersContent}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Entity Type:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.entityType || ''}
                  style={styles.picker}
                  onValueChange={(value) => setFilters({...filters, entityType: value as AuditEntityType || undefined})}
                >
                  <Picker.Item label="All" value="" />
                  <Picker.Item label="Drone" value="drone" />
                  <Picker.Item label="Flight" value="flight" />
                  <Picker.Item label="Procedure/Checklist" value="procedureChecklist" />
                  <Picker.Item label="User" value="user" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Action:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.action || ''}
                  style={styles.picker}
                  onValueChange={(value) => setFilters({...filters, action: value as AuditAction || undefined})}
                >
                  <Picker.Item label="All" value="" />
                  <Picker.Item label="Create" value="create" />
                  <Picker.Item label="Edit" value="edit" />
                  <Picker.Item label="Delete" value="delete" />
                  <Picker.Item label="Restore" value="restore" />
                  <Picker.Item label="View" value="view" />
                  <Picker.Item label="Login" value="login" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>User Email:</Text>
              <TextInput
                style={styles.textInput}
                value={filters.userEmail || ''}
                onChangeText={(value) => setFilters({...filters, userEmail: value})}
                placeholder="Enter user email..."
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Start Date:</Text>
              <TextInput
                style={styles.textInput}
                value={startDateInput}
                onChangeText={setStartDateInput}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>End Date:</Text>
              <TextInput
                style={styles.textInput}
                value={endDateInput}
                onChangeText={setEndDateInput}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.filterButtons}>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      return 'Invalid date';
    }
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
      case 'login':
        return <Ionicons name="log-in-outline" size={16} color="#4CAF50" />;
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
      case 'login':
        return '#4CAF50';
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
      case 'user':
        return 'User';
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>System Audit Trail</Text>
          <Text style={styles.subtitle}>
            {paginationData ? `${paginationData.totalCount} total entries` : 'Loading...'}
          </Text>
        </View>

        {renderFilterControls()}
        
        {/* Top Pagination Controls */}
        {renderPaginationControls()}

        {auditLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#9E9E9E" />
            <Text style={styles.emptyText}>No audit logs found</Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {auditLogs.map((log, _index) => (
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

        {/* Bottom Pagination Controls */}
        {renderPaginationControls()}
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
  // Filter styles
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  toggleFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  filtersContent: {
    marginTop: 16,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  // Pagination styles
  paginationContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  paginationButtonTextDisabled: {
    color: '#ccc',
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNumberButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
  },
  pageNumberButtonActive: {
    backgroundColor: '#007AFF',
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pageNumberTextActive: {
    color: 'white',
  },
  pageEllipsis: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 4,
  },
});
