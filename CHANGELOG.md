# Changelog

All notable changes to the GOPR UAV Ops Manager application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.36] - 2025-09-02

### Added
- System Audit Log screen for admins with advanced filtering, pagination, and metadata (entity type, action, user, timestamps, platform, version, commit).
- Refactor: ProcedureChecklist and AuditLog services now use dedicated repository layers for improved code structure.
- Retry pattern added to Firestore utilities for connection resilience.

### Changed
- Refactored User, Drone, Flight, ProcedureChecklist, and AuditLog services to use repositories for data access.
- Audit logs now record changes for all major entities (Drone, Flight, Procedure/Checklist, User), including create, edit, delete, restore, and view actions.
- Dashboard refactored to use ScrollView with a 2-column layout and navigation buttons.

### Fixed
- UI polish and error message consistency in audit log screens.
- Minor UI inconsistencies in dashboard and entity screens.

## [1.0.35] - 2025-09-02

### Added
- Admins can restore deleted Drones, Flights, and Procedures/Checklists.
- Restore actions trigger audit log entries and UI feedback.
- Restored entities are immediately available and marked as active.

### Changed
- Permission logic for restore actions enforced (admin only).
- UI updated to show "deleted" badge for deleted entities and restore option for admins.

### Fixed
- Fixed edge cases when restoring entities with missing user/audit data.

## [1.0.34] - 2025-08-28

### Added
- Soft-delete feature for Drones, Flights, and Procedures/Checklists.
  - Deleted entities remain in the database but are hidden from non-admin views.
  - Audit logs record delete actions.
- List, detail, and edit screens now indicate deleted status and hide modification actions for deleted items.
- Admins can view and manage deleted entities.

### Changed
- Entity retrieval services filter out deleted entities for non-admins.
- UI and button controls for delete/restore are now role-based and context-aware.

### Fixed
- Non-admins no longer see deleted items in lists or details.
- Minor fixes to delete/restore dialog wording and error alerts.

## [1.0.33] - 2025-08-27

### Added
- Improved role-based access control across all screens:
  - Only admins and managers can view and manage users, drones, flights, and procedures.
  - Users can view and edit only their own profile and flights.
- Dashboard navigation is now dynamic based on user role (Admin, Manager, User).
- Polish and English language support improvements throughout the app.

### Changed
- Permission error alerts are now localized and more informative.
- Authentication and navigation flow refactored for reliability.
- Firebase utilities consolidated: created centralized firebaseUtils.ts to eliminate code duplication.

### Fixed
- Fixed navigation issues on access denied scenarios.
- React Native Firebase compatibility for Android and web.
- Fixed "Unexpected text node" errors, totalCount parser, and various typescript errors.
- Session persistence improvements for native and web platforms.
- Various UI polish and bug fixes in main screens.

## [1.0.32] - 2025-08-26

### Enhanced
- Improved application stability and performance optimizations
- Updated dependencies and security patches
- Enhanced UI responsiveness across all platforms

### Fixed
- Minor bug fixes and performance improvements
- Improved error handling and user feedback

## [1.0.31] - 2025-08-26

### Enhanced
- Refined audit logging system with better performance
- Improved form validation across all entities
- Enhanced mobile experience with better keyboard handling

### Fixed
- Resolved minor UI inconsistencies
- Fixed date picker compatibility issues on web platform

## [1.0.30] - 2025-08-26

### Enhanced
- Optimized Firestore query performance
- Improved real-time data synchronization
- Enhanced error reporting through Sentry integration

### Fixed
- Fixed soft-delete restoration functionality
- Resolved image upload issues on certain devices

## [1.0.29] - 2025-08-25

### Enhanced
- Improved drawer navigation performance
- Enhanced role-based UI element visibility
- Optimized application bundle size

### Fixed
- Fixed authentication state management edge cases
- Resolved internationalization loading issues

## [1.0.28] - 2025-08-23

### Enhanced
- Enhanced audit trail filtering capabilities
- Improved pagination performance for large datasets
- Better platform detection for audit logging

### Fixed
- Fixed Google Workspace SSO on mobile platforms
- Resolved form submission edge cases

