# Migration Attempt - Standalone Component Migration

## Initial State (Angular 14, NgModule-based)

**Working configuration in `app.module.ts`:**

```typescript
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([])
  ],
  providers: [
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SsoTokenInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MfaInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

**Status:** Interceptors registered and functioning correctly. All API calls include:
- `Authorization: Bearer <token>` header (from SsoTokenInterceptor)
- `X-MFA-Token: <mfa-token>` header for sensitive routes (from MfaInterceptor)

---

## Migration Attempt (Angular 20, Standalone)

### Step 1: Upgrade Angular

```bash
ng update @angular/core@20 @angular/cli@20
```

**Result:** Successful

### Step 2: Run Standalone Migration Schematic

```bash
ng generate @angular/core:standalone
```

**Schematic output:**
```
✅ Converted AppComponent to standalone
✅ Removed AppModule
✅ Created main.ts with bootstrapApplication
✅ Updated imports in components
```

### Step 3: Review Generated main.ts

**Generated `main.ts`:**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),  // ⚠️ CRITICAL ISSUE: No interceptor configuration!
  ]
}).catch(err => console.error(err));
```

**Generated `app.component.ts`:**

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-container">
      <h1>Consumer Banking Application</h1>
      <p>Angular 20 with standalone components</p>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    h1 {
      color: #003366;
      border-bottom: 2px solid #003366;
      padding-bottom: 10px;
    }
  `]
})
export class AppComponent {
  title = 'consumer-banking-app';
}
```

### Step 4: Attempt Build

```bash
ng build --configuration=production
```

**Result:** ✅ Build succeeds with no errors

**Analysis:**
- No TypeScript compilation errors
- No Angular compiler errors
- Interceptor classes still exist in codebase
- No warnings about unused providers
- Build output looks identical to pre-migration build

### Step 5: Run Unit Tests

```bash
ng test
```

**Result:** ✅ All tests pass

**Test output:**
```
Chrome 120.0.0.0 (Mac OS X 10.15.7)
  AppComponent
    ✓ should create the app
    ✓ should render title
  AuthService
    ✓ should be created
    ✓ should set and get token
    ✓ should clear token
    ✓ should set and get MFA token
  SsoTokenInterceptor
    ✓ should be created
    ✓ should add Authorization header when token exists
    ✓ should not add header when token is null
  MfaInterceptor
    ✓ should be created
    ✓ should add X-MFA-Token for sensitive routes

TOTAL: 10 SUCCESS
```

**Why tests pass:**
- Unit tests use `HttpClientTestingModule` which provides a mock `HttpClient`
- The mock doesn't actually invoke interceptors in the real DI tree
- Tests directly instantiate interceptors and call `intercept()` method
- Tests verify the interceptor logic, not the registration
- No integration tests that verify interceptors run on actual HTTP calls

### Step 6: Deploy to Production

```bash
npm run build
# Deploy dist/ folder to production environment
```

**Result:** ✅ Deployment succeeds

---

## Production Failure

### Timeline

**2:00 PM** - Deployment completes  
**2:01 PM** - First user logs in successfully  
**2:01 PM** - User navigates to account dashboard  
**2:01 PM** - Dashboard attempts to load account data via API call  

**Backend API Gateway logs:**
```
2024-03-15 14:01:23 ERROR [API-Gateway] Request rejected: Missing Authorization header
  URL: /api/accounts/summary
  Method: GET
  Status: 401 Unauthorized
  Client-IP: 10.0.45.23
  User-Agent: Mozilla/5.0...
```

**Frontend Network Tab:**
```
Request URL: https://api.bank.com/api/accounts/summary
Request Method: GET
Status Code: 401 Unauthorized

Request Headers:
  Accept: application/json
  Content-Type: application/json
  X-Request-ID: abc-123-def
  ❌ Authorization: (MISSING!)
```

**User Experience:**
- Login screen works (uses different auth flow)
- After login, dashboard shows error: "Failed to load account data"
- Retry button shows same error
- No sensitive data displayed
- User cannot access any banking features

**2:02 PM** - 47 additional users hit the same issue  
**2:03 PM** - P0 incident declared: "Complete application outage - authentication failure"  
**2:05 PM** - Emergency rollback initiated  
**2:08 PM** - Rollback completes  

---

## Root Cause Analysis

### The Problem

The standalone migration schematic removed `AppModule` and created `main.ts` with:

```typescript
provideHttpClient()
```

This call creates an `HttpClient` instance **without** support for class-based interceptors registered via the `HTTP_INTERCEPTORS` token.

### Why It's Silent

1. **No compilation errors:** Interceptor classes still exist, TypeScript sees no issue
2. **No runtime errors:** Application boots normally, HttpClient works
3. **No test failures:** Unit tests mock HttpClient, don't test interceptor registration
4. **No warnings:** Angular doesn't warn about unused HTTP_INTERCEPTORS providers

### What Was Lost

The migration removed these providers from `AppModule`:

```typescript
{
  provide: HTTP_INTERCEPTORS,
  useClass: SsoTokenInterceptor,
  multi: true
},
{
  provide: HTTP_INTERCEPTORS,
  useClass: MfaInterceptor,
  multi: true
}
```

These providers are **not automatically migrated** to the standalone bootstrap configuration.

### The Impact

**Every HTTP request sent by the application:**
- ❌ Missing `Authorization: Bearer <token>` header
- ❌ Missing `X-MFA-Token: <token>` header for sensitive routes
- ❌ Rejected by API Gateway with 401 Unauthorized
- ❌ User cannot access any protected resources
- ❌ Application is completely non-functional for authenticated features

