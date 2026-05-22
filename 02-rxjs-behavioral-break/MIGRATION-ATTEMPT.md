# Migration Attempt — RxJS Silent Error Breaking

## Naive Migration Approach

Developer runs the standard Angular update command without pre-migration audits:

```bash
ng update @angular/core@20 @angular/cli@20
```

## What Happens

### Step 1: Migration completes successfully ✓

```
Updating package.json with dependency @angular/core @ "20.0.0"
Updating package.json with dependency rxjs @ "8.0.0"
UPDATE package.json (1234 bytes)
✔ Packages installed successfully.
```

### Step 2: Build succeeds ✓

```bash
ng build --configuration=production
```

Output:
```
✔ Browser application bundle generation complete.
✔ Copying assets complete.
✔ Index html generation complete.

Initial Chunk Files               | Names         |  Raw Size
main.a8f4bc2d7e3f1234.js         | main          |   287.42 kB |
styles.3d8a9c1f2e4b5678.css      | styles        |    45.18 kB |

Build at: 2026-05-19T14:32:17.442Z - Hash: 8f3a2c1b4d5e - Time: 12847ms

✔ Built successfully
```

No compilation errors. No warnings about subscribe patterns.

### Step 3: Unit tests pass ✓

```bash
ng test --watch=false
```

Output:
```
Chrome Headless 98.0.4758.102 (Mac OS 10.15.7)
  FundTransferComponent
    ✓ should create
    ✓ should validate form correctly
    ✓ should submit payment when form is valid

Executed 3 of 3 tests SUCCESS (2.847 secs / 2.134 secs)
```

**Why tests pass:** The unit tests only test the happy path:

```typescript
it('should submit payment when form is valid', () => {
  const mockResponse: PaymentResponse = {
    transactionId: 'TXN_123',
    status: 'success',
    timestamp: new Date(),
    confirmationNumber: 'CONF-ABC123'
  };

  spyOn(paymentService, 'submitPayment').and.returnValue(of(mockResponse));

  component.submitTransfer();

  expect(component.successMessage).toBe('Transfer of $100 completed successfully!');
});
```

There's NO test that verifies error handling. The error path is never exercised.

### Step 4: Code review passes ✓

Reviewer sees:
- All tests passing ✓
- Build successful ✓
- No TypeScript compilation errors ✓
- No obvious code changes in the payment component ✓

PR is approved and merged.

### Step 5: Deploy to production ✓

```
Deployment successful to production
URL: https://banking.example.com
Status: 200 OK
Health check: PASSED
```

---

## Production Failure (Discovered by Customers)

### Timeline

**2:00 PM** - Deployment completes
**2:14 PM** - First customer attempts payment, gets insufficient funds rejection
**2:14 PM** - Customer sees infinite loading spinner, calls customer service
**2:18 PM** - Three more customer complaints: "payment screen is stuck"
**2:22 PM** - Customer service rep attempts test payment, sees the same issue
**2:25 PM** - P1 incident declared: "Payment error messages not displaying"
**2:30 PM** - Engineering team investigates, sees browser console errors but no user-visible messages
**3:15 PM** - Root cause identified: RxJS 8 error handler not firing
**3:45 PM** - Emergency hotfix deployed with correct subscribe syntax
**4:00 PM** - Incident resolved

### Customer Impact

**Duration:** 1 hour 46 minutes
**Affected payment attempts:** 2,847 (attempted during outage window)
**Successful payments:** 1,994 (70% success rate)
**Failed payments with no error message:** 853 (30% failure rate)
**Customer service calls:** 342
**Social media complaints:** 27
**Escalations to management:** 14

### What Customers Saw

When a payment was rejected (insufficient funds, invalid account, limit exceeded):

**Expected behavior (Angular 14):**
```
⚠️ Payment Failed
INSUFFICIENT_FUNDS
Insufficient funds in source account
Available balance is less than $500.00
[Try Again] button
```

**Actual behavior (Angular 20 with broken RxJS):**
```
[Loading spinner spinning forever]
Processing your transfer...
```

The user has no idea what happened. Did the payment go through? Should they try again? Is their money gone?

### Browser Console (Not Visible to Users)

```
Unhandled Promise Rejection: {code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds in source account', details: 'Available balance is less than $500.00'}
```

The error is logged to the console, but `handlePaymentError()` is never called, so the UI never updates.

---

## Root Cause Analysis

### The Code That Broke

```typescript
// fund-transfer.component.ts lines 87-91
this.paymentService.submitPayment(this.request).subscribe(
  (result) => this.handleSuccess(result),         // Arg 1: next
  (error) => this.handlePaymentError(error),      // Arg 2: error (IGNORED IN RXJS 8!)
  () => this.finalize()                           // Arg 3: complete
);
```

### Why It Compiled

RxJS 8 removed the three-argument overload of `subscribe()`, but the one-argument overload still exists:

```typescript
// RxJS 8 signature (only remaining overload)
subscribe(observerOrNext?: Partial<Observer<T>> | ((value: T) => void)): Subscription
```