## [1.0.27] - 2025-08-22

### Enhanced
- Improved Info & Contact screen layout
- Enhanced application metadata display
- Better version tracking and display

### Fixed
- Fixed image preview functionality
- Resolved date formatting issues across locales

## [1.0.26] - 2025-08-22

### Enhanced
- Optimized Firebase Storage integration
- Improved image upload progress indicators
- Enhanced error handling for network failures

### Fixed
- Fixed procedure checklist image display
- Resolved authentication token refresh issues

## [1.0.25] - 2025-08-22

### Enhanced
- Improved user management interface
- Enhanced role assignment workflow for admins
- Better validation for user qualification fields

### Fixed
- Fixed user profile update functionality
- Resolved operator number validation

## [1.0.24] - 2025-08-22

### Enhanced
- Enhanced audit log search and filtering
- Improved deep diff functionality for change tracking
- Better formatting of audit trail details

### Fixed
- Fixed audit log pagination issues
- Resolved timestamp display inconsistencies

## [1.0.23] - 2025-08-22

### Enhanced
- Improved drone management interface
- Enhanced flight logging capabilities
- Better validation for technical specifications

### Fixed
- Fixed soft-delete functionality for drones
- Resolved weight unit display issues

## [1.0.22] - 2025-08-20

### Enhanced
- Enhanced procedure checklist management
- Improved image handling for procedures
- Better form validation and error messages

### Fixed
- Fixed procedure creation workflow
- Resolved image upload validation

## [1.0.21] - 2025-08-20

### Enhanced
- Improved Polish language translations
- Enhanced English language support
- Better language switching functionality

### Fixed
- Fixed translation keys for new features
- Resolved locale-specific date formatting

## [1.0.20] - 2025-08-20

### Enhanced
- Enhanced Sentry error reporting configuration
- Improved crash reporting and analytics
- Better error boundary handling

### Fixed
- Fixed memory leaks in component lifecycle
- Resolved navigation state issues

## [1.0.19] - 2025-08-20

### Enhanced
- Improved web platform compatibility
- Enhanced responsive design for different screen sizes
- Better touch and mouse interaction handling

### Fixed
- Fixed web-specific authentication flows
- Resolved CSS styling issues on web platform

## [1.0.18] - 2025-08-20

### Enhanced
- Enhanced Firebase Functions for domain validation
- Improved security rules for Firestore collections
- Better role-based data access control

### Fixed
- Fixed domain restriction enforcement
- Resolved Firebase Functions deployment issues

## [1.0.17] - 2025-08-20

### Enhanced
- Improved Android deep linking configuration
- Enhanced app icon and splash screen design
- Better adaptive icon implementation

### Fixed
- Fixed Android package name conflicts
- Resolved version code synchronization

## [1.0.16] - 2025-08-20

### Enhanced
- Enhanced iOS platform support
- Improved tablet compatibility
- Better bundle identifier management

### Fixed
- Fixed iOS build configuration issues
- Resolved certificate validation problems

## [1.0.15] - 2025-08-20

### Added
- Comprehensive audit logging system
- Real-time audit trail for all CRUD operations
- Platform detection (web/iOS/Android) in audit logs
- User activity tracking with detailed change history

### Enhanced
- Improved security with detailed activity monitoring
- Enhanced compliance capabilities
- Better data integrity tracking

## [1.0.14] - 2025-08-20

### Enhanced
- Improved soft-delete functionality
- Enhanced admin restore capabilities
- Better deleted item management

### Fixed
- Fixed restore workflow edge cases
- Resolved soft-delete state synchronization

## [1.0.13] - 2025-08-20

### Added
- Firebase Storage integration
- Image upload functionality for procedures
- Image preview and management capabilities

### Enhanced
- Rich media support for procedure documentation
- Better visual procedure guidance
- Enhanced user experience with visual aids

## [1.0.12] - 2025-08-19

### Enhanced
- Improved form validation across all entities
- Enhanced error messaging and user feedback
- Better input sanitization and validation

### Fixed
- Fixed validation edge cases
- Resolved form submission race conditions

