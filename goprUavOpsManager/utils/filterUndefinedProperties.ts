export const filterUndefinedProperties = (data: any): any => {
  if (Array.isArray(data)) {
    return data
      .map(filterUndefinedProperties)
      .filter((v) => v !== undefined);
  }
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, filterUndefinedProperties(v)])
    );
  }
  return data;
}
