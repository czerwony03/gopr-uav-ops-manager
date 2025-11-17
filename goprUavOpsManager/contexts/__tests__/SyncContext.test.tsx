import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SyncProvider, useSync } from '../SyncContext';

describe('SyncContext', () => {
  it('should provide initial sync state as false', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SyncProvider>{children}</SyncProvider>
    );
    
    const { result } = renderHook(() => useSync(), { wrapper });
    
    expect(result.current.isSyncing).toBe(false);
  });

  it('should update sync state when setSyncing is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SyncProvider>{children}</SyncProvider>
    );
    
    const { result } = renderHook(() => useSync(), { wrapper });
    
    act(() => {
      result.current.setSyncing(true);
    });
    
    expect(result.current.isSyncing).toBe(true);
    
    act(() => {
      result.current.setSyncing(false);
    });
    
    expect(result.current.isSyncing).toBe(false);
  });

  it('should throw error when useSync is used outside SyncProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      renderHook(() => useSync());
    }).toThrow('useSync must be used within a SyncProvider');
    
    consoleSpy.mockRestore();
  });
});
