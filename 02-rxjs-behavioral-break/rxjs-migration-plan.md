# RxJS Migration Plan — Pre-Migration Error Handling Audit

**Scenario:** 02-rxjs-behavioral-break
**Governing Playbook:** [Angular 14 → 20 Migration](https://app.devin.ai/settings/playbooks/7e411b2a038444bdad2aa7599ad2bb20) (macro: `!angular_14_migration`)
**Date:** 2026-05-28
**Status:** AUDIT COMPLETE — AWAITING HUMAN REVIEW (Playbook Phase 2, Step 9)

---

## Playbook Compliance Summary

This audit was performed under the **Angular 14 → 20 Migration** playbook. The table below maps each playbook requirement to the audit work performed.

| Playbook Phase | Step | Requirement | Status | Section |
|---------------|------|-------------|--------|---------|
| Phase 1 | Step 3 | Scan for hardcoded credentials | ✅ Done | §1.1 |
| Phase 1 | Step 4 | Check for auth-critical paths | ✅ Done | §1.2 |
| Phase 2 | Step 5 | RxJS operator inventory: subscription patterns, error-handling blocks, deprecated/removed in RxJS 8 | ✅ Done | §2, §3 |
| Phase 2 | Step 5 | Breaking changes affecting files in scope | ✅ Done | §3 |
| Phase 2 | Step 6 | Dependency compatibility report | ✅ Done | §1.3 |
| Phase 2 | Step 7 | TypeScript strict-mode error capture | ⚠️ Partial | §1.4 |
| Phase 2 | Step 9 | Wait for architect approval before code changes | 🔒 GATE | §9 |
| Phase 3 | Step 11 | Flag `subscribe(next, error, complete)` for human review | ✅ Flagged | §3, §7 |
| Advice | — | "RxJS is the silent killer" — treat every RxJS change as high-risk | ✅ Applied | §3 |
| Forbidden #4 | — | Do NOT use automated RxJS migration scripts | ✅ Complied | — |

---

## 1. Phase 1 — Setup & Pre-Checks

### 1.1 Hardcoded Credentials Scan (Playbook Step 3)

Scanned all `.ts` files in `src/` for API keys, tokens, secrets in string literals, and inline env values.

| File | Line | Finding | Severity |
|------|------|---------|----------|
| `src/app/services/payment.service.ts` | 47 | `API_BASE = 'https://api.internal.bank'` | ℹ️ LOW — marked `// DEMO_VALUE_DO_NOT_USE`, not a real credential |

**Result:** No real hardcoded credentials found. The `API_BASE` value is an explicit demo placeholder.

### 1.2 Auth-Critical Path Check (Playbook Step 4)

Checked for files in `/src/auth/**`, `/src/interceptors/**`, `/src/guards/**`, or imports of OktaAuthModule / MsalModule / OIDC libraries.

**Result:** No auth-critical paths found. No separate auth PR required.

### 1.3 Dependency Compatibility Report (Playbook Step 6)

| Package | Current Version | Angular 20 Compatible | Status |
|---------|----------------|----------------------|--------|
| `@angular/core` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `@angular/common` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `@angular/compiler` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `@angular/forms` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `@angular/platform-browser` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `@angular/platform-browser-dynamic` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `@angular/router` | 14.2.0 | 20.x via `ng update` | ✅ Compatible |
| `rxjs` | 7.5.7 | 8.x — **BREAKING CHANGES** | ⚠️ BLOCKER (see §2) |
| `tslib` | 2.4.0 | 2.x | ✅ Compatible |
| `zone.js` | 0.11.8 | 0.14.x+ | ✅ Compatible (update required) |
| `typescript` | 4.7.4 | 5.x+ | ⚠️ Requires update (see §1.4) |
| `karma` | 6.4.1 | 6.x | ✅ Compatible (Playbook: do NOT remove Karma) |

**BLOCKER:** `rxjs` 7.5.7 → 8.x contains the three-argument `subscribe()` removal that will silently break error handling. See §2.

### 1.4 TypeScript Strict-Mode Errors (Playbook Step 7)

This demo scenario does not include a `tsconfig.json` or full Angular build environment. A full strict-mode compilation against TS 5.x cannot be run in this context. **Flagged for follow-up when full build environment is available.**

Known risk: TypeScript 5.x strict mode may surface additional errors in `fund-transfer.component.ts` (template type checking, implicit `any` in error handler parameter types).

---

## 2. Phase 2 — RxJS Operator Inventory (Playbook Step 5)

### 2.1 Operators Used

| Operator | File | Line | RxJS 8 Status |
|----------|------|------|---------------|
| `delay` | `payment.service.ts` | 4 (import), 115 (usage) | ✅ No change |
| `of` | `payment.service.ts` | 3 (import), 110 (usage) | ✅ No change |
| `throwError` | `payment.service.ts` | 3 (import), 103 (usage) | ✅ No change (already uses factory function form) |

### 2.2 Subscription Patterns

| Pattern | File | Line | RxJS 8 Status |
|---------|------|------|---------------|
| Three-argument `subscribe(next, error, complete)` | `fund-transfer.component.ts` | 145–154 | ❌ **REMOVED in RxJS 8** — BLOCKER |
| `new Observable(observer => ...)` | `payment.service.ts` | 57–94 | ✅ No change |
| `observer.next()` / `observer.error()` / `observer.complete()` | `payment.service.ts` | 64–91 | ✅ No change (Observer creation pattern, not subscriber) |

### 2.3 Error-Handling Blocks

| Pattern | File | Line | Description | RxJS 8 Impact |
|---------|------|------|-------------|---------------|
| Error callback in three-arg `subscribe()` | `fund-transfer.component.ts` | 150 | `(error) => this.handlePaymentError(error)` — displays user-facing payment error messages | ❌ **SILENTLY IGNORED in RxJS 8** |
| `throwError(() => ...)` | `payment.service.ts` | 103–107 | Factory-function form for limit exceeded errors | ✅ No change (already RxJS 8 compatible) |
| `observer.error({...})` | `payment.service.ts` | 64, 71, 78 | Emits error from Observable constructor | ✅ No change |

### 2.4 Deprecated/Removed Patterns Summary

| Pattern | Count | Files | Playbook Action Required |
|---------|-------|-------|-------------------------|
| Three-argument `subscribe(next, error, complete)` | **1 active** | `fund-transfer.component.ts:145` | **Playbook Step 11:** Flag for human review — do not auto-migrate without reviewer confirmation that error-handling is preserved |
| `subscriber.error()` in custom operators | 0 | — | None |
| Deprecated RxJS operators | 0 | — | None |

---

## 3. Detailed Finding — ACTIVE DEPRECATED PATTERN

> **Playbook Advice:** *"RxJS is the silent killer: RxJS behavioural changes often compile and pass tests but break silently in production (e.g., swallowed errors). Treat every RxJS change as high-risk."*

### Finding 1: Three-Argument `subscribe()` in Payment Flow

**File:** `src/app/components/fund-transfer.component.ts`
**Lines:** 145–154
**Method:** `FundTransferComponent.submitTransfer()`

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

**Error handler behavior** (`handlePaymentError()`, lines 171–179):
- Sets `isProcessing = false` (stops the loading spinner)
- Sets `errorCode` to the payment error code (e.g., `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, `LIMIT_EXCEEDED`)
- Sets `errorMessage` to a user-facing error description
- Sets `errorDetails` to actionable guidance for the customer
- Logs the full error object to the console

**Criticality:** **P0 — CRITICAL**

| Criteria | Assessment |
|----------|-----------|
| Flow type | Payment processing — fund transfer submission |
| User-facing impact | Error messages not displayed; infinite loading spinner |
| Regulatory impact | Payment failures must be communicated within 3 seconds of rejection |
| Error codes affected | `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, `LIMIT_EXCEEDED` |
| Production incident category | P0 — customer-facing payment flow completely broken |

**Impact if broken (from MIGRATION-ATTEMPT.md):**
- 2,847 payment attempts affected during 90-minute incident window
- 853 failed payments with no error message shown
- 342 customer service calls
- Emergency rollback required

---

## 4. Criticality Categorization

| Finding | File | Criticality | Rationale |
|---------|------|-------------|-----------|
| Three-arg subscribe in `submitTransfer()` | `fund-transfer.component.ts:145` | **P0 — CRITICAL** | Payment processing flow; error handler displays user-facing messages for payment failures; regulatory requirement for timely failure notification |

**P0 — CRITICAL: 1 finding**
**P1 — HIGH: 0 findings**
**P2 — MEDIUM: 0 findings**

---

## 5. Remediation Plan

> **Playbook Step 11:** *"Migrate RxJS patterns manually (no automated RxJS migration scripts). Add a comment on each changed RxJS block explaining what changed and why."*
>
> **Playbook Step 11:** *"Flag any `subscribe(next, error, complete)` pattern for human review — do not auto-migrate without reviewer confirmation that error-handling is preserved."*
>
> **Playbook Forbidden Action #4:** *"Do NOT use automated RxJS migration scripts."*

### Finding 1: Convert three-argument `subscribe()` to object syntax

**Before (RxJS 7 — breaks in RxJS 8):**
```typescript
this.paymentService.submitPayment(this.request).subscribe(
  (result) => this.handleSuccess(result),
  (error) => this.handlePaymentError(error),
  () => this.finalize()
);
```

**After (RxJS 8 compatible — manual migration per Playbook Forbidden Action #4):**
```typescript
// Migrated from three-argument subscribe() to object syntax for RxJS 8 compatibility.
// The error handler (handlePaymentError) must continue to fire on payment failures
// to display user-facing error messages (INSUFFICIENT_FUNDS, INVALID_ACCOUNT, LIMIT_EXCEEDED).
// See: Playbook Step 11, RxJS migration rule.
this.paymentService.submitPayment(this.request).subscribe({
  next: (result) => this.handleSuccess(result),
  error: (error) => this.handlePaymentError(error),
  complete: () => this.finalize()
});
```

**Risk:** LOW — This is a syntax-only change. Behavior is identical in RxJS 7 and RxJS 8 when using the object syntax.

**Note:** The correct replacement is already documented in the component as a comment (lines 157–161).

**🔒 HUMAN REVIEW REQUIRED** (Playbook Step 11): Reviewer must confirm that error-handling is preserved before this change is applied.

---

## 6. Test Gap Analysis

> **Playbook Step 12:** *"Run the full unit test suite… all tests must pass. Run the coverage report — branch coverage must meet the threshold."*
>
> **Playbook Step 12:** *"If a gap requires integration testing, flag under 'Coverage Gap — Integration Test Required' and tag QA."*

### `fund-transfer.component.ts:145` [P0]

| Test Criterion | Status | Details |
|---------------|--------|---------|
| Error path test (mocks error responses) | **NO** ❌ BLOCKING | No `.spec.ts` file exists for this component |
| Error message display verification | **NO** ❌ BLOCKING | No test verifies `errorMessage` is set on error |
| Loading state resolves on error | **NO** ❌ BLOCKING | No test verifies `isProcessing` becomes `false` on error |
| Specific error codes tested | **NO** ❌ BLOCKING | No tests for `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, or `LIMIT_EXCEEDED` |

**Test files found in project:** 0 `.spec.ts` files exist in `src/app/`

**Coverage Gap — Integration Test Required** (Playbook Step 12):

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

**RECOMMENDATION:** Add integration tests BEFORE converting syntax. Tests must pass on RxJS 7 first (Playbook Step 12), then again after syntax conversion (Playbook Step 12 post-migration verification).

---

## 7. Blocking Issues

> **Playbook Forbidden Action #8:** *"Do NOT delete or skip failing tests. Flag as BLOCKER and stop."*

### ❌ BLOCKER: P0 payment flow with three-argument subscribe and no error path tests

**File:** `src/app/components/fund-transfer.component.ts:145`
**Playbook references:** Step 5 (RxJS inventory), Step 11 (flag for human review), Step 12 (test coverage), Forbidden Action #4 (no automated scripts)

**Reason:** Payment-critical flow uses the deprecated three-argument `subscribe()` pattern. Zero test files exist in the project. No error-path test coverage at all. Per the playbook, this is a high-risk RxJS change that requires:
1. Human review confirmation that error-handling is preserved (Step 11)
2. Full unit test coverage before and after migration (Step 12)
3. Manual migration only — no automated scripts (Forbidden Action #4)

**Resolution required before `ng update`:**
1. Add error-path integration tests (see §6)
2. Verify tests pass on current RxJS 7 (Step 12)
3. Obtain human reviewer confirmation (Step 11)
4. Convert three-argument `subscribe()` to object syntax manually (Step 11, Forbidden #4)
5. Verify tests still pass after conversion (Step 12)
6. Only then proceed with `ng update @angular/core@20 @angular/cli@20 rxjs@8`

---

## 8. Implementation Order (Playbook Phase 3)

> **Playbook Advice:** *"Version-by-version, not batch: Apply changes one major version at a time. This makes failures easier to diagnose."*

| Priority | Step | Playbook Ref | Action | Blocked By |
|----------|------|-------------|--------|-----------|
| 1 | Architect approval | Phase 2, Step 9 | Architect reviews this inventory and approves | — |
| 2 | Add test file | Phase 3, Step 12 | Create `fund-transfer.component.spec.ts` with error-path tests | Step 1 |
| 3 | Verify tests pass (RxJS 7) | Phase 3, Step 12 | Run tests on Karma — all tests must pass | Step 2 |
| 4 | Human review of RxJS pattern | Phase 3, Step 11 | Reviewer confirms error-handling is preserved | Step 3 |
| 5 | Convert subscribe syntax (manual) | Phase 3, Step 11 + Forbidden #4 | Change three-argument to object syntax with explanatory comment | Step 4 |
| 6 | Verify tests still pass | Phase 3, Step 12 | Run tests on Karma — all tests must pass post-conversion | Step 5 |
| 7 | Migration PR | Phase 4, Steps 14–18 | Open PR with all required sections per PR template | Step 6 |
| 8 | Run ng update (version-by-version) | Phase 3, Step 10 | `ng update` 14→15→16→17→18→19→20 — one version at a time | Step 7 |
| 9 | Final verification | Phase 3, Step 12 | Run all tests on Angular 20 / RxJS 8 | Step 8 |

---

## 9. HUMAN GATE (Playbook Phase 2, Step 9)

> **Playbook Step 9:** *"Wait for written architect approval in the PR comments before proceeding."*

**This audit is the Phase 2 Migration Inventory. The following gates must be cleared before any code changes:**

1. ☐ **Architect approval** — Written approval in PR comments (Playbook Step 9)
2. ☐ Tech lead reviews RxJS findings and remediation plan
3. ☐ Security team reviews P0 payment flow findings
4. ☐ Reviewer confirms error-handling preservation for each `subscribe()` pattern (Playbook Step 11)
5. ☐ Error-path tests added and passing on RxJS 7 (Playbook Step 12)
6. ☐ Syntax conversion applied manually with explanatory comments (Playbook Step 11, Forbidden #4)
7. ☐ All tests pass post-conversion (Playbook Step 12)
8. ☐ Migration PR opened with all required PR template sections (Playbook Phase 4)
9. ☐ Version-by-version `ng update` applied (Playbook Step 10)
10. ☐ All downstream consumer tests pass (Playbook Step 13)

**DO NOT PROCEED WITH `ng update` UNTIL ALL RXJS PATTERNS ARE CONVERTED AND TESTED.**
**DO NOT USE AUTOMATED RXJS MIGRATION SCRIPTS (Playbook Forbidden Action #4).**
