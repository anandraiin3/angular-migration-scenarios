# Scenario 04 — Auth Interceptor Breakage

## The Problem

This codebase implements SSO token injection using Angular 14's class-based `HttpInterceptor` interface, registered via the `HTTP_INTERCEPTORS` multi-provider token in `AppModule`. When migrated to Angular 20 and converted to standalone component architecture, the interceptor registration pattern changes fundamentally. The class-based interceptor registered via `HTTP_INTERCEPTORS` in an NgModule is silently ignored in standalone component applications unless explicitly configured using `provideHttpClient(withInterceptors([...]))`. The code compiles, unit tests pass (because `HttpTestingController` doesn't invoke real interceptors), but production API calls reach the backend WITHOUT the Authorization header, causing authentication failures.

## Why This Matters for a Bank

Unauthenticated API calls in a consumer banking application are not a functionality bug — they are a critical security incident. When the SSO token interceptor fails silently, every API call to internal banking services (account data, transactions, transfers, bill pay) reaches the API gateway without authentication headers. The API gateway rejects these requests with 401 Unauthorized responses, causing the entire application to fail. From a customer perspective, they log in successfully (authentication flow works) but then cannot view any account data (authorization flow fails). From a security perspective, this represents a complete breakdown of the application's security model. The incident response team must verify that no sensitive data was exposed due to missing authentication, and the security team must determine whether any requests bypassed authorization checks.

## What the Playbook Rule Says

**Playbook Rule 7.1 — Auth-Critical File Review Gate:**

> Any file matching these patterns is classified as auth-critical:
> - Interceptors that inject Authorization, X-Session-Token, or X-MFA-Token headers
> - Auth guards that control route access
> - Services that manage authentication state (login, logout, token refresh)
>
> Before ANY changes to auth-critical files:
> 1. Flag the file for security team review
> 2. Create a migration plan PR (no code changes, plan only)
> 3. Security team approves the plan with explicit sign-off
> 4. Implementation PR requires: (a) security team re-review, (b) integration test showing auth headers are attached, (c) manual QA verification
>
> **Gate:** No auth-critical file changes can be merged without security team sign-off on BOTH the plan and the implementation.

## The Correct Migration Approach

### Step 1: Pre-Migration Auth Inventory (Devin)
1. Search for all classes implementing `HttpInterceptor` interface
2. Search for all `HTTP_INTERCEPTORS` provider registrations
3. For each interceptor:
   - Identify what headers it injects
   - Determine if it's auth-critical (Authorization, Session, MFA tokens)
   - List all modules that provide it
   - Check if any standalone components exist that might not receive the interceptor

Example inventory output:
```
AUTH-CRITICAL INTERCEPTORS FOUND:

1. SsoTokenInterceptor (src/app/interceptors/sso-token.interceptor.ts)
   - Injects: Authorization: Bearer <token>
   - Provided in: AppModule (HTTP_INTERCEPTORS token)
   - Dependencies: AuthService.getToken()
   - Criticality: P0 - ALL API calls require authentication
   - Current test coverage: Unit tests only (mocked HttpClient)
   - Missing: Integration test verifying header attachment in real HTTP calls

2. MfaInterceptor (src/app/interceptors/mfa.interceptor.ts)
   - Injects: X-MFA-Token for sensitive routes (/transfer, /billpay, /settings)
   - Provided in: AppModule (HTTP_INTERCEPTORS token)
   - Criticality: P0 - Sensitive operations require MFA
   - Missing: Integration test for conditional header injection

RISK ASSESSMENT:
⚠️ BLOCKING: If standalone component migration proceeds without updating
interceptor configuration, ALL HTTP calls will be unauthenticated.
```

### Step 2: Security Team Review (Human, BLOCKING)

Present the migration plan to security team:

**Option A (Recommended):** Keep class-based interceptors, update registration for standalone
```typescript
// app.config.ts (new standalone bootstrap)
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { SsoTokenInterceptor } from './interceptors/sso-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: SsoTokenInterceptor, multi: true },
    // ... other providers
  ]
};
```

**Option B:** Convert to functional interceptors (Angular 15+ style)
```typescript
// sso-token.interceptor.ts (converted to function)
export const ssoTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};

// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ssoTokenInterceptor } from './interceptors/sso-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([ssoTokenInterceptor])),
    // ... other providers
  ]
};
```

