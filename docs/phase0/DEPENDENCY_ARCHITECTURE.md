# Dependency & Integration Architecture

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. SSO/MFA Authentication

### Auth Interceptors (Scenario 04) — **HIGH RISK**

| Component | File | Line | Risk |
|---|---|---|---|
| **SsoTokenInterceptor** | `04-auth-interceptor-breakage/src/app/interceptors/sso-token.interceptor.ts` | 42 | **HIGH** |
| **MfaInterceptor** | `04-auth-interceptor-breakage/src/app/interceptors/mfa.interceptor.ts` | 49 | **HIGH** |
| Interceptor Registration | `04-auth-interceptor-breakage/src/app/app.module.ts` | 75–86 | **HIGH** |

**SsoTokenInterceptor** (113 lines):
- Implements `HttpInterceptor` (class-based, must migrate to functional for standalone)
- Injects `Authorization: Bearer <token>` on ALL outgoing requests (line 51)
- Handles 401 errors with token refresh flow (line 57–63)
- Token refresh uses `switchMap` + retry pattern (lines 86–112)
- **CRITICAL:** If migrated to standalone without `withInterceptorsFromDi()` or `withInterceptors()`, this interceptor is silently dropped — all API calls become unauthenticated

**MfaInterceptor** (100 lines):
- Implements `HttpInterceptor` (class-based)
- Injects `X-MFA-Token` header for sensitive routes (lines 69–87)
- Sensitive route patterns: `/api/transfers`, `/api/billpay`, `/api/settings`, `/api/beneficiaries`, `/api/limits`, `/api/wires`, `/api/external-accounts` (lines 55–63)
- **CRITICAL:** Silent drop during standalone migration means sensitive operations reach backend without MFA tokens

**Registration Order** (lines 75–86 of `app.module.ts`):
1. `SsoTokenInterceptor` — runs first (SSO Bearer token)
2. `MfaInterceptor` — runs second (MFA token for sensitive routes)
- Order matters: both headers must be present on sensitive route requests

### Token Refresh Logic

| Component | File | Line | Pattern |
|---|---|---|---|
| `AuthService.refreshToken()` | `04-auth-interceptor-breakage/src/app/services/auth.service.ts` | 120–135 | `new Observable()` with setTimeout |
| `AuthService.token$` | same | 25 | `BehaviorSubject` observable |
| `AuthService.isRefreshing()` | same | 102 | Prevents duplicate refresh calls |
| Token storage | same | 30, 54 | `sessionStorage.getItem/setItem('sso_token')` |
| MFA token storage | same | 84 | `sessionStorage.setItem('mfa_token')` |

### Session Management

| Component | File | Line | Risk |
|---|---|---|---|
| `AuthService` (Scenario 04) | `04-auth-interceptor-breakage/src/app/services/auth.service.ts` | 20 | Uses `providedIn: 'root'` — safe singleton |
| `AuthService` (Scenario 01) | `01-ngmodule-standalone-conflict/src/app/shared/auth.service.ts` | 23 | **CRITICAL** — module-scoped, singleton fracture risk |
| `AuthGuard` | `09-karma-test-runner-removal/src/app/guards/auth.guard.ts` | 23 | Class-based `CanActivate` — deprecated in v15.2+ |

---

## 2. HTTP Interceptors

| Interceptor | File | Type | Migration Action |
|---|---|---|---|
| `SsoTokenInterceptor` | `04-auth-interceptor-breakage/src/app/interceptors/sso-token.interceptor.ts` | Class-based `HttpInterceptor` | Must convert to functional interceptor via `withInterceptors()` or use `withInterceptorsFromDi()` bridge |
| `MfaInterceptor` | `04-auth-interceptor-breakage/src/app/interceptors/mfa.interceptor.ts` | Class-based `HttpInterceptor` | Same — must convert or bridge |

**Estimated effort:** 2–4 hours (interceptor chain redesign with security review)

---

## 3. Route Guards

| Guard | File | Type | Migration Action |
|---|---|---|---|
| `AuthGuard` | `09-karma-test-runner-removal/src/app/guards/auth.guard.ts:23` | Class-based `CanActivate` | Must migrate to functional guard (deprecated v15.2+) |

**Pattern found:** `implements CanActivate` with `canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot)` returning `Observable<boolean | UrlTree>`.

**Remediation:** Convert to `CanActivateFn` functional guard. Estimated 30 minutes.

---

## 4. Custom Error Handlers

- **0 instances found** — No `ErrorHandler` implementations detected

---

## 5. APP_INITIALIZER Tokens

- **0 instances found** — No `APP_INITIALIZER` usage detected

---

## 6. ControlValueAccessor Implementations

- **0 instances found** — No `ControlValueAccessor` implementations detected
- Note: `setDisabledState` behavior changes in v15 (now always called when attached)

---

## 7. `@angular/localize/tools` Usage

- **0 instances found** — No `canParse` or `@angular/localize` usage detected

---

## 8. View Engine Libraries

- **0 View Engine-only libraries detected** — All dependencies appear Ivy-compatible
- ngcc removal in v16 would not be blocked by View Engine deps in this codebase

---

## 9. Proprietary Analytics SDK

- **Not present** in this demonstration repository
- No analytics service wrappers, event batching, or PII redaction logic found

---

## 10. Financial Data Providers

- **Not present** as third-party integrations in this demo repo
- Payment processing is simulated via `PaymentService` and `PaymentGatewayService` (internal services)

---

## 11. Summary

| Integration | Count | Risk | Migration Action |
|---|---|---|---|
| Class-based HTTP interceptors | 2 | **HIGH** | Convert to functional or bridge with `withInterceptorsFromDi()` |
| Class-based route guards (`CanActivate`) | 1 | **MEDIUM** | Convert to `CanActivateFn` |
| Auth services (singleton risk) | 1 | **CRITICAL** | Fix module-scoped provider |
| Auth services (correct) | 1 | LOW | No action needed |
| Custom error handlers | 0 | N/A | — |
| APP_INITIALIZER tokens | 0 | N/A | — |
| ControlValueAccessor | 0 | N/A | — |
| View Engine deps | 0 | N/A | — |

**Highest Risk Item:** The auth interceptor chain (SsoTokenInterceptor + MfaInterceptor) is the single highest-risk migration item. Silent failure means all API calls lose authentication.
