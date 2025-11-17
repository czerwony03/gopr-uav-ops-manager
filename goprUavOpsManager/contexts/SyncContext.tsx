import React, {createContext, useContext, useState, useCallback} from 'react';

interface SyncContextType {
  isSyncing: boolean;
  setSyncing: (syncing: boolean) => void;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  setSyncing: () => {},
});

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const setSyncing = useCallback((syncing: boolean) => {
    setIsSyncing(syncing);
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing, setSyncing }}>
      {children}
    </SyncContext.Provider>
  );
};
