import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Index from '../index';
import { mockUsers, testCredentials } from './test-utils';
import { UserRole } from '@/types/UserRole';

// Mock the AuthContext
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock LoginScreen component
jest.mock('../../screens/LoginScreen', () => {
  return function MockLoginScreen() {
    return 'LoginScreen';
  };
});

describe('Index (Dashboard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.getByText('common.loading')).toBeTruthy();
    });
  });

  describe('Unauthenticated State', () => {
    it('should show login screen when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      expect(screen.getByText('LoginScreen')).toBeTruthy();
    });
  });

  describe('Authenticated State - Dashboard Rendering', () => {
    it('should render dashboard for authenticated admin user', () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.admin,
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      // Check dashboard title and welcome message
      expect(screen.getByText('dashboard.title')).toBeTruthy();
      expect(screen.getByText('dashboard.welcome, admin@example.com')).toBeTruthy();
      
      // Check navigation buttons
      expect(screen.getByText('dashboard.navigation.flights')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.drones')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.procedures')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.profile')).toBeTruthy();
      
      // Admin-specific buttons should be visible
      expect(screen.getByText('dashboard.navigation.users')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.logs')).toBeTruthy();
    });

    it('should render dashboard for authenticated manager user', () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.manager,
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      // Check dashboard title and welcome message
      expect(screen.getByText('dashboard.title')).toBeTruthy();
      expect(screen.getByText('dashboard.welcome, manager@example.com')).toBeTruthy();
      
      // Check basic navigation buttons
      expect(screen.getByText('dashboard.navigation.flights')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.drones')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.procedures')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.profile')).toBeTruthy();
      
      // Manager should see users but not logs
      expect(screen.getByText('dashboard.navigation.users')).toBeTruthy();
      expect(screen.queryByText('dashboard.navigation.logs')).toBeNull();
    });

    it('should render dashboard for authenticated regular user', () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.user,
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      // Check dashboard title and welcome message
      expect(screen.getByText('dashboard.title')).toBeTruthy();
      expect(screen.getByText('dashboard.welcome, user@example.com')).toBeTruthy();
      
      // Check basic navigation buttons
      expect(screen.getByText('dashboard.navigation.flights')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.drones')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.procedures')).toBeTruthy();
      expect(screen.getByText('dashboard.navigation.profile')).toBeTruthy();
      
      // Regular user should not see admin/manager buttons
      expect(screen.queryByText('dashboard.navigation.users')).toBeNull();
      expect(screen.queryByText('dashboard.navigation.logs')).toBeNull();
    });

    it('should render Footer component', () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.user,
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      expect(screen.getByText('Footer')).toBeTruthy();
    });
  });

  describe('Role-based Navigation Visibility', () => {
    const testCases = [
      {
        role: 'admin',
        user: mockUsers.admin,
        expectedButtons: ['flights', 'drones', 'procedures', 'profile', 'users', 'logs'],
        hiddenButtons: [],
      },
      {
        role: 'manager',
        user: mockUsers.manager,
        expectedButtons: ['flights', 'drones', 'procedures', 'profile', 'users'],
        hiddenButtons: ['logs'],
      },
      {
        role: 'user',
        user: mockUsers.user,
        expectedButtons: ['flights', 'drones', 'procedures', 'profile'],
        hiddenButtons: ['users', 'logs'],
      },
    ];

    testCases.forEach(({ role, user, expectedButtons, hiddenButtons }) => {
      it(`should show correct navigation buttons for ${role} role`, () => {
        mockUseAuth.mockReturnValue({
          user,
          loading: false,
          refreshUser: jest.fn(),
        });

        render(<Index />);
        
        expectedButtons.forEach(button => {
          expect(screen.getByText(`dashboard.navigation.${button}`)).toBeTruthy();
        });
        
        hiddenButtons.forEach(button => {
          expect(screen.queryByText(`dashboard.navigation.${button}`)).toBeNull();
        });
      });
    });
  });
});