# Procedures & Checklists Implementation

This document outlines the implementation of the Procedures & Checklists module in the GOPR UAV Ops Manager.

## Overview

The Procedures & Checklists module allows managers and administrators to create, edit, and manage operational procedures and checklists with complete field editing and image upload support.

## Features Implemented

### Data Model
- **ProcedureChecklist**: Main entity containing title, description, and checklist items
- **ChecklistItem**: Individual items with topic, content, image, number (sequence), link, and file support
- **Soft-delete functionality**: Items are never permanently deleted, can be restored by admins
- **Timestamps**: Created, updated, and deleted timestamps for audit trail

### Screens

#### procedures-checklists-list.tsx
- Lists all procedures/checklists with role-based filtering
- Create new procedure/checklist button (managers/admins only)
- View, edit, delete actions based on user role
- Admin-only restore functionality for deleted items
- Empty state with helpful messaging
- Refresh functionality with pull-to-refresh

#### procedures-checklist-details.tsx
- Displays complete procedure/checklist details
- Shows all checklist items in sequence order
- Image display for items with images
- Clickable links and file attachments
- Role-based action buttons (edit, delete, restore)
- Responsive design for mobile devices

#### procedures-checklist-form.tsx
- Unified create/edit form
- Dynamic checklist item management (add/remove items)
- Image upload via Expo ImagePicker
- Form validation and error handling
- Auto-numbering of checklist items
- File attachment support
- Keyboard-avoiding view for mobile

### Service Layer

#### procedureChecklistService.ts
- Complete CRUD operations with role-based access control
- Firebase Storage integration for image uploads
- Firestore queries with proper filtering
- Image processing and upload handling
- Error handling and validation
- Soft-delete and restore functionality

### Navigation & Access Control

#### Role-Based Access
- **User**: View-only access to non-deleted procedures
- **Manager**: Create, edit, delete procedures (soft-delete only)
- **Admin**: Full access including restore deleted procedures

#### Navigation Integration
- Added to drawer navigation (visible to managers/admins only)
- Proper routing configuration in _layout.tsx
- Hidden detail and form screens from drawer menu

### Firebase Integration

#### Firestore Collection: `procedures_checklists`
```javascript
{
  title: string,
  description: string,
  items: ChecklistItem[],
  createdBy: string,
  isDeleted: boolean,
  deletedAt: timestamp | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Firebase Storage
- Images stored in `procedures_checklists/images/` path
- Automatic file naming with timestamps
- Proper cleanup on image replacement

#### Required Firestore Indexes
The following composite index is required for proper query performance:

**Collection**: `procedures_checklists`
**Fields**: 
- `isDeleted` (Ascending)
- `createdAt` (Descending)

This index supports the query used by managers and users to list non-deleted procedures ordered by creation date. The index can be created in the Firebase Console under Firestore Database → Indexes.

## Technical Implementation

### Dependencies Added
- `expo-image-picker`: Image selection from device library
- Firebase Storage support in firebaseConfig.ts

### Code Quality
- TypeScript throughout with proper typing
- Consistent styling with existing app patterns
- Error handling and user feedback
- Form validation and loading states
- Responsive design considerations

### Testing
- Linting passes without errors
- Build completes successfully
- Navigation integration works correctly
- Role-based access properly implemented

## Usage Flow

1. **Manager/Admin logs in** → sees "Procedures & Checklists" in drawer menu
2. **View list** → see all procedures with action buttons based on role
3. **Create new** → fill form, add items, upload images, save
4. **View details** → see formatted procedure with images and links
5. **Edit existing** → modify any field, add/remove items, change images
6. **Delete** → soft-delete (admin can restore later)

## Security & Permissions

- Role-based access enforced in both UI and service layer
- Only authenticated users can access procedures
- Managers and admins can modify content
- Admins have additional restore capabilities
- Firebase Security Rules should be configured accordingly

## Future Enhancements

- File upload support (similar to image upload)
- Procedure templates
- Version history tracking
- Export to PDF functionality
- Search and filtering capabilities
- Procedure categories/tags