## [1.0.11] - 2025-08-19

### Added
- Real-time data synchronization with Firestore
- Live updates across all connected clients
- Enhanced data consistency

### Enhanced
- Improved application responsiveness
- Better collaboration capabilities
- Enhanced multi-user experience

## [1.0.10] - 2025-08-19

### Added
- Advanced role-based access control
- Admin-only user management features
- Manager-level access controls
- Role-dependent UI elements

### Enhanced
- Granular permission system
- Secure data access patterns
- Better administrative capabilities

## [1.0.9] - 2025-08-19

### Added
- Comprehensive internationalization (i18n) support
- Polish language interface
- English language interface
- Dynamic language switching

### Enhanced
- Localized user experience
- Better accessibility for Polish users
- Professional multilingual interface

## [1.0.8] - 2025-08-18

### Added
- Google Workspace Single Sign-On (SSO)
- Domain restriction to @bieszczady.gopr.pl
- Firebase Functions for domain validation
- Enhanced authentication security

### Enhanced
- Streamlined login process for organization members
- Better security through domain restrictions
- Professional authentication flow

## [1.0.7] - 2025-08-18

### Enhanced
- Improved drawer navigation interface
- Better menu organization and accessibility
- Enhanced navigation performance

### Fixed
- Fixed navigation state management
- Resolved drawer animation issues

## [1.0.6] - 2025-08-18

### Added
- Soft-delete functionality for critical entities
- Admin restore capabilities
- Safe deletion with recovery options

### Enhanced
- Better data protection
- Enhanced administrative controls
- Improved data recovery workflows

## [1.0.5] - 2025-08-18

### Added
- Procedures and Checklists management
- CRUD operations for operational procedures
- Structured checklist system

### Enhanced
- Comprehensive operational documentation
- Better procedure standardization
- Enhanced operational safety

## [1.0.4] - 2025-08-18

### Added
- Users management system
- User profile management
- Operator information tracking
- Insurance and qualification tracking

### Enhanced
- Complete user lifecycle management
- Better personnel tracking
- Enhanced compliance capabilities

## [1.0.3] - 2025-08-18

### Added
- Flight management system
- Flight logging and tracking
- CRUD operations for flight records

### Enhanced
- Comprehensive flight documentation
- Better operational tracking
- Enhanced record keeping

## [1.0.2] - 2025-08-18

### Added
- Drone registry management
- CRUD operations for drone entities
- Technical specifications tracking
- Weight and performance data

### Enhanced
- Complete fleet management
- Better equipment tracking
- Enhanced inventory control

## [1.0.1] - 2025-08-18

### Added
- Firebase Authentication integration
- Email/password authentication
- User session management
- Basic security implementation

### Enhanced
- Secure user authentication
- Protected application access
- Professional login experience

### Fixed
- Initial security vulnerabilities
- Authentication flow improvements

## [1.0.0] - 2025-08-17

### Added
- Initial release of GOPR UAV Ops Manager
- Multi-platform support (Web, iOS, Android)
- Firebase project integration
- Basic application structure
- React Native with Expo framework
- TypeScript implementation
- Professional UI foundation

### Features
- Modern mobile-first design
- Cross-platform compatibility
- Professional user interface
- Secure foundation architecture
- Scalable application structure

---

## Release Notes

This application uses semantic versioning with automatic patch version bumping. Each merge to the main branch automatically increments the patch version and updates both `package.json` and `app.json` files.

### Version Format
- **Major**: Breaking changes (1.x.x)
- **Minor**: New features, backwards compatible (x.1.x)
- **Patch**: Bug fixes, backwards compatible (x.x.1)

### Platforms Supported
- **Web**: Modern web browsers with responsive design
- **iOS**: Native iOS application with tablet support
- **Android**: Native Android application with adaptive icons

### Key Technologies
- **Framework**: React Native with Expo SDK
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with Google Workspace SSO
- **Storage**: Firebase Storage for image handling
- **Internationalization**: i18next with Polish and English support
- **Error Reporting**: Sentry integration
- **Type Safety**: TypeScript throughout the application
