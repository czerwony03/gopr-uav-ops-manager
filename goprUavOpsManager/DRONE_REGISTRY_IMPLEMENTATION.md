# Drone Registry Implementation

This document outlines the drone registry functionality implemented in the GOPR UAV Ops Manager.

## Changes Made

### 1. Updated Drone Interface (`types/Drone.ts`)
- Changed `totalFlightTime` from hours to minutes
- Added `isDeleted` field for soft-delete functionality
- Added `deletedAt`, `createdAt`, and `updatedAt` timestamp fields

### 2. Created Drone Service (`services/droneService.ts`)
- Centralized CRUD operations with role-based access control
- Implements soft-delete functionality
- Provides role-based filtering:
  - Users and managers: Only see non-deleted drones
  - Admins: See all drones including deleted ones with status indicators
- Includes utility functions for formatting flight time

### 3. Updated Drone List Screen (`app/drones-list.tsx`)
- Role-based UI with conditional buttons
- Shows deleted status badge for admins
- Implements create, edit, delete, and restore functionality
- Uses new DroneService for data operations

### 4. Created Drone Details Screen (`app/drone-details.tsx`)
- Displays comprehensive drone information
- Role-based action buttons (edit, delete, restore)
- Supports opening user manual links
- Shows timestamps and deletion status

### 5. Created Drone Form Screen (`app/drone-form.tsx`)
- Unified form for creating and editing drones
- Role-based access control (manager and admin only)
- Comprehensive validation
- Supports all drone fields including nested objects

## Role-Based Access Control

### User Role
- ✅ View drone list (non-deleted only)
- ✅ View drone details (non-deleted only)
- ❌ Create, edit, or delete drones

### Manager Role
- ✅ View drone list (non-deleted only)
- ✅ View drone details (non-deleted only)
- ✅ Create new drones
- ✅ Edit existing drones (non-deleted only)
- ✅ Soft-delete drones
- ❌ View deleted drones
- ❌ Restore deleted drones

### Admin Role
- ✅ View drone list (including deleted drones with status)
- ✅ View drone details (including deleted drones)
- ✅ Create new drones
- ✅ Edit all drones (including deleted ones)
- ✅ Soft-delete drones
- ✅ View deleted drones with status indicators
- ✅ Restore soft-deleted drones

## Soft-Delete Implementation

- Drones are never permanently deleted from the database
- Soft-delete sets `isDeleted: true` and `deletedAt: timestamp`
- Deleted drones are filtered out from regular users and managers
- Admins can see deleted drones with visual indicators
- Admins can restore deleted drones

## Navigation Flow

1. **Home** → View Drones List button → **Drone List**
2. **Drone List** → Add Drone button (managers/admins) → **Drone Form**
3. **Drone List** → View Details button → **Drone Details**
4. **Drone List** → Edit button (managers/admins) → **Drone Form**
5. **Drone Details** → Edit button (managers/admins) → **Drone Form**

## Firebase Collections

### Drones Collection
```javascript
{
  // Existing fields
  name: string,
  callSign: string,
  registrationNumber: string,
  location: string,
  totalFlightTime: number, // in minutes (changed from hours)
  // ... other existing fields
  
  // New fields
  isDeleted: boolean,
  deletedAt: timestamp | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Key Features

1. **Role-based permissions** enforced both in UI and backend logic
2. **Soft-delete functionality** with admin restore capability
3. **Comprehensive drone management** with all required fields
4. **Real-time data** with refresh functionality
5. **Professional UI** with clear visual indicators for deleted items
6. **Form validation** and error handling
7. **Responsive design** optimized for mobile devices

## Technical Implementation

- Uses Firestore queries with role-based filtering
- Implements proper TypeScript typing throughout
- Follows React Native best practices
- Uses Expo Router for navigation
- Includes proper error handling and user feedback
- Follows the existing codebase patterns and styling