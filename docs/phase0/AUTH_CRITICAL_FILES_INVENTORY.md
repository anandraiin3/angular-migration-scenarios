# Auth-Critical & Security-Critical File Inventory

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. Auth Interceptors — **CRITICAL**

### SsoTokenInterceptor

| Field | Value |
|---|---|
| **File** | `04-auth-interceptor-breakage/src/app/interceptors/sso-token.interceptor.ts` |
| **Lines** | 1–113 |
| **Risk Level** | **CRITICAL** |
| **Function** | Injects `Authorization: Bearer <token>` on ALL outgoing HTTP requests |
| **Security Functions** | Token injection (line 51), 401 handling (line 57), token refresh (line 86–112), logout on refresh failure (line 108) |
| **Migration Risk** | Silent drop during standalone migration — all API calls become unauthenticated |

### MfaInterceptor

| Field | Value |
|---|---|
| **File** | `04-auth-interceptor-breakage/src/app/interceptors/mfa.interceptor.ts` |
| **Lines** | 1–100 |
| **Risk Level** | **CRITICAL** |
| **Function** | Injects `X-MFA-Token` header for sensitive banking operations |
| **Protected Routes** | `/api/transfers`, `/api/billpay`, `/api/settings`, `/api/beneficiaries`, `/api/limits`, `/api/wires`, `/api/external-accounts` |
| **Migration Risk** | Silent drop means sensitive operations reach backend without MFA verification |

---

## 2. Auth Guards — **HIGH**

### AuthGuard (Scenario 09)

| Field | Value |
|---|---|
| **File** | `09-karma-test-runner-removal/src/app/guards/auth.guard.ts` |
| **Lines** | 1–184 |
| **Risk Level** | **HIGH** |
| **Function** | Route access control with session validation, role-based access, session expiry check |
| **Class-based** | `implements CanActivate` — deprecated in v15.2+, must migrate to functional guard |
| **Features** | Session validation (line 68), role checking (line 90), UrlTree redirect to `/login` (line 48), unauthorized redirect (line 56), session expiry (line 76) |

---

## 3. Session Management Services — **CRITICAL**

### AuthService (Scenario 04)

| Field | Value |
|---|---|
| **File** | `04-auth-interceptor-breakage/src/app/services/auth.service.ts` |
| **Lines** | 1–152 |
| **Risk Level** | **CRITICAL** |
| **Functions** | Token management, MFA token management, token refresh, session storage |
| **Storage** | `sessionStorage` for `sso_token` (line 30) and `mfa_token` (line 84) |
| **Token Flow** | `BehaviorSubject<string | null>` for reactive token access |
| **Refresh** | `refreshToken()` (line 120) — prevents duplicate refreshes via `isRefreshing()` |
| **Logout** | `logout()` (line 148) — clears both SSO and MFA tokens |

### AuthService (Scenario 01) — Singleton Fracture Risk

| Field | Value |
|---|---|
| **File** | `01-ngmodule-standalone-conflict/src/app/shared/auth.service.ts` |
| **Lines** | 23–72 |
| **Risk Level** | **CRITICAL** |
| **Issue** | Module-scoped provider (not `providedIn: 'root'`) — duplicate instances across lazy boundaries |
| **Session State** | `BehaviorSubject<UserSession | null>` — inconsistent across instances |

---

## 4. DomSanitizer Bypass Usages — **HIGH XSS RISK**

### `bypassSecurityTrustHtml()` — CRITICAL XSS RISK

| Field | Value |
|---|---|
| **File** | `05-domsanitizer-xss-window/src/app/components/transaction-description.component.ts` |
| **Line** | 119 |
| **Risk Level** | **CRITICAL** |
| **Input Source** | `merchantDescription` — merchant-controlled data from payment processor |
| **Attack Vector** | Malicious merchant name with XSS payload (e.g., `<img src=x onerror='...'>`) |
| **Impact** | Session hijacking, credential theft, account takeover |
| **Angular 14 Behavior** | Sanitizer provides some fallback protection |
| **Angular 18+ Behavior** | Relies on CSP — without strict CSP, XSS payloads execute |

### `bypassSecurityTrustUrl()` — MEDIUM XSS RISK

| Field | Value |
|---|---|
| **File** | `05-domsanitizer-xss-window/src/app/components/help-text.component.ts` |
| **Line** | 123 |
| **Risk Level** | **MEDIUM** |
| **Input Source** | `deepLinkUrl` — from configuration/parent component |
| **Attack Vector** | `javascript:` or `data:` URL schemes if config is compromised |
| **Impact** | Script execution, phishing |

### `bypassSecurityTrustStyle()` — LOW RISK

