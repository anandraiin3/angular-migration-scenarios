# Scenario 02 — RxJS Behavioral Break

## The Problem

This codebase uses the deprecated RxJS 7 three-argument `subscribe(next, error, complete)` pattern for error handling in payment processing flows. RxJS 8 (bundled with Angular 20) removes this signature and the `subscriber.error()` pattern. When migrated to Angular 20, the code compiles successfully because TypeScript doesn't flag the removed overload — it just silently uses the one-argument signature and ignores the error handler. Payment errors that should display user-facing messages are silently swallowed, leaving customers unable to see why their payment failed.

## Why This Matters for a Bank

Silent error swallowing in payment processing is a P0 incident category. When a customer's payment fails due to insufficient funds, invalid account number, or payment gateway rejection, they MUST see an actionable error message. If the error handler is silently broken, the UI shows a loading spinner that never resolves, or worse, shows "payment submitted" when it actually failed. This creates downstream issues: customers believe they've paid, bills go unpaid, overdraft fees accumulate, and customer service receives hundreds of escalation calls. The regulatory requirement is that payment failures must be communicated to the customer within 3 seconds of rejection.

## What the Playbook Rule Says

**Playbook Rule 5.3 — RxJS Error Handling Audit:**

> Before upgrading from RxJS 7 to RxJS 8, run an automated scan for deprecated error handling patterns:
> 1. Search for `.subscribe(` with more than one argument (regex: `\.subscribe\([^)]+,[^)]+\)`)
> 2. Search for `subscriber.error(` calls inside custom operators
> 3. Flag all instances as BLOCKING issues
>
> For each flagged instance:
> - Convert three-argument subscribe to single-argument with error property:
>   ```typescript
>   // BEFORE (RxJS 7, breaks in RxJS 8)
>   obs$.subscribe(next, error, complete);
>
>   // AFTER (RxJS 8 compatible)
>   obs$.subscribe({ next, error, complete });
>   ```
> - Convert `subscriber.error()` to throwing inside `pipe(catchError(...))`
>
> **Gate:** PR cannot be approved if any three-argument subscribe patterns remain in the codebase.

## The Correct Migration Approach

### Step 1: Pre-Migration RxJS Audit (Devin)
1. Run regex search: `\.subscribe\s*\([^)]+,[^)]+\)` across entire codebase
2. Run regex search: `subscriber\.error\s*\(` across entire codebase
3. Produce a report with file paths and line numbers for every match
4. Categorize by criticality:
   - **P0 Critical:** Payment flows, auth flows, transaction submission
   - **P1 High:** Account data loading, balance retrieval
   - **P2 Medium:** Non-critical UI updates, analytics

### Step 2: Remediation Plan (Human Review Required)
For each flagged pattern:
- Review the error handler logic — is it displaying user-facing errors, logging, or both?
- Determine correct migration: convert to object syntax or refactor to use `catchError` operator
- For payment-critical flows, add integration test verifying error messages display correctly

### Step 3: Implementation (Devin)
Convert each instance systematically:
```typescript
// BEFORE
this.http.post('/api/payments', payload).subscribe(
  (result) => this.handleSuccess(result),
  (error) => this.handlePaymentError(error),
  () => this.finalize()
);

// AFTER
this.http.post('/api/payments', payload).subscribe({
  next: (result) => this.handleSuccess(result),
  error: (error) => this.handlePaymentError(error),
  complete: () => this.finalize()
});
```

### Step 4: Verification
Add integration tests that:
1. Mock HTTP error responses (400, 500, network timeout)
2. Verify that error messages appear in the UI
3. Verify that loading states resolve correctly on error

### Step 5: Only Then Run ng update
After ALL three-argument subscribe patterns are converted, run:
```bash
ng update @angular/core@20 @angular/cli@20 rxjs@8
```

---

## What Breaks Without This Approach

**Naive migration:** Run `ng update` without RxJS audit.

**Result:**
- Build succeeds ✓
- Tests pass ✓ (they mock the happy path, not error paths)
- Production deployment succeeds ✓
- Customer submits payment → payment gateway rejects → error handler never fires → UI stuck in loading state forever

**Detection time:** First customer complaint 14 minutes after deployment.

**Impact:** 2,847 payment attempts during 90-minute incident window. 342 customer service calls. Emergency rollback required.

**With playbook:** Flagged in pre-migration audit. Zero production impact.
