# RxJS Migration Plan — Pre-Migration Error Handling Audit

**Scenario:** 02-rxjs-behavioral-break
**Playbook Rule:** 5.3 — RxJS Error Handling Audit
**Date:** 2026-05-28
**Status:** AUDIT COMPLETE — AWAITING HUMAN REVIEW

---

## Executive Summary

This audit scanned the `02-rxjs-behavioral-break` scenario codebase for deprecated RxJS 7 patterns that will silently break in RxJS 8 (Angular 20). **1 active three-argument `subscribe()` pattern** was found in a **P0 payment-critical flow** with **zero error-path test coverage**. This is a **BLOCKING** finding that must be remediated before any `ng update` command is run.

No `subscriber.error()` patterns were found.

---

## 1. Automated Scan Results

### Pattern 1: Three-Argument `subscribe()`

**Regex used:** `\.subscribe\s*\([^)]+,[^)]+\)`

| # | File | Line | Status |
|---|------|------|--------|
| 1 | `src/app/components/fund-transfer.component.ts` | 145–154 | ❌ ACTIVE — deprecated pattern in use |
| 2 | `src/app/services/payment.service.ts` | 30 | ℹ️ Comment only — documents the pattern, no active usage |
| 3 | `src/app/components/fund-transfer.component.ts` | 157 | ℹ️ Comment only — shows the correct replacement (commented out) |

**Active instances requiring remediation: 1**

### Pattern 2: `subscriber.error()`

**Regex used:** `subscriber\.error\s*\(`

**Results: 0 matches found.** No custom operators using `subscriber.error()` exist in this codebase.

---

## 2. Detailed Findings

### Finding 1 — ACTIVE DEPRECATED PATTERN

**File:** `src/app/components/fund-transfer.component.ts`
**Lines:** 145–154
**Method:** `submitTransfer()`

**Code:**
```typescript
this.paymentService.submitPayment(this.request).subscribe(
  // Success handler (first argument)
  (result) => this.handleSuccess(result),

  // Error handler (second argument) - THIS WILL BE IGNORED IN RXJS 8
  (error) => this.handlePaymentError(error),

  // Complete handler (third argument)
  () => this.finalize()
);
```

**Error handler behavior:**
- Calls `handlePaymentError()` (lines 171–179), which:
  - Sets `isProcessing = false` (stops the loading spinner)
  - Sets `errorCode` to the error code (e.g., `INSUFFICIENT_FUNDS`)
  - Sets `errorMessage` to a user-facing error description
  - Sets `errorDetails` to actionable guidance for the customer
  - Logs the error to the console

**Flow type:** PAYMENT_PROCESSING
**Criticality:** **P0 — CRITICAL**

**Impact if broken:**
- Customers cannot see payment failure reasons (insufficient funds, invalid account, daily limit exceeded)
- Loading spinner spins indefinitely — user has no indication of what happened
- Customers may retry payments or believe the payment went through when it failed
- Regulatory requirement violated: payment failures must be communicated within 3 seconds of rejection

---

## 3. Criticality Categorization

| Finding | File | Criticality | Rationale |
|---------|------|-------------|-----------|
| Three-arg subscribe in `submitTransfer()` | `fund-transfer.component.ts:145` | **P0 — CRITICAL** | Payment processing flow; error handler displays user-facing messages for payment failures; regulatory requirement for timely failure notification |

**P0 — CRITICAL: 1 finding**
**P1 — HIGH: 0 findings**
**P2 — MEDIUM: 0 findings**

---

## 4. Remediation Plan

### Finding 1: Convert three-argument `subscribe()` to object syntax

**Before (RxJS 7 — breaks in RxJS 8):**
```typescript
this.paymentService.submitPayment(this.request).subscribe(
  (result) => this.handleSuccess(result),
  (error) => this.handlePaymentError(error),
  () => this.finalize()
);
```

**After (RxJS 8 compatible):**
```typescript
this.paymentService.submitPayment(this.request).subscribe({
  next: (result) => this.handleSuccess(result),
  error: (error) => this.handlePaymentError(error),
  complete: () => this.finalize()
});
```

**Risk:** LOW — This is a syntax-only change. The behavior is identical in RxJS 7 and RxJS 8 when using the object syntax.

**Note:** The correct replacement is already documented in the component as a comment (lines 157–161). The fix is verified by the existing code comments.

