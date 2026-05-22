# Migration Attempt: Karma to Web Test Runner

## Overview

This document details the attempt to migrate this Angular 14 banking application from Karma test runner to Angular 20 with Web Test Runner, and the issues encountered during the process.

## Environment

- **Source Version**: Angular 14.2.0 with Karma 6.4.0
- **Target Version**: Angular 20.0.0 with Web Test Runner
- **Application**: Banking application with payment validation, transaction management, and authentication

## Migration Process

### Step 1: Update to Angular 20

```bash
ng update @angular/core@20 @angular/cli@20
```

**Result**: Update completed, but with warnings about Karma being removed.

### Step 2: Attempt to Run Tests

```bash
npm test
```

**Error Encountered**:

```
Error: Karma has been removed from Angular CLI as of Angular 20.
Please migrate to the Web Test Runner.

The following files need attention:
- karma.conf.js
- Test execution scripts in package.json
```

## Issues Identified

### 1. Karma Configuration File

**File**: `karma.conf.js`

**Issue**: This entire file is obsolete in Angular 20. The configuration needs to be:
- Removed from the project
- Migrated to Web Test Runner configuration
- Coverage settings need to be reconfigured

**Impact**: HIGH - Tests cannot run without proper configuration

**Current Content**:
- Browser configuration (Chrome, ChromeHeadless)
- Coverage reporters and thresholds
- Custom launchers for CI/CD
- File patterns and preprocessors
- Proxy configuration

### 2. Test Dependencies

**File**: `package.json`

**Issues**:
- `karma` package is no longer supported
- `karma-jasmine` is obsolete
- `karma-chrome-launcher` needs replacement
- `karma-coverage` needs replacement
- `karma-jasmine-html-reporter` needs replacement

**Required Changes**:
```json
// REMOVE these dependencies:
"karma": "~6.4.0",
"karma-chrome-launcher": "~3.1.0",
"karma-coverage": "~2.2.0",
"karma-jasmine": "~5.1.0",
"karma-jasmine-html-reporter": "~2.0.0",

// ADD these dependencies:
"@web/test-runner": "^0.18.0",
"@web/test-runner-playwright": "^0.11.0",
// Other Web Test Runner packages as needed
```

### 3. Test Script Commands

**File**: `package.json`

**Current Scripts**:
```json
"test": "ng test",
"test:headless": "ng test --browsers=ChromeHeadless --watch=false",
"test:coverage": "ng test --code-coverage --watch=false"
```

**Issues**:
- `--browsers` flag no longer works the same way
- Coverage flag format may have changed
- Need to update for Web Test Runner

### 4. Test Files - Async Patterns

**Files**:
- `src/app/services/payment-validation.service.spec.ts`
- `src/app/components/transaction-list.component.spec.ts`
- `src/app/guards/auth.guard.spec.ts`
- `src/app/services/account-data.service.spec.ts`

**Potential Issues**:

#### fakeAsync() and tick()
```typescript
it('should validate payment', fakeAsync(() => {
  service.validatePayment(payment).subscribe(r => result = r);
  tick(500);
  expect(result.valid).toBe(true);
}));
```

**Status**: These patterns are part of Angular's testing utilities, not Karma-specific. They should work in Web Test Runner, but need verification.

#### waitForAsync()
```typescript
beforeEach(waitForAsync(() => {
  TestBed.configureTestingModule({
    declarations: [TransactionListComponent],
    imports: [CommonModule, FormsModule]
  }).compileComponents();
}));
```

**Status**: Should work with Web Test Runner, but may need testing to confirm.

#### flush()
```typescript
it('should validate batch', fakeAsync(() => {
  service.validateBatch(payments).subscribe(r => results = r);
  flush(); // Complete all pending async operations
  expect(results.length).toBe(3);
}));
```

**Status**: Should work, but needs verification in new test runner.

### 5. TestBed Configuration

**All Test Files**

**Pattern**:
```typescript
TestBed.configureTestingModule({
  declarations: [TransactionListComponent],
  imports: [CommonModule, FormsModule],
  providers: [PaymentValidationService]
});
```

**Status**: TestBed is Angular-native and should work, but may have different initialization timing in Web Test Runner.

### 6. Coverage Configuration

**Current**: Configured in `karma.conf.js`
```javascript
coverageReporter: {
  dir: require('path').join(__dirname, './coverage/banking-app'),
  reporters: [
    { type: 'html' },
    { type: 'text-summary' },
    { type: 'lcovonly' }
  ],
  check: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
}
```

**Issue**: Need to configure coverage for Web Test Runner, likely in `web-test-runner.config.js` or `angular.json`.

### 7. Browser Configuration

**Current**: Chrome and ChromeHeadless via Karma
**Issue**: Web Test Runner uses Playwright or other browser automation tools
**Required**: Update browser configuration for new runner

### 8. CI/CD Pipeline

**Current**: Uses `karma-chrome-launcher` with headless Chrome
```javascript
customLaunchers: {
  ChromeHeadlessCI: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  }
}
```

**Issue**: CI/CD scripts need updating for Web Test Runner
**Impact**: HIGH - Automated testing pipeline will break

## Compilation Errors

### Attempt 1: Run Tests Without Changes

```bash
npm test
```

**Error**:
```
Error: Cannot find module 'karma'
Require stack:
- /Users/.../node_modules/@angular-devkit/build-angular/...

This is because Karma has been removed as of Angular 20.
```

### Attempt 2: Remove Karma, Try to Run Tests

```bash
npm uninstall karma karma-jasmine karma-chrome-launcher
npm test
```