Security team chooses approach and documents rationale.

### Step 3: Add Integration Tests (BEFORE Migration)

```typescript
// sso-token.interceptor.integration.spec.ts
describe('SsoTokenInterceptor Integration', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: SsoTokenInterceptor, multi: true },
        AuthService
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  it('should attach Authorization header when token exists', () => {
    // Set up auth state
    authService.setToken('test-token-12345');

    // Make HTTP call
    httpClient.get('/api/accounts').subscribe();

    // Verify header was attached
    const req = httpTestingController.expectOne('/api/accounts');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-12345');

    req.flush({ accounts: [] });
    httpTestingController.verify();
  });

  it('should NOT attach header when no token exists', () => {
    // Ensure no token
    authService.clearToken();

    httpClient.get('/api/public-data').subscribe();

    const req = httpTestingController.expectOne('/api/public-data');
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush({ data: [] });
    httpTestingController.verify();
  });

  it('should handle token refresh on 401 response', fakeAsync(() => {
    authService.setToken('expired-token');

    httpClient.get('/api/accounts').subscribe();

    const req = httpTestingController.expectOne('/api/accounts');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    tick(1000); // Wait for refresh

    // Verify refresh was triggered
    expect(authService.isRefreshing()).toBe(true);

    httpTestingController.verify();
  }));
});
```

### Step 4: Implementation with Continuous Verification

After security approval:
1. Implement chosen approach (Option A or B)
2. Run integration tests — MUST PASS before proceeding
3. Manual QA: Open network tab, make API call, verify Authorization header present
4. Create PR with:
   - Security team approval comment on plan
   - Integration test results
   - Screenshot of network tab showing header
5. Security team reviews implementation PR
6. Merge only after security sign-off

### Step 5: Post-Deployment Verification

After production deployment:
1. Security team performs live verification: logs into app, opens network tab, verifies Authorization headers on all API calls
2. Monitor error rates for 401/403 responses — should NOT increase
3. If 401 rate increases by more than 5%, immediate rollback

---

## What Breaks Without This Approach

### Naive Migration

Developer runs:
```bash
ng update @angular/core@20 @angular/cli@20
ng generate @angular/core:standalone
```

Converts `AppModule` to standalone bootstrap:
```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';  // ⚠️ Missing interceptor config!

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),  // ⚠️ No withInterceptorsFromDi()!
    // ⚠️ HTTP_INTERCEPTORS providers missing!
  ]
});
```

### Build succeeds ✓
```bash
ng build --configuration=production
```
No errors.

### Unit tests pass ✓
```bash
ng test
```
All pass because `HttpClientTestingModule` mocks HTTP calls — interceptors aren't actually invoked in the way that would catch this.

### Deploy to production ✓

### Production failure (Immediate)

**2:00 PM** - Deployment completes  
**2:01 PM** - First user logs in, attempts to view account dashboard  
**2:01 PM** - API Gateway logs: `401 Unauthorized - Missing Authorization header`  
**2:01 PM** - User sees: "Failed to load account data. Please try again."  
**2:02 PM** - 47 more users hit the same error  
**2:03 PM** - P0 incident declared: "Complete application outage - authentication failure"  
**2:05 PM** - Emergency rollback initiated  
**2:08 PM** - Rollback complete  

**Impact:**  
- **Duration:** 8 minutes of complete outage  
- **Affected users:** 156 users attempted login during window  
- **Security incident:** YES (unauthenticated API calls reached gateway)  
- **Regulatory reporting:** Required (security control failure)  
- **Root cause time:** 35 minutes (initially thought it was API gateway issue)  

---

## Cost Comparison

**Without Playbook:**
- Incident response: 6 engineers × 2 hours = 12 hours = $3,000
- Security incident investigation: 8 hours = $2,000
- Regulatory reporting: 4 hours = $1,000
- Reputation damage: Immeasurable
- **Total:** $6,000+ per incident

**With Playbook:**
- Pre-migration inventory: 30 minutes = $125
- Security team review: 1 hour = $250
- Integration tests: 2 hours = $500
- Implementation with verification: 2 hours = $500
- **Total:** $1,375
- **Incidents:** 0

**Cost avoidance:** $4,625 + zero security incidents
