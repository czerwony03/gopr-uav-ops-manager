/**
 * Deep comparison utility for detecting changes between objects
 * Returns a list of changes with full paths for nested properties
 */

export interface Change {
  path: string;
  previousValue: any;
  newValue: any;
}

/**
 * Performs deep comparison between two objects and returns all detected changes
 * @param previous - The previous object state
 * @param current - The current object state
 * @param basePath - The base path for nested properties (used internally)
 * @returns Array of changes with full paths
 */
export function deepDiff(previous: any, current: any, basePath: string = ''): Change[] {
  const changes: Change[] = [];

  // Handle null/undefined cases
  if (previous === null && current === null) return changes;
  if (previous === undefined && current === undefined) return changes;
  
  if (previous === null || previous === undefined) {
    if (current !== null && current !== undefined) {
      changes.push({
        path: basePath || 'value',
        previousValue: previous,
        newValue: current
      });
    }
    return changes;
  }
  
  if (current === null || current === undefined) {
    changes.push({
      path: basePath || 'value',
      previousValue: previous,
      newValue: current
    });
    return changes;
  }

  // Handle primitive values
  if (typeof previous !== 'object' || typeof current !== 'object') {
    if (previous !== current) {
      changes.push({
        path: basePath || 'value',
        previousValue: previous,
        newValue: current
      });
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(previous) || Array.isArray(current)) {
    if (Array.isArray(previous) !== Array.isArray(current)) {
      changes.push({
        path: basePath || 'value',
        previousValue: previous,
        newValue: current
      });
      return changes;
    }
    
    if (Array.isArray(previous) && Array.isArray(current)) {
      if (JSON.stringify(previous) !== JSON.stringify(current)) {
        changes.push({
          path: basePath || 'value',
          previousValue: previous,
          newValue: current
        });
      }
    }
    return changes;
  }

  // Handle objects - get all unique keys from both objects
  const prevKeys = Object.keys(previous);
  const currKeys = Object.keys(current);
  const allKeys = [...prevKeys];
  
  // Add keys from current that aren't in previous
  for (const key of currKeys) {
    if (allKeys.indexOf(key) === -1) {
      allKeys.push(key);
    }
  }
  
  for (const key of allKeys) {
    const newPath = basePath ? `${basePath}.${key}` : key;
    const prevValue = previous[key];
    const currValue = current[key];
    
    // If key doesn't exist in one of the objects
    if (!(key in previous)) {
      changes.push({
        path: newPath,
        previousValue: undefined,
        newValue: currValue
      });
      continue;
    }
    
    if (!(key in current)) {
      changes.push({
        path: newPath,
        previousValue: prevValue,
        newValue: undefined
      });
      continue;
    }
    
    // Recursively compare nested objects
    if (typeof prevValue === 'object' && typeof currValue === 'object' && 
        prevValue !== null && currValue !== null &&
        !Array.isArray(prevValue) && !Array.isArray(currValue)) {
      const nestedChanges = deepDiff(prevValue, currValue, newPath);
      changes.push(...nestedChanges);
    } else if (Array.isArray(prevValue) && Array.isArray(currValue)) {
      // Handle arrays as object properties - compare content, not reference
      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changes.push({
          path: newPath,
          previousValue: prevValue,
          newValue: currValue
        });
      }
    } else if (Array.isArray(prevValue) || Array.isArray(currValue)) {
      // Handle case where one is array and other is not (always different)
      changes.push({
        path: newPath,
        previousValue: prevValue,
        newValue: currValue
      });
    } else {
      // For primitives or mixed types
      if (prevValue !== currValue) {
        changes.push({
          path: newPath,
          previousValue: prevValue,
          newValue: currValue
        });
      }
    }
  }

  return changes;
}

/**
 * Formats a change into a human-readable string
 * @param change - The change object
 * @returns Formatted string describing the change
 */
export function formatChange(change: Change): string {
  const { path, previousValue, newValue } = change;
  
  // Helper function to format values
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Special formatting for specific drone fields
  if (path === 'weight' || path === 'maxTakeoffWeight') {
    return `${path === 'maxTakeoffWeight' ? 'max takeoff weight' : 'weight'} from ${previousValue}g to ${newValue}g`;
  }
  
  return `${path} from ${formatValue(previousValue)} to ${formatValue(newValue)}`;
}

/**
 * Converts an array of changes into a formatted change description
 * @param changes - Array of changes
 * @returns Formatted change description string
 */
export function formatChanges(changes: Change[]): string {
  if (changes.length === 0) {
    return '';
  }
  
  const formattedChanges = changes.map(formatChange);
  return `Changed ${formattedChanges.join(', ')}`;
}