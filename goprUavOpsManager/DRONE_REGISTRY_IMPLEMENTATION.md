# Drone Registry Implementation

This document outlines the drone registry functionality implemented in the GOPR UAV Ops Manager, including audit log integration and cross-entity relationships.

## Overview

The drone registry is a comprehensive module for managing UAV inventory with role-based access control, audit logging, and integration with flights and other system entities. All drone operations are tracked through the centralized audit log system for compliance and operational oversight.

## Changes Made

### 1. Updated Drone Interface (`types/Drone.ts`)
- Changed `totalFlightTime` from hours to minutes
- **Updated unit specifications:**
  - `operatingTime`: from hours to minutes
  - `range`: from km to meters
  - `weight`: from kg to grams
  - `maxTakeoffWeight`: from kg to grams
  - `dimensions.length`: from cm to mm
  - `dimensions.width`: from cm to mm
  - `dimensions.height`: from cm to mm
- Added `isDeleted` field for soft-delete functionality
- Added `deletedAt`, `createdAt`, and `updatedAt` timestamp fields

### 2. Created Drone Service (`services/droneService.ts`)
- Centralized CRUD operations with role-based access control
- Implements soft-delete functionality
- **Full audit log integration**: All drone operations (create, update, delete, restore) automatically generate audit log entries with user tracking and change details
- Provides role-based filtering:
  - Users and managers: Only see non-deleted drones
  - Admins: See all drones including deleted ones with status indicators
- **Enhanced utility functions for unit formatting:**
  - `formatFlightTime()`: formats flight time in minutes to readable format
  - `formatOperatingTime()`: formats operating time in minutes with hours/minutes display
  - `formatWeight()`: formats weight in grams with kg/g display for readability
  - `formatRange()`: formats range in meters with km/m display for readability
  - `formatDimensions()`: formats dimensions in mm with cm/mm display for readability
- **Cross-entity integration**: Drone names are cached in flight records for efficient list display

### 3. Updated Drone List Screen (`app/drones-list.tsx`)
- Role-based UI with conditional buttons
- Shows deleted status badge for admins
- Implements create, edit, delete, and restore functionality
- Uses new DroneService for data operations

### 4. Created Drone Details Screen (`app/drone-details.tsx`)
- Displays comprehensive drone information
- Role-based action buttons (edit, delete, restore)
- Supports opening user manual links
- **Enhanced audit trail display**: Shows "Created by [user email] on [date]" and "Last updated by [user email] on [date]" with user email resolution
- Shows timestamps and deletion status
- **Admin capabilities**: Admins can view and restore deleted drones with clear status indicators

### 5. Created Drone Form Screen (`app/drone-form.tsx`)
- Unified form for creating and editing drones
- Role-based access control (manager and admin only)
- Comprehensive validation
- **Full audit integration**: Passes user ID for audit trail tracking on all create/update operations
- **Updated for new unit specifications:**
  - Operating Time input in minutes
  - Range input in meters
  - Weight inputs in grams (whole numbers)
  - Dimension inputs in mm
  - Updated labels and placeholders to reflect new units
- Supports all drone fields including nested objects

## Audit Log Integration

The drone registry is fully integrated with the centralized audit logging system:

### Automatic Audit Trail
- **Create operations**: Records drone creation with user details and full drone data
- **Update operations**: Tracks all field changes with before/after values and change descriptions
- **Delete operations**: Logs soft-delete actions with user identification
- **Restore operations**: Records restoration activities with admin user details

### Audit Log Details
All drone audit entries include:
- Entity type: `'drone'`
- Entity ID: Drone document ID
- Action: `'create'`, `'edit'`, `'delete'`, or `'restore'`
- User ID and email for accountability
- Timestamp with platform detection (web/iOS/Android)
- Application version and commit hash
- Detailed change descriptions for human readability
- Previous and new values for audit compliance

### Viewing Audit Logs
Administrators can view drone-specific audit trails:
- Access via "Audit Logs" menu (admin only)
- Filter by entity type `'drone'` or specific drone ID
- View complete history of all drone operations
- Track user accountability for compliance

## Cross-Entity Relationships

The drone registry integrates with other system entities:

### Flight Integration
- **Drone Selection**: Flights reference specific drones via `droneId` field
- **Drone Name Caching**: Flight records cache `droneName` for efficient list display
- **Cross-referencing**: Flights can be filtered or searched by associated drone
- **Data Consistency**: Drone soft-deletion doesn't affect historical flight records

### User Integration
- **Ownership Tracking**: All drone operations track creating and updating users
- **Role-based Access**: Drone visibility and actions respect user roles (user/manager/admin)
- **User Profile Display**: Audit trails resolve user IDs to email addresses for readability

### Procedures Integration
- **Equipment Procedures**: Procedures and checklists can reference specific drone models
- **Safety Checklists**: Pre-flight procedures can be drone-specific
- **Maintenance Records**: Future enhancement for drone-specific maintenance procedures

## Entity Data Flow
```
Users ──→ Create/Update Drones ──→ Generate Audit Logs
  │              │                       ↓
  │              ↓                  Compliance Tracking
  │         Flight Assignment              ↓
  │              │                    Admin Review
  ↓              ↓                       ↓
Role-based    Flight Records ──→ Operational Reports
Access Control     │
                   ↓
            Historical Data
```

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
- ✅ **Access complete audit trail for all drone operations**
- ✅ **View user accountability and change history**
- ✅ **Enhanced UI with deletion status badges and restore capabilities**

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
  // Basic fields
  name: string,
  callSign: string,
  registrationNumber: string,
  location: string,
  totalFlightTime: number, // in minutes (changed from hours)
  
  // Physical specifications (updated units)
  operatingTime: number, // in minutes (changed from hours)
  range: number, // in meters (changed from km)
  weight: number, // in grams (changed from kg)
  maxTakeoffWeight: number, // in grams (changed from kg)
  dimensions: {
    length: number, // in mm (changed from cm)
    width: number, // in mm (changed from cm)
    height: number // in mm (changed from cm)
  },
  
  // Other fields
  maxSpeed: number, // in km/h (unchanged)
  battery: {
    type: string,
    capacity: number, // in mAh
    voltage: number // in V
  },
  
  // Soft-delete fields
  isDeleted: boolean,
  deletedAt: timestamp | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Key Features

1. **Role-based permissions** enforced both in UI and backend logic
2. **Soft-delete functionality** with admin restore capability
3. **Comprehensive drone management** with all required fields in updated units
4. **Enhanced unit formatting** for better user experience and readability
5. **Real-time data** with refresh functionality
6. **Professional UI** with clear visual indicators for deleted items
7. **Form validation** and error handling
8. **Responsive design** optimized for mobile devices
9. **Complete audit trail integration** with user tracking and change history
10. **Cross-entity relationships** with flights and user management
11. **Admin-enhanced capabilities** including deletion status and restoration tools
12. **Platform detection** for comprehensive operational tracking

## Technical Implementation

- Uses Firestore queries with role-based filtering
- Implements proper TypeScript typing throughout
- Follows React Native best practices
- Uses Expo Router for navigation
- Includes proper error handling and user feedback
- Follows the existing codebase patterns and styling
- **Full audit log integration** with AuditLogService and UserService
- **Platform detection** and application metadata tracking
- **Cross-entity data relationships** with flights and users
- **Enhanced admin UI features** with status indicators and action controls