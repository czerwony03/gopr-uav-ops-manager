import { Timestamp } from '@/utils/firebaseUtils';

/**
 * Date formatting utility functions
 */

/**
 * Formats a date to a simple local date string
 * @param date - The date to format (can be undefined)
 * @returns Formatted date string or 'Not set' if date is undefined
 */
export const formatDate = (date: Date | undefined): string => {
  if (!date) return 'Not set';
  return date.toLocaleDateString();
};

/**
 * Formats a last login date with time information
 * @param date - The date to format (can be undefined)
 * @returns Formatted date/time string or 'Never' if date is undefined
 */
export const formatLastLogin = (date: Date | undefined): string => {
  if (!date) return 'Never';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const toDateIfTimestamp = (value: any): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  // Handle corrupted { seconds, nanoseconds } objects from Firestore
  if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
    try {
      const timestamp = new Timestamp(value.seconds, value.nanoseconds);
      return timestamp.toDate();
    } catch (error) {
      console.warn('Failed to convert corrupted timestamp object:', value, error);
      return undefined;
    }
  }
  return undefined;
};

/**
 * Converts various date input types to a Firestore Timestamp
 * 
 * This utility fixes the issue where form submissions pass date fields as strings (YYYY-MM-DD),
 * but Firestore expects Timestamp objects. Without proper conversion, dates get saved as 
 * { seconds, nanoseconds } objects which break queries and display logic.
 * 
 * When clearing date fields (empty strings or undefined), they should be stored as null in Firestore
 * to properly indicate "no date" rather than causing audit log confusion.
 * 
 * @param value - The value to convert (string, Date, Timestamp, { seconds, nanoseconds }, null, or undefined)
 * @returns Firestore Timestamp or null if invalid/empty input
 */
export const toFirestoreTimestamp = (value: any): Timestamp | null => {
  // Handle null/undefined - both should result in null for Firestore (clearing date fields)
  if (value === null || value === undefined) {
    return null;
  }

  // Already a Firestore Timestamp - return as is
  if (value instanceof Timestamp) {
    return value;
  }

  // JS Date object - convert to Timestamp
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  // String date (YYYY-MM-DD format) - convert to Date then Timestamp
  if (typeof value === 'string') {
    // Empty string should be treated as null (clearing a date field)
    if (!value.trim()) {
      return null;
    }
    
    // Check if it's a valid YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(value.trim())) {
      const date = new Date(value.trim() + 'T00:00:00.000Z'); // Parse as UTC to avoid timezone issues
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    }
    
    // Try parsing as ISO string or other date format
    const parsedDate = new Date(value.trim());
    if (!isNaN(parsedDate.getTime())) {
      return Timestamp.fromDate(parsedDate);
    }
  }

  // { seconds, nanoseconds } object - convert to Timestamp
  if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
    return new Timestamp(value.seconds, value.nanoseconds);
  }

  // Invalid input - return null (clearing date fields)
  return null;
};
