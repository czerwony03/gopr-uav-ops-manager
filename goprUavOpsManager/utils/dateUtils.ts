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