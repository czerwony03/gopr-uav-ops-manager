import { Timestamp } from 'firebase/firestore';

export const filterUndefinedProperties = (data: any): any => {
  if (Array.isArray(data)) {
    return data
      .map(filterUndefinedProperties)
      .filter((v) => v !== undefined);
  }
  if (data && typeof data === 'object') {
    // Preserve Firestore Timestamps as-is to avoid converting them to plain objects
    if (data instanceof Timestamp) {
      return data;
    }
    // Preserve Date objects as-is
    if (data instanceof Date) {
      return data;
    }
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, filterUndefinedProperties(v)])
    );
  }
  return data;
}