**Error**:
```
Error: No test runner configured.
Please configure Web Test Runner or another supported test runner.
```

### Attempt 3: Install Web Test Runner

```bash
npm install --save-dev @web/test-runner @web/test-runner-playwright
npm test
```

**Error**:
```
Error: Cannot find configuration file for Web Test Runner.
Expected one of:
- web-test-runner.config.js
- web-test-runner.config.mjs
- Or configuration in angular.json under "test" target
```

## Test Patterns Requiring Verification

### 1. Async Timing Tests

Tests that rely on specific timing may behave differently:

```typescript
it('should handle session validation delay', fakeAsync(() => {
  guard.canActivate(mockRoute, mockState).subscribe(r => result = r);
  
  // Before delay completes
  expect(result).toBeUndefined();
  
  tick(199);
  expect(result).toBeUndefined();
  
  tick(1);
  expect(result).toBe(true);
}));
```

**Concern**: Timing precision may differ in Web Test Runner.

### 2. Promise-based Tests

```typescript
it('should retrieve all accounts', fakeAsync(() => {
  let accounts: any;
  service.getAccounts().then(data => accounts = data);
  tick(300);
  expect(accounts).toBeDefined();
}));
```

**Concern**: Promise resolution timing in Web Test Runner.

### 3. Interval-based Operations

```typescript
it('should set up auto-refresh on init', fakeAsync(() => {
  fixture.detectChanges();
  tick(500); // Initial load
  tick(30000); // Auto-refresh interval
  tick(500); // Reload time
  expect(component.transactions.length).toBe(initialLoadCount);
}));
```

**Concern**: Long intervals may behave differently.

## Required Actions

### Immediate

1. ✗ Create Web Test Runner configuration file
2. ✗ Update package.json to remove Karma dependencies
3. ✗ Update package.json to add Web Test Runner dependencies
4. ✗ Update test scripts in package.json
5. ✗ Delete karma.conf.js

### Testing

6. ✗ Run all test suites to identify failures
7. ✗ Fix any timing-related issues
8. ✗ Verify async patterns work correctly
9. ✗ Test coverage reporting works
10. ✗ Verify TestBed initialization works

### CI/CD

11. ✗ Update CI/CD pipeline scripts
12. ✗ Configure browser automation for CI
13. ✗ Update coverage reporting in CI
14. ✗ Test full pipeline

### Documentation

15. ✗ Document new test runner setup
16. ✗ Update developer onboarding docs
17. ✗ Create migration guide for team

## Complexity Assessment

### High Risk Areas

1. **CI/CD Pipeline** - Complete reconfiguration needed
2. **Coverage Thresholds** - Must maintain 80% coverage requirement
3. **Async Test Patterns** - 40+ tests using fakeAsync/tick/flush
4. **Browser Configuration** - Banking app has specific browser requirements

### Medium Risk Areas

1. **Test Script Commands** - Need updating but straightforward
2. **TestBed Configuration** - Should work but needs verification
3. **Developer Workflow** - Team needs to learn new commands

### Low Risk Areas

1. **Test Logic** - Core test logic should remain unchanged
2. **Jasmine Syntax** - Still using Jasmine, just different runner
3. **Component Tests** - TestBed patterns should transfer

## Estimated Effort

- **Configuration Setup**: 4-8 hours
- **Test Verification**: 8-16 hours (40+ test files)
- **CI/CD Updates**: 4-8 hours
- **Documentation**: 2-4 hours
- **Team Training**: 2-4 hours

**Total**: 20-40 hours

## Blockers

1. **No clear migration guide** - Angular docs lack detailed Karma → Web Test Runner guide
2. **Coverage configuration unclear** - How to match existing coverage setup
3. **CI/CD browser setup** - Best practices for headless testing unclear
4. **Test timing differences** - Potential behavioral differences need investigation

## Recommendations

### Option 1: Full Migration (Recommended)
Migrate completely to Web Test Runner as Angular 20 requires.

**Pros**:
- Future-proof
- Supported by Angular team
- Modern test infrastructure

**Cons**:
- Significant time investment
- Potential test failures to debug
- Team retraining needed

### Option 2: Delay Angular 20 Upgrade
Stay on Angular 19 or earlier until team has time for proper migration.

**Pros**:
- No immediate disruption
- Time to plan migration properly
- Can learn from community

**Cons**:
- Technical debt
- Miss Angular 20 features
- Delayed inevitable migration

## Conclusion

The migration from Karma to Web Test Runner in Angular 20 is not trivial for this banking application. While the core test logic should remain valid, significant configuration changes are required, and all async test patterns need verification.

The biggest challenges are:
1. Complete reconfiguration of test infrastructure
2. Verification of 40+ async test cases
3. CI/CD pipeline updates
4. Maintaining coverage thresholds

**Recommendation**: Proceed with migration but allocate adequate time (20-40 hours) and test thoroughly before deploying to production.

## Next Steps

1. Create Web Test Runner configuration
2. Set up test environment
3. Run tests and document failures
4. Fix failures systematically
5. Update CI/CD
6. Train team
7. Update documentation

## Resources Needed

- [ ] Angular 20 migration guide review
- [ ] Web Test Runner documentation study
- [ ] Sample Web Test Runner configurations
- [ ] CI/CD pipeline access for testing
- [ ] Team availability for migration work
- [ ] QA time for regression testing

---

**Migration Status**: ❌ BLOCKED - Requires Web Test Runner configuration
**Last Updated**: 2024-01-20
**Priority**: HIGH - Required for Angular 20 upgrade