---

## 5. Test Gap Analysis

### `fund-transfer.component.ts:145` [P0]

| Test Criterion | Status | Details |
|---------------|--------|---------|
| Error path test (mocks error responses) | **NO** ❌ BLOCKING | No `.spec.ts` file exists for this component |
| Error message display verification | **NO** ❌ BLOCKING | No test verifies `errorMessage` is set on error |
| Loading state resolves on error | **NO** ❌ BLOCKING | No test verifies `isProcessing` becomes `false` on error |
| Specific error codes tested | **NO** ❌ BLOCKING | No tests for `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, or `LIMIT_EXCEEDED` |

**Test files found in project:** 0 `.spec.ts` files exist in `src/app/`

**RECOMMENDATION:** Add integration tests BEFORE converting syntax. Required tests:

1. **Test: Payment with insufficient funds**
   - Mock `submitPayment()` to return `throwError(() => ({ code: 'INSUFFICIENT_FUNDS', message: '...' }))`
   - Assert `component.errorCode === 'INSUFFICIENT_FUNDS'`
   - Assert `component.errorMessage` is not null
   - Assert `component.isProcessing === false`

2. **Test: Payment with invalid account**
   - Mock `submitPayment()` to return `throwError(() => ({ code: 'INVALID_ACCOUNT', message: '...' }))`
   - Assert error message is displayed

3. **Test: Payment exceeding daily limit**
   - Mock `submitPayment()` to return `throwError(() => ({ code: 'LIMIT_EXCEEDED', message: '...' }))`
   - Assert error message is displayed

4. **Test: Loading state clears on error**
   - Submit transfer, trigger error
   - Assert `component.isProcessing === false` after error callback

---

## 6. Blocking Issues

### ❌ BLOCKING: P0 payment flow with three-argument subscribe and no error path tests

**File:** `src/app/components/fund-transfer.component.ts:145`
**Reason:** Payment-critical flow uses the deprecated three-argument `subscribe()` pattern. Zero test files exist. No error-path test coverage at all.

**Resolution required before `ng update`:**
1. Add error-path integration tests (see Section 5)
2. Convert three-argument `subscribe()` to object syntax (see Section 4)
3. Verify tests pass with the new syntax
4. Only then proceed with `ng update @angular/core@20 @angular/cli@20 rxjs@8`

---

## 7. Implementation Order

| Priority | Step | Action | Blocked By |
|----------|------|--------|-----------|
| 1 | Add test file | Create `fund-transfer.component.spec.ts` with error-path tests | — |
| 2 | Verify tests pass (RxJS 7) | Run tests to confirm error-path tests pass with current deprecated syntax | Step 1 |
| 3 | Convert subscribe syntax | Change three-argument to object syntax in `fund-transfer.component.ts:145` | Step 2 |
| 4 | Verify tests still pass | Run tests to confirm error-path tests pass with new syntax | Step 3 |
| 5 | Human review & approval | PR review with security team sign-off | Step 4 |
| 6 | Run ng update | `ng update @angular/core@20 @angular/cli@20 rxjs@8` | Step 5 |
| 7 | Final verification | Run all tests on Angular 20 / RxJS 8 | Step 6 |

---

## 8. Verification Plan

After converting all patterns:

1. **Pre-conversion:** Run new error-path tests on RxJS 7 — confirm they pass
2. **Post-conversion:** Run all tests after syntax change — confirm they still pass
3. **Post-upgrade:** Run all tests on RxJS 8 — confirm error handlers fire correctly
4. **Manual verification:** Submit a test payment that triggers each error code and confirm:
   - Loading spinner stops
   - Error message is displayed
   - Error code and details are visible
   - "Try Again" button appears and works

---

## HUMAN GATE

**This audit is complete. The following actions require human approval:**

1. ☐ Tech lead reviews this migration plan
2. ☐ Security team reviews P0 payment flow findings
3. ☐ Approval granted to proceed with implementation
4. ☐ Implementation PR created with syntax conversions + new tests
5. ☐ Tests pass on both RxJS 7 and RxJS 8
6. ☐ Only after all above: Run `ng update @angular/core@20`

**DO NOT PROCEED WITH `ng update` UNTIL ALL RXJS PATTERNS ARE CONVERTED AND TESTED.**
