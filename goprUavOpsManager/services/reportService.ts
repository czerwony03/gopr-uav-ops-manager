import { Flight, FlightCategory, ActivityType } from '@/types/Flight';
import { Drone } from '@/types/Drone';
import { User } from '@/types/User';
import { UserRole } from '@/types/UserRole';
import {
  ReportFilter,
  FlightSummary,
  DroneSummary,
  ReportExportData,
  ExportFormat,
} from '@/types/Report';
import { FlightService } from './flightService';
import { DroneService } from './droneService';
import { UserService } from './userService';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export class ReportService {
  /**
   * Format duration in minutes to human-readable string
   */
  private static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (mins > 0) {
      return `${mins}min`;
    } else {
      return '0min';
    }
  }

  /**
   * Calculate flight duration in minutes
   */
  private static calculateFlightDurationMinutes(startTime: string, endTime: string): number {
    if (!startTime || !endTime) {
      return 0;
    }

    try {
      let startDateTime: Date;
      let endDateTime: Date;

      // Handle both old format (HH:mm) and new format (datetime string)
      if (startTime.includes('T') || startTime.includes('Z')) {
        startDateTime = new Date(startTime);
        endDateTime = new Date(endTime);
      } else if (startTime.match(/^\d{2}:\d{2}$/)) {
        const today = new Date().toISOString().split('T')[0];
        startDateTime = new Date(`${today}T${startTime}:00`);
        endDateTime = new Date(`${today}T${endTime}:00`);
        
        if (endDateTime <= startDateTime) {
          endDateTime = new Date(endDateTime.getTime() + (24 * 60 * 60 * 1000));
        }
      } else {
        return 0;
      }
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return 0;
      }
      
      if (endDateTime <= startDateTime) {
        return 0;
      }

      const durationMs = endDateTime.getTime() - startDateTime.getTime();
      return Math.round(durationMs / (1000 * 60));
    } catch {
      return 0;
    }
  }

  /**
   * Filter flights based on report filter
   */
  private static filterFlights(flights: Flight[], filter: ReportFilter): Flight[] {
    return flights.filter(flight => {
      // Filter by time range
      const flightDate = new Date(flight.date);
      
      if (filter.timeRange === 'month' && filter.month && filter.year) {
        const flightMonth = flightDate.getMonth() + 1;
        const flightYear = flightDate.getFullYear();
        if (flightMonth !== filter.month || flightYear !== filter.year) {
          return false;
        }
      } else if (filter.timeRange === 'year' && filter.year) {
        const flightYear = flightDate.getFullYear();
        if (flightYear !== filter.year) {
          return false;
        }
      } else if (filter.timeRange === 'custom' && filter.startDate && filter.endDate) {
        const startDate = new Date(filter.startDate);
        const endDate = new Date(filter.endDate);
        if (flightDate < startDate || flightDate > endDate) {
          return false;
        }
      }

      // Filter by user
      if (filter.userId && flight.userId !== filter.userId) {
        return false;
      }

      // Filter by drone
      if (filter.droneId && flight.droneId !== filter.droneId) {
        return false;
      }

      // Filter by flight category
      if (filter.flightCategory && flight.flightCategory !== filter.flightCategory) {
        return false;
      }

      // Filter by activity type
      if (filter.activityType && flight.activityType !== filter.activityType) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate flight summary report
   */
  static async generateFlightSummary(
    filter: ReportFilter,
    userRole: UserRole,
    currentUserId: string
  ): Promise<FlightSummary> {
    // Fetch all flights based on user role
    const allFlights = await FlightService.getFlights(userRole, currentUserId);
    
    // Filter flights based on report filter
    const filteredFlights = this.filterFlights(allFlights, filter);

    // Calculate total duration
    let totalDuration = 0;
    filteredFlights.forEach(flight => {
      totalDuration += this.calculateFlightDurationMinutes(flight.startTime, flight.endTime);
    });

    const averageDuration = filteredFlights.length > 0 ? totalDuration / filteredFlights.length : 0;

    // Group by category
    const flightsByCategory: Record<string, number> = {};
    filteredFlights.forEach(flight => {
      flightsByCategory[flight.flightCategory] = (flightsByCategory[flight.flightCategory] || 0) + 1;
    });

    // Group by activity
    const flightsByActivity: Record<string, number> = {};
    filteredFlights.forEach(flight => {
      flightsByActivity[flight.activityType] = (flightsByActivity[flight.activityType] || 0) + 1;
    });

    // Group by user
    const userMap = new Map<string, { userId: string; userEmail: string; userName: string; flights: Flight[] }>();
    filteredFlights.forEach(flight => {
      if (!userMap.has(flight.userId)) {
        userMap.set(flight.userId, {
          userId: flight.userId,
          userEmail: flight.userEmail || '',
          userName: '',
          flights: [],
        });
      }
      userMap.get(flight.userId)!.flights.push(flight);
    });

    // Fetch user names for admin/manager reports
    const flightsByUser: FlightSummary['flightsByUser'] = [];
    for (const [userId, userData] of userMap.entries()) {
      try {
        const user = await UserService.getUser(userId);
        userData.userName = user ? `${user.firstname || ''} ${user.surname || ''}`.trim() || 'Unknown' : 'Unknown';
      } catch {
        userData.userName = 'Unknown';
      }

      let userDuration = 0;
      userData.flights.forEach(flight => {
        userDuration += this.calculateFlightDurationMinutes(flight.startTime, flight.endTime);
      });

      flightsByUser.push({
        userId: userData.userId,
        userEmail: userData.userEmail,
        userName: userData.userName,
        totalFlights: userData.flights.length,
        totalDuration: userDuration,
        totalDurationFormatted: this.formatDuration(userDuration),
      });
    }

    // Group by drone
    const droneMap = new Map<string, { droneId: string; droneName: string; flights: Flight[] }>();
    filteredFlights.forEach(flight => {
      if (!droneMap.has(flight.droneId)) {
        droneMap.set(flight.droneId, {
          droneId: flight.droneId,
          droneName: flight.droneName || flight.droneId,
          flights: [],
        });
      }
      droneMap.get(flight.droneId)!.flights.push(flight);
    });

    const flightsByDrone: FlightSummary['flightsByDrone'] = [];
    for (const [droneId, droneData] of droneMap.entries()) {
      let droneDuration = 0;
      droneData.flights.forEach(flight => {
        droneDuration += this.calculateFlightDurationMinutes(flight.startTime, flight.endTime);
      });

      flightsByDrone.push({
        droneId: droneData.droneId,
        droneName: droneData.droneName,
        totalFlights: droneData.flights.length,
        totalDuration: droneDuration,
        totalDurationFormatted: this.formatDuration(droneDuration),
      });
    }

    // Group by month
    const monthMap = new Map<string, Flight[]>();
    filteredFlights.forEach(flight => {
      const flightDate = new Date(flight.date);
      const monthKey = `${flightDate.getFullYear()}-${String(flightDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(flight);
    });

    const flightsByMonth: FlightSummary['flightsByMonth'] = [];
    for (const [month, flights] of monthMap.entries()) {
      let monthDuration = 0;
      flights.forEach(flight => {
        monthDuration += this.calculateFlightDurationMinutes(flight.startTime, flight.endTime);
      });

      flightsByMonth.push({
        month,
        totalFlights: flights.length,
        totalDuration: monthDuration,
        totalDurationFormatted: this.formatDuration(monthDuration),
      });
    }

    // Sort by month descending
    flightsByMonth.sort((a, b) => b.month.localeCompare(a.month));

    return {
      totalFlights: filteredFlights.length,
      totalDuration,
      totalDurationFormatted: this.formatDuration(totalDuration),
      averageDuration,
      averageDurationFormatted: this.formatDuration(averageDuration),
      flightsByCategory: flightsByCategory as Record<FlightCategory, number>,
      flightsByActivity: flightsByActivity as Record<ActivityType, number>,
      flightsByUser,
      flightsByDrone,
      flightsByMonth,
    };
  }

  /**
   * Generate drone summary report
   */
  static async generateDroneSummary(
    filter: ReportFilter,
    userRole: UserRole,
    currentUserId: string
  ): Promise<DroneSummary[]> {
    // Fetch all flights and drones
    const allFlights = await FlightService.getFlights(userRole, currentUserId);
    const allDrones = await DroneService.getDrones(userRole);
    
    // Filter flights based on report filter
    const filteredFlights = this.filterFlights(allFlights, filter);

    // Group flights by drone
    const droneFlightsMap = new Map<string, Flight[]>();
    filteredFlights.forEach(flight => {
      if (!droneFlightsMap.has(flight.droneId)) {
        droneFlightsMap.set(flight.droneId, []);
      }
      droneFlightsMap.get(flight.droneId)!.push(flight);
    });

    const droneSummaries: DroneSummary[] = [];

    for (const drone of allDrones) {
      const droneFlights = droneFlightsMap.get(drone.id) || [];
      
      if (droneFlights.length === 0 && filter.timeRange !== 'all') {
        continue; // Skip drones with no flights in the filtered period
      }

      let totalDuration = 0;
      droneFlights.forEach(flight => {
        totalDuration += this.calculateFlightDurationMinutes(flight.startTime, flight.endTime);
      });

      const averageDuration = droneFlights.length > 0 ? totalDuration / droneFlights.length : 0;

      // Group by category
      const flightsByCategory: Record<string, number> = {};
      droneFlights.forEach(flight => {
        flightsByCategory[flight.flightCategory] = (flightsByCategory[flight.flightCategory] || 0) + 1;
      });

      // Group by activity
      const flightsByActivity: Record<string, number> = {};
      droneFlights.forEach(flight => {
        flightsByActivity[flight.activityType] = (flightsByActivity[flight.activityType] || 0) + 1;
      });

      // Find last flight date
      let lastFlightDate: string | undefined;
      if (droneFlights.length > 0) {
        const sortedFlights = [...droneFlights].sort((a, b) => b.date.localeCompare(a.date));
        lastFlightDate = sortedFlights[0].date;
      }

      droneSummaries.push({
        droneId: drone.id,
        droneName: drone.name,
        inventoryCode: drone.inventoryCode,
        totalFlights: droneFlights.length,
        totalDuration,
        totalDurationFormatted: this.formatDuration(totalDuration),
        lastFlightDate,
        flightsByCategory: flightsByCategory as Record<FlightCategory, number>,
        flightsByActivity: flightsByActivity as Record<ActivityType, number>,
        averageDuration,
        averageDurationFormatted: this.formatDuration(averageDuration),
      });
    }

    // Sort by total duration descending
    droneSummaries.sort((a, b) => b.totalDuration - a.totalDuration);

    return droneSummaries;
  }

  /**
   * Export flight summary to XLSX
   */
  static async exportFlightSummaryToXLSX(
    summary: FlightSummary,
    filter: ReportFilter,
    userEmail: string
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Overview sheet
    const overviewData = [
      ['Flight Summary Report'],
      ['Generated at', new Date().toLocaleString()],
      ['Generated by', userEmail],
      [''],
      ['Total Flights', summary.totalFlights],
      ['Total Duration', summary.totalDurationFormatted],
      ['Average Duration', summary.averageDurationFormatted],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Flights by User sheet
    if (summary.flightsByUser.length > 0) {
      const userData = [
        ['User Email', 'User Name', 'Total Flights', 'Total Duration'],
        ...summary.flightsByUser.map(user => [
          user.userEmail,
          user.userName,
          user.totalFlights,
          user.totalDurationFormatted,
        ]),
      ];
      const userSheet = XLSX.utils.aoa_to_sheet(userData);
      XLSX.utils.book_append_sheet(workbook, userSheet, 'By User');
    }

    // Flights by Drone sheet
    if (summary.flightsByDrone.length > 0) {
      const droneData = [
        ['Drone Name', 'Total Flights', 'Total Duration'],
        ...summary.flightsByDrone.map(drone => [
          drone.droneName,
          drone.totalFlights,
          drone.totalDurationFormatted,
        ]),
      ];
      const droneSheet = XLSX.utils.aoa_to_sheet(droneData);
      XLSX.utils.book_append_sheet(workbook, droneSheet, 'By Drone');
    }

    // Flights by Month sheet
    if (summary.flightsByMonth.length > 0) {
      const monthData = [
        ['Month', 'Total Flights', 'Total Duration'],
        ...summary.flightsByMonth.map(month => [
          month.month,
          month.totalFlights,
          month.totalDurationFormatted,
        ]),
      ];
      const monthSheet = XLSX.utils.aoa_to_sheet(monthData);
      XLSX.utils.book_append_sheet(workbook, monthSheet, 'By Month');
    }

    // Generate file
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const filename = `flight-summary-${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  }

  /**
   * Export drone summary to XLSX
   */
  static async exportDroneSummaryToXLSX(
    summaries: DroneSummary[],
    filter: ReportFilter,
    userEmail: string
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Overview sheet
    const overviewData = [
      ['Drone Summary Report'],
      ['Generated at', new Date().toLocaleString()],
      ['Generated by', userEmail],
      [''],
      ['Total Drones', summaries.length],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Drone details sheet
    const droneData = [
      ['Drone Name', 'Inventory Code', 'Total Flights', 'Total Duration', 'Average Duration', 'Last Flight'],
      ...summaries.map(drone => [
        drone.droneName,
        drone.inventoryCode,
        drone.totalFlights,
        drone.totalDurationFormatted,
        drone.averageDurationFormatted,
        drone.lastFlightDate || 'N/A',
      ]),
    ];
    const droneSheet = XLSX.utils.aoa_to_sheet(droneData);
    XLSX.utils.book_append_sheet(workbook, droneSheet, 'Drone Details');

    // Generate file
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const filename = `drone-summary-${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  }

  /**
   * Export flight summary to PDF
   */
  static async exportFlightSummaryToPDF(
    summary: FlightSummary,
    filter: ReportFilter,
    userEmail: string
  ): Promise<string> {
    // For web, we'll use a different approach
    if (Platform.OS === 'web') {
      return this.exportFlightSummaryToPDFWeb(summary, filter, userEmail);
    }

    // For mobile, use react-native-html-to-pdf
    const htmlToPdf = require('react-native-html-to-pdf').default;
    
    const html = this.generateFlightSummaryHTML(summary, filter, userEmail);
    
    const options = {
      html,
      fileName: `flight-summary-${new Date().toISOString().split('T')[0]}`,
      directory: 'Documents',
    };

    const file = await htmlToPdf.convert(options);
    return file.filePath;
  }

  /**
   * Export drone summary to PDF
   */
  static async exportDroneSummaryToPDF(
    summaries: DroneSummary[],
    filter: ReportFilter,
    userEmail: string
  ): Promise<string> {
    // For web, we'll use a different approach
    if (Platform.OS === 'web') {
      return this.exportDroneSummaryToPDFWeb(summaries, filter, userEmail);
    }

    // For mobile, use react-native-html-to-pdf
    const htmlToPdf = require('react-native-html-to-pdf').default;
    
    const html = this.generateDroneSummaryHTML(summaries, filter, userEmail);
    
    const options = {
      html,
      fileName: `drone-summary-${new Date().toISOString().split('T')[0]}`,
      directory: 'Documents',
    };

    const file = await htmlToPdf.convert(options);
    return file.filePath;
  }

  /**
   * Generate HTML for flight summary report
   */
  private static generateFlightSummaryHTML(
    summary: FlightSummary,
    filter: ReportFilter,
    userEmail: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0066CC; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #0066CC; color: white; }
          .info { margin-bottom: 20px; }
          .info-item { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <h1>Flight Summary Report</h1>
        <div class="info">
          <div class="info-item"><strong>Generated at:</strong> ${new Date().toLocaleString()}</div>
          <div class="info-item"><strong>Generated by:</strong> ${userEmail}</div>
        </div>
        
        <h2>Overview</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Flights</td><td>${summary.totalFlights}</td></tr>
          <tr><td>Total Duration</td><td>${summary.totalDurationFormatted}</td></tr>
          <tr><td>Average Duration</td><td>${summary.averageDurationFormatted}</td></tr>
        </table>
        
        ${summary.flightsByUser.length > 0 ? `
          <h2>Flights by User</h2>
          <table>
            <tr>
              <th>User Email</th>
              <th>User Name</th>
              <th>Total Flights</th>
              <th>Total Duration</th>
            </tr>
            ${summary.flightsByUser.map(user => `
              <tr>
                <td>${user.userEmail}</td>
                <td>${user.userName}</td>
                <td>${user.totalFlights}</td>
                <td>${user.totalDurationFormatted}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        
        ${summary.flightsByDrone.length > 0 ? `
          <h2>Flights by Drone</h2>
          <table>
            <tr>
              <th>Drone Name</th>
              <th>Total Flights</th>
              <th>Total Duration</th>
            </tr>
            ${summary.flightsByDrone.map(drone => `
              <tr>
                <td>${drone.droneName}</td>
                <td>${drone.totalFlights}</td>
                <td>${drone.totalDurationFormatted}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        
        ${summary.flightsByMonth.length > 0 ? `
          <h2>Flights by Month</h2>
          <table>
            <tr>
              <th>Month</th>
              <th>Total Flights</th>
              <th>Total Duration</th>
            </tr>
            ${summary.flightsByMonth.map(month => `
              <tr>
                <td>${month.month}</td>
                <td>${month.totalFlights}</td>
                <td>${month.totalDurationFormatted}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for drone summary report
   */
  private static generateDroneSummaryHTML(
    summaries: DroneSummary[],
    filter: ReportFilter,
    userEmail: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0066CC; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #0066CC; color: white; }
          .info { margin-bottom: 20px; }
          .info-item { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <h1>Drone Summary Report</h1>
        <div class="info">
          <div class="info-item"><strong>Generated at:</strong> ${new Date().toLocaleString()}</div>
          <div class="info-item"><strong>Generated by:</strong> ${userEmail}</div>
          <div class="info-item"><strong>Total Drones:</strong> ${summaries.length}</div>
        </div>
        
        <h2>Drone Details</h2>
        <table>
          <tr>
            <th>Drone Name</th>
            <th>Inventory Code</th>
            <th>Total Flights</th>
            <th>Total Duration</th>
            <th>Average Duration</th>
            <th>Last Flight</th>
          </tr>
          ${summaries.map(drone => `
            <tr>
              <td>${drone.droneName}</td>
              <td>${drone.inventoryCode}</td>
              <td>${drone.totalFlights}</td>
              <td>${drone.totalDurationFormatted}</td>
              <td>${drone.averageDurationFormatted}</td>
              <td>${drone.lastFlightDate || 'N/A'}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Export flight summary to PDF for web
   */
  private static async exportFlightSummaryToPDFWeb(
    summary: FlightSummary,
    filter: ReportFilter,
    userEmail: string
  ): Promise<string> {
    // For web, we'll create a printable HTML page
    const html = this.generateFlightSummaryHTML(summary, filter, userEmail);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window for printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    return url;
  }

  /**
   * Export drone summary to PDF for web
   */
  private static async exportDroneSummaryToPDFWeb(
    summaries: DroneSummary[],
    filter: ReportFilter,
    userEmail: string
  ): Promise<string> {
    // For web, we'll create a printable HTML page
    const html = this.generateDroneSummaryHTML(summaries, filter, userEmail);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window for printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    return url;
  }

  /**
   * Share or download the exported file
   */
  static async shareFile(fileUri: string): Promise<void> {
    if (Platform.OS === 'web') {
      // For web, the file is already downloaded/opened
      return;
    }

    // For mobile, use Sharing API
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri);
    } else {
      console.log('Sharing is not available on this platform');
    }
  }
}
