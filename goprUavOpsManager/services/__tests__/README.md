# Service Layer Unit Tests

This directory contains comprehensive unit tests for the service layer of the GOPR UAV Ops Manager application. The tests are designed to run independently without requiring the full application stack.

## Testing Approach

### Philosophy
- **Unit Testing**: Each service is tested in isolation with all external dependencies mocked
- **Permission-First**: Heavy focus on role-based access control and security testing
- **Error Resilience**: Comprehensive error handling and edge case coverage
- **Business Logic**: Validation of core business rules and data transformations

### Test Structure
Each service test file follows a consistent structure:
1. **Permission Logic Tests** - Role-based access control validation
2. **Business Logic Tests** - Core functionality and data processing
3. **Error Handling and Side Effects** - Exception scenarios and audit logging
4. **Role-based Access Scenarios** - End-to-end permission workflows
5. **Integration Verification** - Mocked external service interactions

## Test Accounts

The following test accounts are used throughout the test suites:

```typescript
// Admin account - Full system access
admin@example.com / admin123
- Role: admin
- UID: admin-uid-123
- Permissions: Create, read, update, delete all entities; manage user roles

// Manager account - Management operations
manager@example.com / manager123  
- Role: manager
- UID: manager-uid-456
- Permissions: Create, read, update, delete most entities; view all users

// User account - Limited access
user@example.com / user123
- Role: user
- UID: user-uid-789
- Permissions: Read access to public data; manage own profile and flights
```

## Service Coverage

### DroneService Tests (`droneService.test.ts`)
- ✅ Permission logic: `canModifyDrones()`, `canViewDeletedDrones()`
- ✅ Business logic: `formatFlightTime()` utility
- ✅ Access control for drone operations
- ✅ Image processing integration
- ✅ Audit logging verification

### FlightService Tests (`flightService.test.ts`)
- ✅ Flight access control (owner/admin/manager permissions)
- ✅ Flight creation and user association
- ✅ Repository delegation patterns
- ✅ Audit trail creation
- ✅ Error handling scenarios

### UserService Tests (`userService.test.ts`) 
- ✅ User profile access permissions
- ✅ Role modification restrictions (admin-only)
- ✅ Self-service profile management
- ✅ User listing access control
- ✅ Audit logging for user changes

### ProcedureChecklistService Tests (`procedureChecklistService.test.ts`)
- ✅ Permission logic: `canModifyProcedures()`
- ✅ Deleted item visibility (admin-only)
- ✅ Checklist item processing
- ✅ Image upload integration
- ✅ Access control validation

### AuditLogService Tests (`auditLogService.test.ts`)
- ✅ Audit log creation with metadata
- ✅ Error resilience (non-blocking failures)
- ✅ Application metadata integration
- ✅ Change detail formatting
- ✅ Console logging verification

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test Suite
```bash
# Single service
npm test -- droneService.test.ts

# Pattern matching
npm test -- --testNamePattern="Permission Logic"
```

## Mock Strategy

### Repository Mocking
All repository classes are mocked to isolate service logic:
```typescript
jest.mock('@/repositories/DroneRepository');
const mockDroneRepository = {
  getDrones: jest.fn(),
  getDrone: jest.fn(),
  createDrone: jest.fn(),
  // ...
};
```

### External Service Mocking
Dependencies like AuditLogService, UserService, and ImageService are mocked:
```typescript
jest.mock('../auditLogService');
const mockAuditLogService = {
  createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
};
```

### Utility Mocking
Utility functions like date formatters and image processors are mocked to focus on business logic.

## Best Practices

### Test Organization
- Group related tests using `describe()` blocks
- Use descriptive test names that explain the scenario
- Follow the Arrange-Act-Assert pattern

### Mocking Guidelines
- Clear all mocks between tests with `jest.clearAllMocks()`
- Use realistic mock return values
- Verify mock calls with proper expectations

### Permission Testing
- Test all role combinations (admin, manager, user)
- Verify both positive and negative authorization cases
- Test edge cases like deleted entities and missing permissions

### Error Testing
- Test repository failures and network errors
- Verify that audit logging failures don't break main operations
- Ensure proper error messages are thrown

## Debugging Tests

### Common Issues
1. **Import Errors**: Ensure all TypeScript paths are correctly mapped in Jest config
2. **Mock Timing**: Use `await` for async operations and `.mockResolvedValue()` for promises
3. **Type Errors**: Cast to `any` when accessing private methods for testing

### Debug Commands
```bash
# Run with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --testNamePattern="should allow admin" --verbose

# Run with coverage to see what's not tested
npm run test:coverage
```

## Future Enhancements

This test suite provides a solid foundation for:
- Integration testing with real database connections
- End-to-end testing with full application stack
- Performance testing for service operations
- Security testing with real authentication flows

The current unit tests ensure that business logic and permissions work correctly in isolation, making it safe to add more complex testing scenarios in future iterations.