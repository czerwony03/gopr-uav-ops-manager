import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { FlightService } from '@/services/flightService';
import { DroneService } from '@/services/droneService';
import { Flight, FlightQuery, PaginatedFlightResponse, AVAILABLE_FLIGHT_CATEGORIES, AVAILABLE_ACTIVITY_TYPES, FlightCategory, ActivityType } from '@/types/Flight';
import { Drone } from '@/types/Drone';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { formatFlightDurationCompact } from '@/src/utils/flightUtils';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import OfflineInfoBar from '@/components/OfflineInfoBar';

export default function FlightsListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const { isConnected } = useNetworkStatus();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paginationData, setPaginationData] = useState<PaginatedFlightResponse | null>(null);
  const [drones, setDrones] = useState<Drone[]>([]);

  // Filter states
  const [filters, setFilters] = useState<FlightQuery>({
    pageSize: 10,
    pageNumber: 1,
    startDate: undefined,
    endDate: undefined,
    flightCategory: undefined,
    activityType: undefined,
    userEmail: '',
    droneId: undefined,
  });

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  const fetchFlights = useCallback(async (showLoadingIndicator = true, newFilters?: FlightQuery) => {
    if (!user) return;

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

      const response = await FlightService.getPaginatedFlights(user.role, user.uid, cleanedParams);
      setFlights(response.flights);
      setPaginationData(response);
    } catch (error) {
      console.error('Error fetching flights:', error);
      crossPlatformAlert.showAlert({ title: t('common.error'), message: t('flights.errors.fetchFailed') });
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [user, filters, t]);

  const fetchDrones = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedDrones = await DroneService.getDrones(user.role);
      setDrones(fetchedDrones);
    } catch (error) {
      console.error('Error fetching drones:', error);
      // Don't show error alert for drones as it's not critical
    }
  }, [user]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchFlights();
      fetchDrones();
    }
  }, [fetchFlights, fetchDrones, user]);

  // Refresh flights when the screen comes into focus (e.g., returning from flight form)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchFlights();
      }
    }, [fetchFlights, user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFlights(false);
  };

  const applyFilters = () => {
    const newFilters = {
      ...filters,
      pageNumber: 1, // Reset to first page when applying filters
      startDate: startDateInput ? new Date(startDateInput) : undefined,
      endDate: endDateInput ? new Date(endDateInput) : undefined,
    };
    setFilters(newFilters);
    fetchFlights(true, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      pageSize: 10,
      pageNumber: 1,
      startDate: undefined,
      endDate: undefined,
      flightCategory: undefined,
      activityType: undefined,
      userEmail: '',
      droneId: undefined,
    };
    setFilters(clearedFilters);
    setStartDateInput('');
    setEndDateInput('');
    fetchFlights(true, clearedFilters);
  };

  const goToPage = (pageNumber: number) => {
    const newFilters = { ...filters, pageNumber };
    setFilters(newFilters);
    fetchFlights(true, newFilters);
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

  const formatTime = (timeStr: string): string => {
    try {
      // Handle both old format (HH:mm) and new format (datetime string)
      if (timeStr.includes('T') || timeStr.includes('Z')) {
        // New datetime format
        const date = new Date(timeStr);
        return date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else if (timeStr.match(/^\d{2}:\d{2}$/)) {
        // Old HH:mm format
        return timeStr;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const formatDateTime = (timeStr: string): string => {
    try {
      // Handle both old format (HH:mm) and new format (datetime string)
      if (timeStr.includes('T') || timeStr.includes('Z')) {
        // New datetime format
        const date = new Date(timeStr);
        const datePart = date.toLocaleDateString('en-GB');
        const timePart = date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        return `${datePart} ${timePart}`;
      } else if (timeStr.match(/^\d{2}:\d{2}$/)) {
        // Old HH:mm format - just return time
        return timeStr;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const canEditFlight = (flight: Flight): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || flight.userId === user.uid;
  };

  const handleEditFlight = (flightId: string) => {
    if (!isButtonDisabled()) {
      router.push(`/flights/${flightId}/edit`);
    }
  };

  const handleViewFlight = (flightId: string) => {
    router.push(`/flights/${flightId}`);
  };

  const handleAddFlight = () => {
    if (!isButtonDisabled()) {
      router.push('/flights/create');
    }
  };

  const renderFlightItem = ({ item }: { item: Flight }) => {
    // Check if flight crosses midnight (end date different from start date)
    const startDateTime = item.startTime.includes('T') ? new Date(item.startTime) : null;
    const endDateTime = item.endTime.includes('T') ? new Date(item.endTime) : null;
    const crossesMidnight = startDateTime && endDateTime && 
      startDateTime.toDateString() !== endDateTime.toDateString();

    return (
      <View style={styles.flightCard}>
        <View style={styles.flightHeader}>
          <Text style={styles.flightDate}>{item.date}</Text>
          <Text style={styles.flightTime}>
            {crossesMidnight ? (
              `${formatDateTime(item.startTime)} - ${formatDateTime(item.endTime)}`
            ) : (
              `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`
            )}
          </Text>
        </View>
      
      <View style={styles.flightInfo}>
        <Text style={styles.flightLocation}>{item.location}</Text>
        <Text style={styles.droneName}>{item.droneName || item.droneId}</Text>
      </View>

      <View style={styles.flightDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('flights.category')}:</Text>
          <Text style={styles.detailValue}>{item.flightCategory}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('flights.operation')}:</Text>
          <Text style={styles.detailValue}>{item.operationType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('flights.activity')}:</Text>
          <Text style={styles.detailValue}>{item.activityType}</Text>
        </View>
        {item.conditions ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('flights.conditions')}:</Text>
            <Text style={styles.detailValue}>{item.conditions}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('common.totalTime')}:</Text>
          <Text style={styles.detailValue}>{formatFlightDurationCompact(item.startTime, item.endTime)}</Text>
        </View>
        {(user?.role === 'admin' || user?.role === 'manager') && item.userEmail ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('flights.operator')}:</Text>
            <Text style={styles.detailValue}>{item.userEmail}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewFlight(item.id)}
        >
          <Text style={styles.viewButtonText}>{t('common.view')}</Text>
        </TouchableOpacity>
        
        {canEditFlight(item) ? (
          <TouchableOpacity
            style={[styles.editButton, getDisabledStyle()]}
            onPress={() => handleEditFlight(item.id)}
            disabled={isButtonDisabled()}
          >
            <Text style={[styles.editButtonText, isButtonDisabled() && { color: '#999' }]}>
              {t('common.edit')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      </View>
    );
  };

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
            {startPage > 1 ? (
              <>
                <TouchableOpacity
                  style={styles.pageNumberButton}
                  onPress={() => goToPage(1)}
                >
                  <Text style={styles.pageNumberText}>1</Text>
                </TouchableOpacity>
                {startPage > 2 && <Text style={styles.ellipsis}>...</Text>}
              </>
            ) : null}

            {pageNumbers.map((page) => (
              <TouchableOpacity
                key={page}
                style={[
                  styles.pageNumberButton,
                  currentPage === page && styles.pageNumberButtonActive
                ]}
                onPress={() => goToPage(page)}
              >
                <Text style={[
                  styles.pageNumberText,
                  currentPage === page && styles.pageNumberTextActive
                ]}>
                  {page}
                </Text>
              </TouchableOpacity>
            ))}

            {endPage < totalPages ? (
              <>
                {endPage < totalPages - 1 && <Text style={styles.ellipsis}>...</Text>}
                <TouchableOpacity
                  style={styles.pageNumberButton}
                  onPress={() => goToPage(totalPages)}
                >
                  <Text style={styles.pageNumberText}>{totalPages}</Text>
                </TouchableOpacity>
              </>
            ) : null}
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

        {showFilters ? (
          <View style={styles.filtersContent}>
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

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Category:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.flightCategory || ''}
                  style={styles.picker}
                  onValueChange={(value) => setFilters({...filters, flightCategory: (value as FlightCategory) || undefined})}
                >
                  <Picker.Item label="All" value="" />
                  {AVAILABLE_FLIGHT_CATEGORIES.map((category) => (
                    <Picker.Item key={category} label={category} value={category} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Activity:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.activityType || ''}
                  style={styles.picker}
                  onValueChange={(value) => setFilters({...filters, activityType: (value as ActivityType) || undefined})}
                >
                  <Picker.Item label="All" value="" />
                  {AVAILABLE_ACTIVITY_TYPES.map((activity) => (
                    <Picker.Item key={activity} label={activity} value={activity} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Drone:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.droneId || ''}
                  style={styles.picker}
                  onValueChange={(value) => setFilters({...filters, droneId: value || undefined})}
                >
                  <Picker.Item label="All" value="" />
                  {drones.map((drone) => (
                    <Picker.Item key={drone.id} label={`${drone.name} (${drone.registrationNumber})`} value={drone.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {(user?.role === 'admin' || user?.role === 'manager') ? (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Operator Email:</Text>
                <TextInput
                  style={styles.textInput}
                  value={filters.userEmail || ''}
                  onChangeText={(value) => setFilters({...filters, userEmail: value})}
                  placeholder="Enter operator email..."
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : null}

            <View style={styles.filterButtons}>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline info bar */}
      <OfflineInfoBar 
        visible={!isConnected} 
        message={t('offline.noConnection')}
      />
      
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.addButton, getDisabledStyle()]} 
            onPress={handleAddFlight}
            disabled={isButtonDisabled()}
          >
            <Text style={[styles.addButtonText, isButtonDisabled() && { color: '#999' }]}>
              + {t('flights.add')}
            </Text>
          </TouchableOpacity>
        </View>

        {renderFilterControls()}

        {flights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('flights.noFlightsFound')}</Text>
            <Text style={styles.emptySubtext}>
              {t('flights.tapAddFlightToStart')}
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={flights}
              renderItem={renderFlightItem}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.listContainer}
              nestedScrollEnabled={true}
            />
            {renderPaginationControls()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  flightCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flightDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  flightTime: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  flightInfo: {
    marginBottom: 12,
  },
  flightLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  droneName: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  flightDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  viewButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Filter styles
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
  ellipsis: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 4,
  },
});