When you call `.subscribe(fn1, fn2, fn3)`, TypeScript matches the one-argument overload and treats `fn1` as the observer. The second and third arguments are... just ignored. No compilation error, no runtime error, just silently broken behavior.

### Why Tests Didn't Catch It

The test suite never tested the error path:

```typescript
// MISSING TEST:
it('should display error message when payment fails', fakeAsync(() => {
  const mockError: PaymentError = {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient funds',
    details: 'Balance too low'
  };

  spyOn(paymentService, 'submitPayment').and.returnValue(throwError(() => mockError));

  component.submitTransfer();
  tick(2000);

  expect(component.isProcessing).toBe(false);
  expect(component.errorMessage).toBe('Insufficient funds');
  expect(component.errorCode).toBe('INSUFFICIENT_FUNDS');
}));
```

If this test existed, it would have FAILED after migration, catching the issue before production.

---

## The Correct Approach (With Playbook)

### Pre-Migration: RxJS Audit (Automated)

Run regex search across codebase:

```bash
grep -rn "\.subscribe\s*([^)]*,[^)]*," src/
```

Output:
```
src/app/components/fund-transfer.component.ts:87:    this.paymentService.submitPayment(this.request).subscribe(
src/app/services/transaction-polling.service.ts:45:    interval(3000).subscribe(
src/app/components/account-details.component.ts:123:  this.dataService.loadAccounts().subscribe(
```

**Flagged patterns:** 3 files using deprecated three-argument subscribe

### Generate Report

```markdown
RxJS MIGRATION BLOCKERS

Found 3 instances of deprecated three-argument subscribe() pattern:

1. fund-transfer.component.ts:87 [P0 - CRITICAL]
   - Payment processing flow
   - Error handler: handlePaymentError() displays user-facing messages
   - Impact if broken: Customers cannot see payment failure reasons

2. transaction-polling.service.ts:45 [P1 - HIGH]
   - Background polling for transaction updates
   - Error handler: logs errors and retries
   - Impact if broken: Transaction list stops updating, no error visible

3. account-details.component.ts:123 [P2 - MEDIUM]
   - Account data loading
   - Error handler: displays generic "failed to load" message
   - Impact if broken: Account page shows infinite loading spinner

RECOMMENDATION: Convert all instances to object syntax BEFORE upgrading to Angular 20.
```

### Human Review Decision

Team reviews report and prioritizes:
1. Fix all P0 and P1 instances immediately
2. Add integration tests for error paths
3. Only then proceed with Angular update

### Implementation

```typescript
// BEFORE (RxJS 7)
this.paymentService.submitPayment(this.request).subscribe(
  (result) => this.handleSuccess(result),
  (error) => this.handlePaymentError(error),
  () => this.finalize()
);

// AFTER (RxJS 8 compatible)
this.paymentService.submitPayment(this.request).subscribe({
  next: (result) => this.handleSuccess(result),
  error: (error) => this.handlePaymentError(error),
  complete: () => this.finalize()
});
```

### Add Missing Test

```typescript
it('should display error message when payment fails with insufficient funds', fakeAsync(() => {
  const mockError: PaymentError = {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient funds in source account',
    details: 'Available balance is less than $500.00'
  };

  spyOn(paymentService, 'submitPayment').and.returnValue(throwError(() => mockError));

  component.request = {
    fromAccount: 'checking-4521',
    toAccount: '9876543210',
    amount: 500,
    memo: 'Test payment'
  };

  component.submitTransfer();
  tick(2000);

  // Verify error is displayed
  expect(component.isProcessing).toBe(false);
  expect(component.errorMessage).toBe('Insufficient funds in source account');
  expect(component.errorCode).toBe('INSUFFICIENT_FUNDS');
  expect(component.errorDetails).toContain('Available balance is less than');

  // Verify success message is not shown
  expect(component.successMessage).toBeNull();
}));
```

### Result

- Pre-migration audit identifies 3 blocking issues
- All issues fixed with proper RxJS 8 syntax
- Integration tests added for all error paths
- Tests run and pass BEFORE migration
- Migration proceeds safely
- Zero production impact

---

## Cost Comparison

### Without Playbook (Actual Timeline)

- Deployment: 15 minutes
- Incident detection: 14 minutes
- Root cause analysis: 51 minutes
- Fix implementation: 30 minutes
- Fix deployment: 15 minutes
- **Total incident duration:** 1 hour 46 minutes
- **Engineering time:** 8 hours (4 engineers × 2 hours each)
- **Customer impact:** 853 failed payments with no error messages
- **Customer service impact:** 342 calls
- **Estimated cost:** $16,000 (engineering + customer service + reputation)

### With Playbook (Hypothetical)

- Pre-migration RxJS audit: 15 minutes (automated)
- Human review of report: 30 minutes
- Fix 3 instances: 45 minutes
- Add integration tests: 1 hour
- Run tests: 5 minutes
- Migration: 15 minutes
- **Total time:** 3 hours
- **Engineering time:** 3 hours (1 engineer)
- **Customer impact:** 0
- **Estimated cost:** $750 (engineering only)

**Cost avoidance:** $15,250 per migration