| Field | Value |
|---|---|
| **File** | `05-domsanitizer-xss-window/src/app/components/rich-alert.component.ts` |
| **Line** | 162 |
| **Risk Level** | **LOW** |
| **Input Source** | Internal severity enum (hardcoded mapping) |
| **Note** | Safe as long as style values remain internally controlled |

---

## 5. Hardcoded Credentials & API Keys — **CRITICAL**

### Scenario 06: Hardcoded Credentials

| File | Line | Credential Type | Risk |
|---|---|---|---|
| `06-hardcoded-credentials/src/app/services/payment-gateway.service.ts` | 28 | Payment gateway API key (`pgw_live_DEMO_*`) | **CRITICAL** |
| same | 30 | Webhook secret (`whsec_DEMO_*`) | **CRITICAL** |
| `06-hardcoded-credentials/src/app/services/audit-log.service.ts` | 27 | JWT service token (audit write access) | **CRITICAL** |
| same | 30 | Backup JWT token (admin: true) | **CRITICAL** |
| `06-hardcoded-credentials/src/app/config/service-config.ts` | 69 | Payment gateway key (duplicated) | HIGH |
| same | 72 | Audit service token (duplicated) | HIGH |
| same | 75 | Partner API master key | **CRITICAL** |
| same | 78 | Internal services shared secret | **CRITICAL** |
| same | 90–92 | Payment webhook secret, merchant ID | HIGH |
| same | 104–105 | Test API key, test merchant ID | MEDIUM |
| same | 117–118 | Database read-only credentials | **CRITICAL** |
| same | 121–122 | Database admin credentials | **CRITICAL** |
| `06-hardcoded-credentials/src/environments/environment.prod.ts` | 23 | Customer data API token in URL | **CRITICAL** |
| same | 27 | Account aggregation API key in URL | **CRITICAL** |
| same | 31 | Document storage access key (AWS-style) | **CRITICAL** |
| same | 35 | WebSocket auth token in URL | HIGH |
| same | 40 | Basic auth credentials in URL | **CRITICAL** |
| same | 47 | Credit bureau API key | HIGH |
| same | 51 | Identity verification secret | HIGH |
| same | 57 | Database connection string with password | **CRITICAL** |
| same | 61 | Redis auth token | HIGH |
| same | 66 | Feature flags SDK key | MEDIUM |
| same | 72 | APM ingest token in URL | MEDIUM |
| same | 80 | Client encryption key (AES-256) | **CRITICAL** |

**Note:** All values in Scenario 06 are marked `DEMO_VALUE_DO_NOT_USE` — they are demonstration values. However, the **pattern** of hardcoded credentials is a real security risk that must be remediated before or during migration.

**Total hardcoded credential locations:** 25+

---

## 6. `<iframe>` Bindings

- **0 instances of actual `<iframe>` elements** in component templates
- iframe references found only in comments (attack vector documentation in Scenario 05)
- v15 introduced stricter security rules for iframe attribute/property bindings (NG0910) — **no impact** on this codebase

---

## 7. CSP-Related Configurations

- **0 CSP configurations found** — No Content-Security-Policy headers or meta tags detected
- **Risk:** Without CSP, `bypassSecurityTrustHtml()` in Scenario 05 is exploitable post-migration

---

## 8. PII Handling in Analytics

| File | Line | Context | Risk |
|---|---|---|---|
| `06-hardcoded-credentials/src/app/services/audit-log.service.ts` | 92–105 | `logDataAccess()` records `userId`, `resourceId`, `sensitivityLevel: 'PII'` | **MEDIUM** — PII metadata in audit logs; disruption during migration could cause compliance gaps |

---

## 9. Summary

| Category | Count | Risk Level |
|---|---|---|
| Auth interceptors (class-based, silent drop risk) | 2 | **CRITICAL** |
| Auth guards (class-based, deprecated) | 1 | HIGH |
| Session management services | 2 | **CRITICAL** |
| `bypassSecurityTrustHtml()` (merchant-controlled XSS) | 1 | **CRITICAL** |
| `bypassSecurityTrustUrl()` | 1 | MEDIUM |
| `bypassSecurityTrustStyle()` | 1 | LOW |
| Hardcoded credentials/API keys | 25+ locations | **CRITICAL** |
| iframe bindings | 0 | N/A |
| CSP configurations | 0 | **HIGH** (absence is the risk) |
| PII handling in audit | 1 | MEDIUM |

**Security Team Review Required For:**
1. Auth interceptor migration (SsoTokenInterceptor, MfaInterceptor)
2. DomSanitizer bypass in TransactionDescriptionComponent (XSS window)
3. All hardcoded credentials (must be moved to vault before or during migration)
4. CSP policy implementation (required to secure bypassSecurityTrust* usages post-migration)
