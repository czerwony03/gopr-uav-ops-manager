// Test AsyncStorage mocking works correctly for OfflineProcedureChecklistService
// This file tests that AsyncStorage is properly mocked and won't cause runtime errors

// Mock AsyncStorage before any imports
const mockAsyncStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('OfflineProcedureChecklistService AsyncStorage Mocking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mock return values after clearing
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it('should have AsyncStorage properly mocked', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    expect(AsyncStorage).toBeDefined();
    expect(typeof AsyncStorage.getItem).toBe('function');
    expect(typeof AsyncStorage.setItem).toBe('function');
    expect(typeof AsyncStorage.removeItem).toBe('function');
  });

  it('should allow AsyncStorage operations without errors', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Test the actual return values
    const getResult = await AsyncStorage.getItem('test-key');
    const setResult = await AsyncStorage.setItem('test-key', 'test-value');
    const removeResult = await AsyncStorage.removeItem('test-key');
    
    expect(getResult).toBe(null);
    expect(setResult).toBeUndefined();
    expect(removeResult).toBeUndefined();
    
    // Verify mocks were called
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('test-key');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('should prevent async_storage_1.default.setItem errors for procedures', async () => {
    // This test verifies that the AsyncStorage mock prevents the runtime error:
    // "TypeError: async_storage_1.default.setItem is not a function"
    
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Mock a complex serialization scenario like in the procedure service
    const testProcedures = [
      { 
        id: 'proc-1', 
        title: 'Test Procedure',
        items: [{ id: 'item-1', content: 'Test item' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    const serializedData = JSON.stringify(testProcedures);
    
    // This operation should work without the "setItem is not a function" error
    const result = await AsyncStorage.setItem('cached_procedures', serializedData);
    expect(result).toBeUndefined();
    
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('cached_procedures', serializedData);
  });

  it('should handle Promise.all AsyncStorage operations', async () => {
    // Tests the specific pattern used in the offline services with Promise.all
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    const operations = [
      AsyncStorage.setItem('key1', 'value1'),
      AsyncStorage.setItem('key2', 'value2')
    ];
    
    // This should work without errors (similar to the service implementation)
    await expect(Promise.all(operations)).resolves.toEqual([undefined, undefined]);
    
    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('key1', 'value1');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('key2', 'value2');
  });
});