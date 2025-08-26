/**
 * Utility functions for flight-related operations
 */

/**
 * Calculate flight duration from start and end times
 * @param startTime - ISO datetime string or HH:mm format
 * @param endTime - ISO datetime string or HH:mm format
 * @param t - Translation function for internationalization
 * @returns Formatted duration string or empty string if invalid
 */
export function calculateFlightDuration(
  startTime: string, 
  endTime: string, 
  t?: (key: string) => string
): string {
  if (!startTime || !endTime) {
    return '';
  }

  try {
    let startDateTime: Date;
    let endDateTime: Date;

    // Handle both old format (HH:mm) and new format (datetime string)
    if (startTime.includes('T') || startTime.includes('Z')) {
      // New datetime format
      startDateTime = new Date(startTime);
      endDateTime = new Date(endTime);
    } else if (startTime.match(/^\d{2}:\d{2}$/)) {
      // Old HH:mm format - assume same day
      const today = new Date().toISOString().split('T')[0];
      startDateTime = new Date(`${today}T${startTime}:00`);
      endDateTime = new Date(`${today}T${endTime}:00`);
      
      // If end time is before start time, assume it's next day
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + (24 * 60 * 60 * 1000));
      }
    } else {
      return '';
    }
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return '';
    }
    
    if (endDateTime <= startDateTime) {
      return '';
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const totalTimeLabel = t ? t('common.totalTime') : 'Total time';
    
    if (hours > 0 && minutes > 0) {
      return `${totalTimeLabel}: ${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${totalTimeLabel}: ${hours}h`;
    } else if (minutes > 0) {
      return `${totalTimeLabel}: ${minutes}min`;
    } else {
      return `${totalTimeLabel}: <1min`;
    }
  } catch {
    return '';
  }
}

/**
 * Format flight duration in a more compact format for list views
 * @param startTime - ISO datetime string or HH:mm format
 * @param endTime - ISO datetime string or HH:mm format
 * @returns Formatted duration string (e.g., "2h 15min") or empty string if invalid
 */
export function formatFlightDurationCompact(startTime: string, endTime: string): string {
  if (!startTime || !endTime) {
    return '';
  }

  try {
    let startDateTime: Date;
    let endDateTime: Date;

    // Handle both old format (HH:mm) and new format (datetime string)
    if (startTime.includes('T') || startTime.includes('Z')) {
      // New datetime format
      startDateTime = new Date(startTime);
      endDateTime = new Date(endTime);
    } else if (startTime.match(/^\d{2}:\d{2}$/)) {
      // Old HH:mm format - assume same day
      const today = new Date().toISOString().split('T')[0];
      startDateTime = new Date(`${today}T${startTime}:00`);
      endDateTime = new Date(`${today}T${endTime}:00`);
      
      // If end time is before start time, assume it's next day
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + (24 * 60 * 60 * 1000));
      }
    } else {
      return '';
    }
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return '';
    }
    
    if (endDateTime <= startDateTime) {
      return '';
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}min`;
    } else {
      return '<1min';
    }
  } catch {
    return '';
  }
}