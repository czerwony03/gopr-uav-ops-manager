import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { ReportService } from '@/services/reportService';
import { UserService } from '@/services/userService';
import { DroneService } from '@/services/droneService';
import {
  ReportType,
  ReportFilter,
  TimeRangeType,
  FlightSummary,
  DroneSummary,
  ExportFormat,
} from '@/types/Report';
import { User } from '@/types/User';
import { Drone } from '@/types/Drone';
import { useCrossPlatformAlert } from '@/components/CrossPlatformAlert';

export default function ReportsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();

  const [reportType, setReportType] = useState<ReportType>('flight-summary');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [timeRange, setTimeRange] = useState<TimeRangeType>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDroneId, setSelectedDroneId] = useState<string>('');

  // Data states
  const [flightSummary, setFlightSummary] = useState<FlightSummary | null>(null);
  const [droneSummaries, setDroneSummaries] = useState<DroneSummary[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);

  // Fetch users and drones for filters
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Only admin and manager can see all users
        if (user.role === 'admin' || user.role === 'manager') {
          const fetchedUsers = await UserService.getAllUsers();
          setUsers(fetchedUsers);
        }

        const fetchedDrones = await DroneService.getDrones(user.role);
        setDrones(fetchedDrones);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };

    fetchData();
  }, [user]);

  const generateReport = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const filter: ReportFilter = {
        timeRange,
        month: timeRange === 'month' ? selectedMonth : undefined,
        year: timeRange === 'year' || timeRange === 'month' ? selectedYear : undefined,
        userId: selectedUserId || undefined,
        droneId: selectedDroneId || undefined,
      };

      if (reportType === 'flight-summary') {
        const summary = await ReportService.generateFlightSummary(filter, user.role, user.uid);
        setFlightSummary(summary);
        setDroneSummaries([]);
      } else {
        const summaries = await ReportService.generateDroneSummary(filter, user.role, user.uid);
        setDroneSummaries(summaries);
        setFlightSummary(null);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: t('reports.errors.generateFailed'),
      });
    } finally {
      setLoading(false);
    }
  }, [user, reportType, timeRange, selectedMonth, selectedYear, selectedUserId, selectedDroneId, t, crossPlatformAlert]);

  const exportReport = useCallback(async (format: ExportFormat) => {
    if (!user) return;

    setExporting(true);
    try {
      const filter: ReportFilter = {
        timeRange,
        month: timeRange === 'month' ? selectedMonth : undefined,
        year: timeRange === 'year' || timeRange === 'month' ? selectedYear : undefined,
        userId: selectedUserId || undefined,
        droneId: selectedDroneId || undefined,
      };

      let fileUri: string;

      if (reportType === 'flight-summary' && flightSummary) {
        if (format === 'xlsx') {
          fileUri = await ReportService.exportFlightSummaryToXLSX(flightSummary, filter, user.email);
        } else {
          fileUri = await ReportService.exportFlightSummaryToPDF(flightSummary, filter, user.email);
        }
      } else if (reportType === 'drone-summary' && droneSummaries.length > 0) {
        if (format === 'xlsx') {
          fileUri = await ReportService.exportDroneSummaryToXLSX(droneSummaries, filter, user.email);
        } else {
          fileUri = await ReportService.exportDroneSummaryToPDF(droneSummaries, filter, user.email);
        }
      } else {
        crossPlatformAlert.showAlert({
          title: t('common.warning'),
          message: t('reports.errors.noData'),
        });
        return;
      }

      await ReportService.shareFile(fileUri);
      
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('reports.exportSuccess'),
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: t('reports.errors.exportFailed'),
      });
    } finally {
      setExporting(false);
    }
  }, [user, reportType, timeRange, selectedMonth, selectedYear, selectedUserId, selectedDroneId, flightSummary, droneSummaries, t, crossPlatformAlert]);

  // Generate years array for picker (last 10 years)
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  if (!user) {
    return null;
  }

  // Check permissions
  const canViewAllReports = user.role === 'admin' || user.role === 'manager';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('reports.title'),
          headerStyle: {
            backgroundColor: '#0066CC',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reports.reportType')}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={reportType}
              onValueChange={(value) => setReportType(value as ReportType)}
              style={styles.picker}
            >
              <Picker.Item label={t('reports.flightSummary')} value="flight-summary" />
              <Picker.Item label={t('reports.droneSummary')} value="drone-summary" />
            </Picker>
          </View>
        </View>

        {/* Time Range Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reports.timeRange')}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={timeRange}
              onValueChange={(value) => setTimeRange(value as TimeRangeType)}
              style={styles.picker}
            >
              <Picker.Item label={t('reports.timeRangeAll')} value="all" />
              <Picker.Item label={t('reports.timeRangeMonth')} value="month" />
              <Picker.Item label={t('reports.timeRangeYear')} value="year" />
            </Picker>
          </View>
        </View>

        {/* Month Selection */}
        {timeRange === 'month' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reports.selectMonth')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value) => setSelectedMonth(value)}
                style={styles.picker}
              >
                {months.map((month) => (
                  <Picker.Item
                    key={month}
                    label={new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                    value={month}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Year Selection */}
        {(timeRange === 'year' || timeRange === 'month') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reports.selectYear')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => setSelectedYear(value)}
                style={styles.picker}
              >
                {years.map((year) => (
                  <Picker.Item key={year} label={year.toString()} value={year} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* User Filter (Admin/Manager only) */}
        {canViewAllReports && users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reports.filterByUser')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedUserId}
                onValueChange={(value) => setSelectedUserId(value)}
                style={styles.picker}
              >
                <Picker.Item label={t('reports.allUsers')} value="" />
                {users.map((u) => (
                  <Picker.Item
                    key={u.uid}
                    label={`${u.firstname || ''} ${u.surname || ''} (${u.email})`.trim()}
                    value={u.uid}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Drone Filter */}
        {drones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reports.filterByDrone')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDroneId}
                onValueChange={(value) => setSelectedDroneId(value)}
                style={styles.picker}
              >
                <Picker.Item label={t('reports.allDrones')} value="" />
                {drones.map((drone) => (
                  <Picker.Item
                    key={drone.id}
                    label={`${drone.name} (${drone.inventoryCode})`}
                    value={drone.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics-outline" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>{t('reports.generateReport')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Flight Summary Results */}
        {flightSummary && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>{t('reports.flightSummary')}</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('reports.totalFlights')}</Text>
                <Text style={styles.summaryValue}>{flightSummary.totalFlights}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('reports.totalDuration')}</Text>
                <Text style={styles.summaryValue}>{flightSummary.totalDurationFormatted}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('reports.averageDuration')}</Text>
                <Text style={styles.summaryValue}>{flightSummary.averageDurationFormatted}</Text>
              </View>
            </View>

            {canViewAllReports && flightSummary.flightsByUser.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>{t('reports.byUser')}</Text>
                {flightSummary.flightsByUser.map((userStat, index) => (
                  <View key={index} style={styles.detailCard}>
                    <Text style={styles.detailName}>{userStat.userName || userStat.userEmail}</Text>
                    <Text style={styles.detailInfo}>
                      {userStat.totalFlights} {t('reports.flights')} • {userStat.totalDurationFormatted}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {flightSummary.flightsByDrone.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>{t('reports.byDrone')}</Text>
                {flightSummary.flightsByDrone.map((droneStat, index) => (
                  <View key={index} style={styles.detailCard}>
                    <Text style={styles.detailName}>{droneStat.droneName}</Text>
                    <Text style={styles.detailInfo}>
                      {droneStat.totalFlights} {t('reports.flights')} • {droneStat.totalDurationFormatted}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {flightSummary.flightsByMonth.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>{t('reports.byMonth')}</Text>
                {flightSummary.flightsByMonth.map((monthStat, index) => (
                  <View key={index} style={styles.detailCard}>
                    <Text style={styles.detailName}>{monthStat.month}</Text>
                    <Text style={styles.detailInfo}>
                      {monthStat.totalFlights} {t('reports.flights')} • {monthStat.totalDurationFormatted}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Export Buttons */}
            <View style={styles.exportSection}>
              <Text style={styles.exportTitle}>{t('reports.exportAs')}</Text>
              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => exportReport('xlsx')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator color="#0066CC" size="small" />
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={20} color="#0066CC" />
                      <Text style={styles.exportButtonText}>XLSX</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => exportReport('pdf')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator color="#0066CC" size="small" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={20} color="#0066CC" />
                      <Text style={styles.exportButtonText}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Drone Summary Results */}
        {droneSummaries.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>{t('reports.droneSummary')}</Text>
            
            {droneSummaries.map((drone, index) => (
              <View key={index} style={styles.droneCard}>
                <Text style={styles.droneName}>{drone.droneName}</Text>
                <Text style={styles.droneCode}>{drone.inventoryCode}</Text>
                <View style={styles.droneStats}>
                  <View style={styles.droneStat}>
                    <Text style={styles.droneStatLabel}>{t('reports.totalFlights')}</Text>
                    <Text style={styles.droneStatValue}>{drone.totalFlights}</Text>
                  </View>
                  <View style={styles.droneStat}>
                    <Text style={styles.droneStatLabel}>{t('reports.totalDuration')}</Text>
                    <Text style={styles.droneStatValue}>{drone.totalDurationFormatted}</Text>
                  </View>
                  <View style={styles.droneStat}>
                    <Text style={styles.droneStatLabel}>{t('reports.lastFlight')}</Text>
                    <Text style={styles.droneStatValue}>{drone.lastFlightDate || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Export Buttons */}
            <View style={styles.exportSection}>
              <Text style={styles.exportTitle}>{t('reports.exportAs')}</Text>
              <View style={styles.exportButtons}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => exportReport('xlsx')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator color="#0066CC" size="small" />
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={20} color="#0066CC" />
                      <Text style={styles.exportButtonText}>XLSX</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => exportReport('pdf')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator color="#0066CC" size="small" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={20} color="#0066CC" />
                      <Text style={styles.exportButtonText}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  detailInfo: {
    fontSize: 14,
    color: '#666',
  },
  droneCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  droneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 4,
  },
  droneCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  droneStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  droneStat: {
    flex: 1,
  },
  droneStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  droneStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  exportSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
    minWidth: 120,
  },
  exportButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
