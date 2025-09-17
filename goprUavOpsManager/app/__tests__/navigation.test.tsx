import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Index from '../index';
import { mockUsers } from './test-utils';
import { UserRole } from '@/types/UserRole';

// Mock the AuthContext
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useRouter
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

describe('Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
    mockRouter.navigate.mockClear();
  });

  describe('Role-based Navigation Access', () => {
    describe('Admin User Navigation', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: mockUsers.admin,
          loading: false,
          refreshUser: jest.fn(),
        });
      });

      it('should show all navigation buttons for admin', () => {
        render(<Index />);
        
        // Common buttons available to all roles
        expect(screen.getByText('dashboard.navigation.flights')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.drones')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.procedures')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.profile')).toBeTruthy();
        
        // Admin-specific buttons
        expect(screen.getByText('dashboard.navigation.users')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.logs')).toBeTruthy();
      });

      it('should navigate to users page when admin clicks users button', () => {
        render(<Index />);
        
        const usersButton = screen.getByText('dashboard.navigation.users');
        fireEvent.press(usersButton);
        
        expect(mockRouter.push).toHaveBeenCalledWith('/users');
      });

      it('should navigate to audit logs page when admin clicks logs button', () => {
        render(<Index />);
        
        const logsButton = screen.getByText('dashboard.navigation.logs');
        fireEvent.press(logsButton);
        
        expect(mockRouter.push).toHaveBeenCalledWith('/audit-logs');
      });
    });

    describe('Manager User Navigation', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: mockUsers.manager,
          loading: false,
          refreshUser: jest.fn(),
        });
      });

      it('should show appropriate navigation buttons for manager', () => {
        render(<Index />);
        
        // Common buttons available to all roles
        expect(screen.getByText('dashboard.navigation.flights')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.drones')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.procedures')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.profile')).toBeTruthy();
        
        // Manager can access users
        expect(screen.getByText('dashboard.navigation.users')).toBeTruthy();
        
        // Manager cannot access audit logs
        expect(screen.queryByText('dashboard.navigation.logs')).toBeNull();
      });

      it('should navigate to users page when manager clicks users button', () => {
        render(<Index />);
        
        const usersButton = screen.getByText('dashboard.navigation.users');
        fireEvent.press(usersButton);
        
        expect(mockRouter.push).toHaveBeenCalledWith('/users');
      });
    });

    describe('Regular User Navigation', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: mockUsers.user,
          loading: false,
          refreshUser: jest.fn(),
        });
      });

      it('should show only basic navigation buttons for regular user', () => {
        render(<Index />);
        
        // Common buttons available to all roles
        expect(screen.getByText('dashboard.navigation.flights')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.drones')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.procedures')).toBeTruthy();
        expect(screen.getByText('dashboard.navigation.profile')).toBeTruthy();
        
        // Regular user cannot access restricted pages
        expect(screen.queryByText('dashboard.navigation.users')).toBeNull();
        expect(screen.queryByText('dashboard.navigation.logs')).toBeNull();
      });

      it('should navigate to profile page when user clicks profile button', () => {
        render(<Index />);
        
        const profileButton = screen.getByText('dashboard.navigation.profile');
        fireEvent.press(profileButton);
        
        expect(mockRouter.push).toHaveBeenCalledWith('/users/user-uid');
      });
    });
  });

  describe('Common Navigation Functions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.user,
        loading: false,
        refreshUser: jest.fn(),
      });
    });

    it('should navigate to flights page when clicking flights button', () => {
      render(<Index />);
      
      const flightsButton = screen.getByText('dashboard.navigation.flights');
      fireEvent.press(flightsButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/flights');
    });

    it('should navigate to drones page when clicking drones button', () => {
      render(<Index />);
      
      const dronesButton = screen.getByText('dashboard.navigation.drones');
      fireEvent.press(dronesButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/drones');
    });

    it('should navigate to procedures page when clicking procedures button', () => {
      render(<Index />);
      
      const proceduresButton = screen.getByText('dashboard.navigation.procedures');
      fireEvent.press(proceduresButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/procedures');
    });
  });

  describe('Profile Redirect Logic', () => {
    it('should redirect to profile edit if user profile is incomplete', () => {
      const incompleteUser = {
        ...mockUsers.user,
        firstname: '', // Missing firstname
        surname: 'User',
      };

      mockUseAuth.mockReturnValue({
        user: incompleteUser,
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      // Should redirect to profile edit page
      expect(mockRouter.navigate).toHaveBeenCalledWith('/users/user-uid/edit');
    });

    it('should not redirect if user profile is complete', () => {
      mockUseAuth.mockReturnValue({
        user: mockUsers.user, // Complete profile
        loading: false,
        refreshUser: jest.fn(),
      });

      render(<Index />);
      
      // Should not redirect
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});