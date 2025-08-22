export const filterUndefinedProperties = (data: object): object => {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
}
