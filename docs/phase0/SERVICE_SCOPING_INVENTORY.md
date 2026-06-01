# Service Scoping Inventory

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. Module-Scoped Services (providers arrays in @NgModule)

### HIGH RISK: AuthService in SharedBankingModule (Scenario 01)

| Field | Value |
|---|---|
| **Service** | `AuthService` |
| **File** | `01-ngmodule-standalone-conflict/src/app/shared/auth.service.ts` |
| **Provided In** | `SharedBankingModule` (line 44: `providers: [AuthService]`) |
| **Module File** | `01-ngmodule-standalone-conflict/src/app/shared/shared-banking.module.ts:44` |
| **Singleton Risk** | **CRITICAL** — Service is `@Injectable()` without `providedIn: 'root'` |
| **Lazy Load Risk** | HIGH — If `SharedBankingModule` is imported by a lazy-loaded feature module, a new `AuthService` instance is created per lazy boundary, fracturing the singleton |

**Injection Sites:**
- `01-ngmodule-standalone-conflict/src/app/shared/account-summary/account-summary.component.ts` — constructor injection
- `01-ngmodule-standalone-conflict/src/app/shared/transaction-list/transaction-list.component.ts` — constructor injection

**Impact:** The `AuthService` manages user sessions via `BehaviorSubject<UserSession | null>`. Each duplicate instance gets its own `sessionSubject`, meaning:
- User appears logged in on one part of the app and logged out on another
- Session state is inconsistent across lazy-loaded modules
- `instanceId` property (line 28) will differ across instances, confirming fracture

**Remediation:** Migrate to `@Injectable({ providedIn: 'root' })` — estimated 5 minutes.

---

### MEDIUM RISK: AuthService in AppModule (Scenario 04)

| Field | Value |
|---|---|
| **Service** | `AuthService` |
| **File** | `04-auth-interceptor-breakage/src/app/services/auth.service.ts` |
| **Provided In** | `AppModule` (line 72: `providers: [AuthService, ...]`) AND `providedIn: 'root'` (line 18) |
| **Singleton Risk** | LOW — `providedIn: 'root'` takes precedence; AppModule registration is redundant |

**Note:** The `providedIn: 'root'` declaration ensures singleton behavior regardless of the AppModule provider. However, the redundant provider registration in `app.module.ts:72` should be removed for clarity.

---

## 2. Services Using `providedIn: 'root'` (Safe Pattern)

These services use the correct singleton pattern and are LOW risk:

| Service | File | Scenario |
|---|---|---|
| `PaymentService` | `02-rxjs-behavioral-break/src/app/services/payment.service.ts:44` | 02 |
| `CustomerDataService` | `03-typescript-strict-regression/src/app/services/customer-data.service.ts:36` | 03 |
| `AuthService` | `04-auth-interceptor-breakage/src/app/services/auth.service.ts:18` | 04 |
| `TransactionService` | `05-domsanitizer-xss-window/src/app/services/transaction.service.ts:13` | 05 |
| `AuditLogService` | `06-hardcoded-credentials/src/app/services/audit-log.service.ts:18` | 06 |
| `PaymentGatewayService` | `06-hardcoded-credentials/src/app/services/payment-gateway.service.ts:23` | 06 |
| `AuthGuard` | `09-karma-test-runner-removal/src/app/guards/auth.guard.ts:21` | 09 |
| `PaymentValidationService` | `09-karma-test-runner-removal/src/app/services/payment-validation.service.ts:27` | 09 |

---

## 3. Deprecated Provider Patterns

### `providedIn: 'any'`
- **0 instances found** — No usages of `providedIn: 'any'` (deprecated in v15)

### `providedIn: SomeModule`
- **0 instances found** — No usages of `providedIn: NgModule` pattern (deprecated in v15)

---

## 4. Lazy-Loaded Module Analysis

- **`loadChildren` / `loadComponent`:** 0 instances found across the codebase
- The demo scenarios do not use lazy loading in their routing configs
- However, Scenario 01 specifically demonstrates the **risk pattern**: if `SharedBankingModule` were imported by a lazy-loaded module, the `AuthService` singleton would fracture

---

## 5. SSO/MFA/Session Services Risk Assessment

| Service | Pattern | Risk | Notes |
|---|---|---|---|
| `AuthService` (Scenario 01) | Module providers | **CRITICAL** | Singleton fracture breaks session state |
| `AuthService` (Scenario 04) | `providedIn: 'root'` | LOW | Correct pattern, but interceptor registration is the risk |
| `AuthGuard` (Scenario 09) | `providedIn: 'root'` | LOW | Correct pattern |
| No analytics SDK singleton | N/A | N/A | Not present in demo |

---

## 6. Summary

| Category | Count | Risk Level |
|---|---|---|
| Module-scoped services (CRITICAL singleton risk) | 1 | **CRITICAL** |
| Redundant module providers (with `providedIn: 'root'`) | 1 | LOW |
| Deprecated `providedIn: 'any'` | 0 | N/A |
| Deprecated `providedIn: NgModule` | 0 | N/A |
| Services using correct `providedIn: 'root'` | 8 | LOW |

**Estimated Remediation:** 30 minutes total (5 min for the critical AuthService fix + 5 min for removing redundant provider + testing).
