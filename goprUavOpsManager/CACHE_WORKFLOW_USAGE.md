# Cache-First Workflow Usage Guide

This document describes how to use the new cache-first workflow for procedures, checklists, and categories in the GOPR UAV Ops Manager application.

## Overview

The new workflow implements:
- **Cache-First Display**: Always show cached data immediately for instant UI and offline support
- **Fresh Data for Editing**: Always fetch latest data from Firestore when editing to prevent conflicts
- **Timestamp-Based Sync**: Use AppSettings service to track when data changes on server
- **Offline Support**: Graceful fallback to cached data when network is unavailable

## Key Services

### 1. AppSettingsService

Manages global timestamps for data synchronization:

```typescript
import { AppSettingsService } from '@/services/appSettingsService';

// Get current timestamps
const timestamps = await AppSettingsService.getLastUpdateTimestamps();
console.log('Categories last updated:', timestamps.categoriesLastUpdate);
console.log('Procedures last updated:', timestamps.proceduresLastUpdate);

// Update timestamps (automatically done by services on CRUD operations)
await AppSettingsService.updateCategoriesLastUpdate();
await AppSettingsService.updateProceduresLastUpdate();
```

**Note**: The AppSettings collection is initialized automatically via Firebase Function migrations, not in client code.

### 2. OfflineProcedureChecklistService

Enhanced with timestamp-based cache validation:

```typescript
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';
import { UserRole } from '@/types/UserRole';

// Display Mode: Cache-first for instant UI
const { procedures, isFromCache } = await OfflineProcedureChecklistService.getProcedureChecklists(
  UserRole.ADMIN,
  { forceOffline: false } // Default behavior - cache first
);

// Edit Mode: Force refresh to get latest data  
const { procedures: freshProcedures } = await OfflineProcedureChecklistService.getProcedureChecklists(
  UserRole.ADMIN, 
  { forceRefresh: true } // Always fetch fresh data for editing
);

// Offline Mode: Force use of cache
const { procedures: offlineProcedures } = await OfflineProcedureChecklistService.getProcedureChecklists(
  UserRole.ADMIN,
  { forceOffline: true } // Use cached data even if network available
);

// Background sync on app start
await OfflineProcedureChecklistService.preDownloadProcedures(UserRole.ADMIN);
```

### 3. OfflineCategoryService

New service with same patterns as procedures:

```typescript
import { OfflineCategoryService } from '@/services/offlineCategoryService';

// Display Mode: Cache-first
const categories = await OfflineCategoryService.getCategories(UserRole.ADMIN);

// Edit Mode: Force refresh
const freshCategories = await OfflineCategoryService.getCategories(UserRole.ADMIN, true);

// Background sync
await OfflineCategoryService.preDownloadCategories(UserRole.ADMIN);

// Cache management
await OfflineCategoryService.clearCache(); // Clear all cache
await OfflineCategoryService.invalidateCache(); // Force next access to refresh
```

## UI Component Usage Patterns

### Display Components (Lists, Cards, Dashboard)

Always use cache-first approach for instant loading:

```typescript
// ProcedureListScreen.tsx
import { OfflineProcedureChecklistService } from '@/services/offlineProcedureChecklistService';

const ProcedureListScreen = () => {
  const [procedures, setProcedures] = useState<ProcedureChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProcedures();
  }, [userRole]);

  const loadProcedures = async () => {
    try {
      setIsLoading(true);
      
      // Cache-first: Shows cached data immediately, even if stale
      const { procedures } = await OfflineProcedureChecklistService.getProcedureChecklists(userRole);
      setProcedures(procedures);
      
      // Background refresh if needed (handled automatically by timestamp checking)
      await OfflineProcedureChecklistService.preDownloadProcedures(userRole);
    } catch (error) {
      console.error('Error loading procedures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render list with procedures...
};
```

### Edit Components (Forms, Modals)

Always use force refresh to get latest data:

```typescript
// EditProcedureScreen.tsx  
const EditProcedureScreen = ({ procedureId }: { procedureId: string }) => {
  const [procedure, setProcedure] = useState<ProcedureChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProcedureForEdit();
  }, [procedureId]);

  const loadProcedureForEdit = async () => {
    try {
      setIsLoading(true);
      
      // Force refresh: Always get latest data when editing
      const { procedure } = await OfflineProcedureChecklistService.getProcedureChecklist(
        procedureId, 
        userRole,
        { forceRefresh: true }
      );
      setProcedure(procedure);
    } catch (error) {
      console.error('Error loading procedure for edit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render edit form with latest procedure data...
};
```

### Dashboard/App Initialization

Set up background sync on app start:

```typescript
// App.tsx or Dashboard component
const initializeDataSync = async () => {
  try {
    const { user } = useAuth();
    if (!user) return;

    // Background sync for procedures and categories
    // AppSettings collection is initialized via Firebase migrations
    await Promise.all([
      OfflineProcedureChecklistService.preDownloadProcedures(user.role),
      OfflineCategoryService.preDownloadCategories(user.role),
    ]);
    
    console.log('Background data sync completed');
  } catch (error) {
    console.error('Error during data sync:', error);
    // App continues with cached data
  }
};

useEffect(() => {
  initializeDataSync();
}, [user]);
```

## Error Handling

The services provide robust error handling:

```typescript
try {
  const { procedures } = await OfflineProcedureChecklistService.getProcedureChecklists(userRole);
  // Use procedures
} catch (error) {
  // Services automatically fall back to cached data when network fails
  // Show appropriate error message but app continues working
  console.error('Error loading procedures:', error);
}
```

## Offline Behavior

- **Display Mode**: Always works offline with cached data
- **Edit Mode**: Prompts user to connect if attempting to edit while offline  
- **Background Sync**: Silently fails offline, succeeds when back online
- **Cache Persistence**: Data remains available across app restarts

## Cache Invalidation

Cache is automatically invalidated when:
- Firestore timestamps indicate server data changed
- User role changes
- Cache version changes (app updates)
- Manual cache clearing

## Best Practices

1. **Use cache-first for all display/list components** - Ensures instant UI even offline
2. **Use force-refresh for all edit components** - Prevents editing stale data  
3. **Initialize background sync on app start** - Keeps cache updated
4. **Handle network errors gracefully** - Services provide fallbacks
5. **Don't manually manage cache timestamps** - Let services handle this automatically

## Migration from Old Approach

Replace direct service calls:

```typescript
// OLD: Direct service calls
const procedures = await ProcedureChecklistService.getProcedureChecklists(userRole);

// NEW: Cache-first via offline service
const { procedures } = await OfflineProcedureChecklistService.getProcedureChecklists(userRole);

// OLD: No distinction between display and edit
const procedure = await ProcedureChecklistService.getProcedureChecklist(id, userRole);

// NEW: Explicit intent
// For display:
const { procedure } = await OfflineProcedureChecklistService.getProcedureChecklist(id, userRole);
// For editing:
const { procedure } = await OfflineProcedureChecklistService.getProcedureChecklist(id, userRole, { forceRefresh: true });
```

This new workflow ensures optimal user experience with instant loading, reliable offline support, and data consistency for editing operations.