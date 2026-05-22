# Scenario 09: Karma Test Runner Removal

## Overview

This scenario demonstrates the challenges of migrating from Karma test runner to the new Web Test Runner in Angular 20+. Angular 20 removed Karma support, requiring migration of all test configurations and patterns.

## Problem Description

### What Changed in Angular 20

Angular 20 removed Karma test runner support in favor of the new Web Test Runner. This affects:

1. **Test Runner Configuration**: `karma.conf.js` is no longer supported
2. **Test Utilities**: Some Karma-specific test patterns need updating
3. **Build System**: Test execution infrastructure changed completely
4. **Dependencies**: Karma and related packages must be removed

### Impact on Banking Applications

Banking applications typically have:
- Extensive test suites with complex async patterns
- Tests using `fakeAsync()`, `tick()`, and `flush()`
- Component tests with `TestBed` configuration
- Service tests with HTTP mocking
- Guard and interceptor tests with routing

All these tests need to be verified to work with the new test runner.

## Current State (Angular 14.2.0)

This scenario includes a banking application with:

### Services
- **PaymentValidationService**: Validates payment transactions with async operations
- **AccountDataService**: Manages account data retrieval

### Components
- **TransactionListComponent**: Displays and filters transaction history

### Guards
- **AuthGuard**: Protects routes requiring authentication

### Test Configuration
- **karma.conf.js**: Full Karma configuration with Chrome headless
- Tests using Karma-specific patterns and utilities

## Migration Challenges

### 1. Configuration Migration

**Before (karma.conf.js)**:
```javascript
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage')
    ],
    // ... extensive configuration
  });
};
```

**After (Web Test Runner)**: Configuration moves to `angular.json` and specialized config files.

### 2. Async Test Patterns

Tests heavily use:
- `async()` and `waitForAsync()` for async operations
- `fakeAsync()` and `tick()` for simulating time passage
- `flush()` for completing all pending async operations

These patterns need verification in the new test runner.

### 3. TestBed Configuration

Component tests use extensive `TestBed` configuration:
```typescript
TestBed.configureTestingModule({
  declarations: [TransactionListComponent],
  imports: [CommonModule],
  providers: [...]
});
```

### 4. Coverage Reporting

Karma coverage configuration needs to be migrated to the new system.

## Files Included

### Source Files
- `src/app/services/payment-validation.service.ts`
- `src/app/components/transaction-list.component.ts`
- `src/app/guards/auth.guard.ts`

### Test Files
- `src/app/services/payment-validation.service.spec.ts`
- `src/app/services/account-data.service.spec.ts`
- `src/app/components/transaction-list.component.spec.ts`
- `src/app/guards/auth.guard.spec.ts`

### Configuration
- `package.json` - Dependencies including Karma
- `karma.conf.js` - Karma configuration

### Documentation
- `MIGRATION-ATTEMPT.md` - Details of migration issues
- `devin-session-prompt.txt` - Task prompt for migration

## Testing the Scenario

### In Angular 14 (Current State)

```bash
npm install
npm test
```

All tests should pass with Karma.

### In Angular 20 (Migration Target)

```bash
npm install
npm test
```

Tests will fail to run because:
1. Karma is no longer supported
2. Configuration needs migration
3. Test patterns need verification

## Migration Steps Required

1. **Remove Karma Dependencies**
   - Remove karma and karma-* packages from package.json
   - Remove karma.conf.js

2. **Configure Web Test Runner**
   - Update angular.json test configuration
   - Add any necessary Web Test Runner config files

3. **Update Test Patterns**
   - Verify async test patterns work correctly
   - Update any Karma-specific test utilities
   - Ensure TestBed configuration is compatible

4. **Update Coverage Configuration**
   - Configure coverage reporting for Web Test Runner
   - Update coverage thresholds and reporters

5. **Verify All Tests**
   - Run full test suite
   - Fix any compatibility issues
   - Ensure coverage reports generate correctly

## Key Learning Points

1. **Test Runner Independence**: Write tests that don't depend on specific runner features
2. **Standard Patterns**: Use Angular testing utilities that work across runners
3. **Configuration Management**: Keep test configuration maintainable and documented
4. **Async Testing**: Understand async test patterns and their execution

## Success Criteria

- All tests run successfully with Web Test Runner
- Coverage reporting works correctly
- Test execution time is comparable or better
- No Karma dependencies remain
- CI/CD pipeline updated for new test runner

## Common Pitfalls

1. **Overlooking karma.conf.js**: Easy to miss this file during migration
2. **Coverage Configuration**: Coverage setup differs between runners
3. **Browser Configuration**: Browser launch configuration changes
4. **Watch Mode**: Watch mode behavior may differ
5. **File Patterns**: File inclusion patterns may need adjustment

## Additional Resources

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Web Test Runner Documentation](https://modern-web.dev/docs/test-runner/overview/)
- [Angular Update Guide](https://update.angular.io/)

## Notes

This scenario represents a real-world banking application test suite that must be migrated. The complexity and async patterns are typical of production Angular applications in the financial sector.