---

## The Correct Fix

### Option A: Keep Class-Based Interceptors (Recommended for minimal change)

**Update `main.ts`:**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { SsoTokenInterceptor } from './app/interceptors/sso-token.interceptor';
import { MfaInterceptor } from './app/interceptors/mfa.interceptor';
import { AuthService } from './app/services/auth.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),  // ✅ Enable legacy interceptors
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SsoTokenInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MfaInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error(err));
```

**Key change:** `provideHttpClient(withInterceptorsFromDi())`

This tells Angular to:
1. Create an HttpClient that supports class-based interceptors
2. Look for `HTTP_INTERCEPTORS` providers in the DI tree
3. Execute those interceptors on every HTTP request

### Option B: Convert to Functional Interceptors (Modern approach)

**Convert `sso-token.interceptor.ts` to function:**

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const ssoTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError(error => {
      if (error.status === 401 && token) {
        return authService.refreshToken().pipe(
          switchMap(newToken => {
            return next(req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            }));
          })
        );
      }
      return throwError(() => error);
    })
  );
};
```

**Convert `mfa.interceptor.ts` to function:**

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const MFA_REQUIRED_PATTERNS = [
  '/api/transfers',
  '/api/billpay',
  '/api/settings',
  '/api/beneficiaries',
  '/api/limits'
];

export const mfaInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const requiresMfa = MFA_REQUIRED_PATTERNS.some(pattern => req.url.includes(pattern));

  if (requiresMfa) {
    const mfaToken = authService.getMfaToken();
    if (mfaToken) {
      req = req.clone({
        setHeaders: { 'X-MFA-Token': mfaToken }
      });
    }
  }

  return next(req);
};
```

**Update `main.ts`:**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { ssoTokenInterceptor } from './app/interceptors/sso-token.interceptor';
import { mfaInterceptor } from './app/interceptors/mfa.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([ssoTokenInterceptor, mfaInterceptor])  // ✅ Register functional interceptors
    )
  ]
}).catch(err => console.error(err));
```

---

## Verification After Fix

### Integration Test

Create `src/app/interceptors/interceptor-registration.integration.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { SsoTokenInterceptor } from './sso-token.interceptor';
import { MfaInterceptor } from './mfa.interceptor';
import { AuthService } from '../services/auth.service';

describe('Interceptor Registration Integration Test', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: SsoTokenInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: MfaInterceptor, multi: true },
        AuthService
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should attach Authorization header to all requests', () => {
    authService.setToken('test-token-12345');

    httpClient.get('/api/accounts').subscribe();

    const req = httpTestingController.expectOne('/api/accounts');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-12345');

    req.flush({ accounts: [] });
  });

  it('should attach X-MFA-Token to sensitive routes', () => {
    authService.setToken('test-token-12345');
    authService.setMfaToken('mfa-token-67890');

    httpClient.post('/api/transfers', { amount: 500 }).subscribe();

    const req = httpTestingController.expectOne('/api/transfers');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-12345');
    expect(req.request.headers.get('X-MFA-Token')).toBe('mfa-token-67890');

    req.flush({ success: true });
  });

  it('should NOT attach MFA token to non-sensitive routes', () => {
    authService.setToken('test-token-12345');
    authService.setMfaToken('mfa-token-67890');

    httpClient.get('/api/accounts').subscribe();

    const req = httpTestingController.expectOne('/api/accounts');
    expect(req.request.headers.has('X-MFA-Token')).toBe(false);

    req.flush({ accounts: [] });
  });
});
```

### Manual QA Verification

1. Deploy to staging environment
2. Open browser DevTools > Network tab
3. Log in to application
4. Navigate to account dashboard
5. Verify in Network tab that API request to `/api/accounts/summary` includes:
   - `Authorization: Bearer <token>` header ✅
6. Navigate to transfer page and initiate transfer
7. Verify API request to `/api/transfers` includes:
   - `Authorization: Bearer <token>` header ✅
   - `X-MFA-Token: <token>` header ✅

---

## Lessons Learned

### Why This Happened

1. **Schematic limitation:** The `@angular/core:standalone` schematic doesn't analyze interceptor registrations
2. **Silent failure:** No compile-time or runtime indication that interceptors are ignored
3. **Test gap:** Unit tests don't verify interceptor registration in real HTTP calls
4. **Breaking change:** Standalone apps require explicit interceptor configuration

### Prevention for Future Migrations

1. **Always inventory auth-critical components before migration**
2. **Add integration tests for interceptor registration BEFORE migration**
3. **Manual QA verification of auth headers in network tab BEFORE production**
4. **Security team review gate for all auth-critical changes**
5. **Automated checks:** Create pre-deployment test that verifies auth headers

### Detection Strategy

Add this check to CI/CD pipeline:

```typescript
// e2e/auth-headers.e2e-spec.ts
describe('Authentication Headers E2E', () => {
  it('should include Authorization header on all API calls', async () => {
    const page = await browser.newPage();

    // Intercept all HTTP requests
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });

    await page.goto('http://localhost:4200');
    await page.click('#login-button');
    await page.waitForNavigation();
    await page.click('#accounts-tab');
    await page.waitForTimeout(2000);

    // Verify all API requests have Authorization header
    const missingAuth = requests.filter(r => !r.headers['authorization']);

    expect(missingAuth.length).toBe(0,
      `Found ${missingAuth.length} API requests without Authorization header: ${JSON.stringify(missingAuth)}`
    );
  });
});
```

This test would have caught the issue before production deployment.
