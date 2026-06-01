# RxJS Deprecation Audit & Migration Remediation

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. Three-Argument `.subscribe(next, error, complete)` — DEPRECATED

### Finding 1: FundTransferComponent (Scenario 02) — **HIGH RISK**

| Field | Value |
|---|---|
| **File** | `02-rxjs-behavioral-break/src/app/components/fund-transfer.component.ts` |
| **Lines** | 145–154 |
| **Impact** | **HIGH** — Handles payment error flow for fund transfers |
| **Context** | `this.paymentService.submitPayment(this.request).subscribe(successFn, errorFn, completeFn)` |

**Code:**
```typescript
this.paymentService.submitPayment(this.request).subscribe(
  (result) => this.handleSuccess(result),      // next
  (error) => this.handlePaymentError(error),   // error — IGNORED IN RXJS 8
  () => this.finalize()                        // complete
);
```

**Risk:** In RxJS 8 (Angular 20), the three-argument overload no longer exists. TypeScript matches the single-argument overload, treating the second argument as part of the observable sequence. The `handlePaymentError` callback is **silently ignored** — payment errors result in a spinner that spins forever with no error message displayed.

**Remediation:**
```typescript
this.paymentService.submitPayment(this.request).subscribe({
  next: (result) => this.handleSuccess(result),
  error: (error) => this.handlePaymentError(error),
  complete: () => this.finalize()
});
```

### Finding 2: PaymentService (Scenario 02) — **HIGH RISK**

| Field | Value |
|---|---|
| **File** | `02-rxjs-behavioral-break/src/app/services/payment.service.ts` |
| **Lines** | 29–35 (documented pattern) |
| **Impact** | **HIGH** — Service documents the three-argument subscribe usage pattern |
| **Context** | Service comments describe the deprecated pattern used by consumers |

**Note:** The service itself uses standard RxJS operators. The deprecated pattern is in the consuming component (`fund-transfer.component.ts`).

### Finding 3: AuditLogService (Scenario 06) — **MEDIUM RISK**

| Field | Value |
|---|---|
| **File** | `06-hardcoded-credentials/src/app/services/audit-log.service.ts` |
| **Line** | 53 |
| **Impact** | **MEDIUM** — Nested subscribe in tap error handler |
| **Context** | `this.logEventWithBackup(entry).subscribe()` inside tap error |

**Note:** This uses a zero-argument `.subscribe()` (no deprecated pattern), but the nested subscribe is a code smell. Not a breaking change, but should be refactored to use `switchMap` or `catchError`.

---

## 2. `toPromise()` — DEPRECATED

- **0 instances found** — No usages of `toPromise()` in the codebase
- Services use `Observable` patterns consistently (no conversion to Promise)

---

## 3. Deprecated Operators

### `pluck`
- **0 instances found**

### `switchAll`
- **0 instances found**

---

## 4. `new Observable(subscriber => { subscriber.error() })` Patterns

### Finding: AuthService.refreshToken() (Scenario 04)

| Field | Value |
|---|---|
| **File** | `04-auth-interceptor-breakage/src/app/services/auth.service.ts` |
| **Lines** | 123–134 |
| **Impact** | **MEDIUM** — Token refresh simulation |
| **Context** | `new Observable(observer => { ... observer.next(newToken); observer.complete(); })` |

**Note:** This uses the `new Observable()` constructor with `observer.next()` and `observer.complete()` (not `subscriber.error()`), which is a valid pattern. No deprecated usage here.

### Finding: PaymentValidationService.validateBatch() (Scenario 09)

| Field | Value |
|---|---|
| **File** | `09-karma-test-runner-removal/src/app/services/payment-validation.service.ts` |
| **Lines** | 165–181 |
| **Impact** | **LOW** — Batch validation helper |
| **Context** | `new Observable(observer => { ... observer.next(results); observer.complete(); })` |

**Note:** Valid pattern using `observer.next()` and `observer.complete()`. No deprecated usage.

---

## 5. Summary

| Pattern | Instances | Risk | Schematic-Fixable? |
|---|---|---|---|
| Three-argument `.subscribe()` | 1 | **HIGH** | No — requires manual fix |
| `toPromise()` | 0 | N/A | — |
| `pluck` operator | 0 | N/A | — |
| `switchAll` operator | 0 | N/A | — |
| Deprecated `Observable` patterns | 0 | N/A | — |

**Total Findings:** 1 critical instance requiring manual remediation.

**Estimated Remediation:** 5 minutes (single find-and-replace from positional args to observer object).

**Critical Note:** While only 1 instance exists in this demo repo, this pattern is the most dangerous RxJS migration issue because it **compiles without errors** but silently drops error handling. In a real banking application, this would cause payment error handlers to be ignored.
