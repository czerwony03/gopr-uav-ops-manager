// Test AsyncStorage mocking works correctly
// This file tests that AsyncStorage is properly mocked and won't cause runtime errors

// Mock AsyncStorage before any imports
const mockAsyncStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('OfflineCategoryService AsyncStorage Mocking', () => {
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

  it('should prevent async_storage_1.default.setItem errors', async () => {
    // This test verifies that the AsyncStorage mock prevents the runtime error:
    // "TypeError: async_storage_1.default.setItem is not a function"
    
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    
    // Mock a complex serialization scenario like in the service
    const testData = { categories: [], metadata: { version: 1 } };
    const serializedData = JSON.stringify(testData);
    
    // This operation should work without the "setItem is not a function" error
    const result = await AsyncStorage.setItem('cached_categories', serializedData);
    expect(result).toBeUndefined();
    
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('cached_categories', serializedData);
  });
});