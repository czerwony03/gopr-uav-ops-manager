import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

export interface ConsoleMessage {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  args?: any[];
}

interface ConsoleContextType {
  messages: ConsoleMessage[];
  clearMessages: () => void;
  isConsoleVisible: boolean;
  showConsole: () => void;
  hideConsole: () => void;
}

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

export const useConsole = () => {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error('useConsole must be used within a ConsoleProvider');
  }
  return context;
};

interface ConsoleProviderProps {
  children: ReactNode;
  maxMessages?: number;
}

export const ConsoleProvider: React.FC<ConsoleProviderProps> = ({ 
  children, 
  maxMessages = 1000 
}) => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const messageQueueRef = useRef<ConsoleMessage[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalMethodsRef = useRef<{
    log: Function;
    info: Function;
    warn: Function;
    error: Function;
  } | null>(null);

  // Flush queued messages to state
  const flushMessages = React.useCallback(() => {
    if (messageQueueRef.current.length > 0) {
      const queuedMessages = [...messageQueueRef.current];
      messageQueueRef.current = [];
      
      setMessages(prev => {
        const newMessages = [...queuedMessages, ...prev];
        // Keep only the latest maxMessages
        return newMessages.slice(0, maxMessages);
      });
    }
  }, [maxMessages]);

  // Set up console capture immediately when component is created
  if (!originalMethodsRef.current) {
    // Store original console methods
    originalMethodsRef.current = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    // Create enhanced console methods that capture messages
    const createConsoleCapture = (level: ConsoleMessage['level'], originalMethod: Function) => {
      return (...args: any[]) => {
        // Call original method first (which may include Sentry integration)
        originalMethod.apply(console, args);
        
        // Capture the message for our debug console
        const message: ConsoleMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          level,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '),
          args
        };

        // Add to queue instead of directly updating state
        messageQueueRef.current.push(message);
        
        // Schedule flush if not already scheduled
        if (flushTimeoutRef.current === null) {
          flushTimeoutRef.current = setTimeout(() => {
            flushTimeoutRef.current = null;
            flushMessages();
          }, 0);
        }
      };
    };

    // Override console methods immediately
    console.log = createConsoleCapture('log', originalMethodsRef.current.log);
    console.info = createConsoleCapture('info', originalMethodsRef.current.info);
    console.warn = createConsoleCapture('warn', originalMethodsRef.current.warn);
    console.error = createConsoleCapture('error', originalMethodsRef.current.error);
  }

  // Flush messages periodically
  useEffect(() => {
    const interval = setInterval(flushMessages, 100);
    return () => clearInterval(interval);
  }, [flushMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (originalMethodsRef.current) {
        console.log = originalMethodsRef.current.log;
        console.info = originalMethodsRef.current.info;
        console.warn = originalMethodsRef.current.warn;
        console.error = originalMethodsRef.current.error;
        originalMethodsRef.current = null;
      }
      
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  const showConsole = () => {
    setIsConsoleVisible(true);
  };

  const hideConsole = () => {
    setIsConsoleVisible(false);
  };

  return (
    <ConsoleContext.Provider 
      value={{
        messages,
        clearMessages,
        isConsoleVisible,
        showConsole,
        hideConsole
      }}
    >
      {children}
    </ConsoleContext.Provider>
  );
};