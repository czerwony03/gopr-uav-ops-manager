import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, UserData } from '@/contexts/AuthContext';
import { UserRole } from '@/types/UserRole';

// Mock user data for different roles
export const mockUsers = {
  admin: {
    uid: 'admin-uid',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    firstname: 'Admin',
    surname: 'User',
    phone: '+123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserData,
  
  manager: {
    uid: 'manager-uid',
    email: 'manager@example.com',
    role: UserRole.MANAGER,
    firstname: 'Manager',
    surname: 'User',
    phone: '+123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserData,
  
  user: {
    uid: 'user-uid',
    email: 'user@example.com',
    role: UserRole.USER,
    firstname: 'Regular',
    surname: 'User',
    phone: '+123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserData,
};

// Test credentials
export const testCredentials = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
  },
  manager: {
    email: 'manager@example.com',
    password: 'manager123',
  },
  user: {
    email: 'user@example.com',
    password: 'user123',
  },
};

// Mock AuthContext with different states
export const createMockAuthContext = (user: UserData | null = null, loading = false) => ({
  user,
  loading,
  refreshUser: jest.fn(),
});

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: UserData | null;
  loading?: boolean;
}

const AllTheProviders: React.FC<{ children: React.ReactNode; user?: UserData | null; loading?: boolean }> = ({
  children,
  user = null,
  loading = false,
}) => {
  // Mock the AuthContext
  const mockAuthContext = createMockAuthContext(user, loading);
  
  return (
    <SafeAreaProvider>
      {/* We'll need to mock AuthProvider since we can't easily override its context value */}
      {children}
    </SafeAreaProvider>
  );
};

export const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { user, loading, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders user={user} loading={loading}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Mock AuthContext hook
export const mockUseAuth = (user: UserData | null = null, loading = false) => {
  return jest.fn(() => createMockAuthContext(user, loading));
};

export * from '@testing-library/react-native';