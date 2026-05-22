# Migration Attempt — What Breaks

## Naive Migration Approach

A developer sees Angular 20 deprecation warnings about NgModule patterns and decides to modernize the codebase by converting components to standalone.

### Step 1: Developer runs the migration
```bash
ng update @angular/core@20 @angular/cli@20
```

Migration succeeds. Build succeeds. Deprecation warnings appear:

```
WARNING: NgModule-based providers are deprecated. Consider using standalone components and providedIn: 'root'.
  src/app/shared/shared-banking.module.ts:42:3
```

### Step 2: Developer converts AccountSummaryComponent to standalone

Following Angular's official migration guide, the developer runs:

```bash
ng generate @angular/core:standalone --component=src/app/shared/account-summary/account-summary.component.ts
```

This converts `AccountSummaryComponent` to:

```typescript
@Component({
  selector: 'app-account-summary',
  standalone: true,
  imports: [CommonModule],
  template: `...`,
  styles: [`...`]
})
export class AccountSummaryComponent implements OnInit {
  // ... same code ...
}
```

And updates `SharedBankingModule`:

```typescript
@NgModule({
  declarations: [
    // AccountSummaryComponent removed from here
    TransactionListComponent,
    QuickTransferComponent
  ],
  imports: [CommonModule],
  exports: [
    // AccountSummaryComponent removed from exports
    TransactionListComponent,
    QuickTransferComponent
  ],
  providers: [AuthService]  // Still here!
})
export class SharedBankingModule { }
```

### Step 3: Developer updates DashboardModule

`DashboardModule` previously imported `SharedBankingModule` to get `AccountSummaryComponent`. Now the developer updates it to import the standalone component directly:

```typescript
import { AccountSummaryComponent } from '../shared/account-summary/account-summary.component';

@NgModule({
  declarations: [DashboardComponent],
  imports: [
    CommonModule,
    SharedBankingModule,  // Still imports this for TransactionListComponent
    AccountSummaryComponent  // Now imports standalone component directly
  ]
})
export class DashboardModule { }
```

### Step 4: Build succeeds ✓

```bash
ng build
```

No errors. No warnings about the DI issue.

### Step 5: Unit tests pass ✓

```bash
ng test
```

All tests pass because:
- Tests for `AccountSummaryComponent` mock `AuthService` via `TestBed.configureTestingModule`
- Tests for `DashboardModule` also mock `AuthService`
- Tests never instantiate both the dashboard and lazy-loaded account details module in the same test, so they don't detect the singleton break

---

## What Actually Broke (Discovered in Production)

### The Failure Mode

1. **Dashboard loads (eager module):**
   - `DashboardModule` imports `SharedBankingModule`
   - `SharedBankingModule` provides `AuthService` instance #1
   - `DashboardModule` also imports standalone `AccountSummaryComponent`
   - `AccountSummaryComponent` injects `AuthService` — receives instance #1 ✓

2. **User navigates to Account Details (lazy module):**
   - `AccountDetailsModule` is lazy-loaded via `loadChildren`
   - `AccountDetailsModule` imports `SharedBankingModule`
   - Because it's a lazy boundary AND `SharedBankingModule` provides `AuthService` (not providedIn: 'root'), Angular creates `AuthService` instance #2
   - Components in `AccountDetailsModule` inject `AuthService` — receive instance #2

3. **Result:**
   - User logs in on the dashboard → `AuthService` instance #1 stores the session
   - User navigates to account details → Components check `AuthService` instance #2, which has NO session
   - Application sees user as unauthenticated and redirects to login

### Console Output Shows the Problem

```
[AuthService] New instance created: a7f3k2
[AccountSummaryComponent] Using AuthService instance: a7f3k2
[DashboardComponent] Login successful via instance: a7f3k2

// User navigates to /account-details (lazy route)

[AuthService] New instance created: m9p4x8  // ⚠️ SECOND INSTANCE!
[AccountDetailsComponent] Using AuthService instance: m9p4x8
[AccountDetailsComponent] isAuthenticated: false  // ⚠️ NO SESSION!
[Router] Redirecting to /login - user not authenticated
```

### Why Tests Didn't Catch This

**Unit tests** never load both modules simultaneously:
```typescript
// Test for AccountSummaryComponent
TestBed.configureTestingModule({
  imports: [AccountSummaryComponent],  // Standalone import
  providers: [{ provide: AuthService, useValue: mockAuthService }]  // Mocked
});
```

**Integration tests** don't exist that:
1. Navigate through the entire route tree
2. Verify AuthService singleton behavior across lazy boundaries
3. Check that the same instance is injected in both eager and lazy modules

---

## Impact Quantification

### Discovery Timeline
- **Deploy to production:** Wednesday 2pm
- **First customer complaint:** Wednesday 3:47pm ("App keeps logging me out")
- **P1 incident declared:** Wednesday 4:15pm
- **Root cause identified:** Thursday 11am (20 hours of investigation)
- **Fix deployed:** Thursday 3pm (25 hours after deploy)

### Customer Impact
- 1,247 users affected during the 25-hour window
- 89 customer service calls related to "login loop" issue
- 3 escalations to branch managers
- Social media mentions: 14 tweets, 6 tagged BofA official account

### Engineering Cost
- 3 engineers × 8 hours each = 24 engineering hours for diagnosis
- 1 engineer × 4 hours = 4 hours for fix implementation
- QA testing: 6 hours
- Post-mortem meeting: 2 hours (8 people) = 16 person-hours
- **Total:** 50 engineering hours = ~$12,500 at $250/hour loaded cost

---

## The Correct Approach (With Playbook)

### Pre-Migration: Architecture Inventory (Devin)

Before any code changes:

```
ARCHITECTURE INVENTORY — SharedBankingModule

Services Provided (not providedIn: 'root'):
  - AuthService
    Injection sites: 14 components across 3 modules
    Critical path: YES (authentication state)
    Singleton requirement: REQUIRED across all module boundaries

Lazy Module Boundaries:
  - DashboardModule (eager) → imports SharedBankingModule
  - AccountDetailsModule (lazy via /account-details) → imports SharedBankingModule
  - TransfersModule (lazy via /transfers) → imports SharedBankingModule

RISK ASSESSMENT:
⚠️ HIGH RISK: AuthService is provided in SharedBankingModule (not root).
Converting ANY component to standalone while modules still import
SharedBankingModule will fracture the DI tree at lazy boundaries.

RECOMMENDATION:
Path A (Recommended): Convert AuthService to providedIn: 'root' FIRST.
  1. Change AuthService to @Injectable({ providedIn: 'root' })
  2. Remove from SharedBankingModule providers array
  3. Add integration test verifying singleton across lazy boundaries
  4. THEN convert components to standalone one by one

Path B (Defer): Keep entire SharedBankingModule as NgModule until all
consumers are ready for simultaneous migration.

REQUIRED APPROVAL: Architecture team must choose Path A or Path B.
```

### Implementation (After Approval of Path A)

**Step 1:** Convert AuthService to providedIn: 'root'

```typescript
@Injectable({
  providedIn: 'root'  // Changed from module-provided
})
export class AuthService {
  // ... implementation unchanged ...
}
```

**Step 2:** Remove from SharedBankingModule providers

```typescript
@NgModule({
  declarations: [AccountSummaryComponent, TransactionListComponent, QuickTransferComponent],
  imports: [CommonModule],
  exports: [AccountSummaryComponent, TransactionListComponent, QuickTransferComponent],
  providers: []  // AuthService removed
})
export class SharedBankingModule { }
```

**Step 3:** Add integration test (BLOCKING)

```typescript
describe('AuthService singleton behavior across lazy boundaries', () => {
  it('should maintain same instance in eager and lazy modules', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    // Navigate to dashboard (eager)
    router.navigate(['/dashboard']);
    tick();
    const dashboardAuthService = TestBed.inject(AuthService);
    const instanceId1 = dashboardAuthService.instanceId;

    // Navigate to account details (lazy)
    router.navigate(['/account-details']);
    tick();
    const accountDetailsAuthService = TestBed.inject(AuthService);
    const instanceId2 = accountDetailsAuthService.instanceId;

    // CRITICAL ASSERTION
    expect(instanceId1).toBe(instanceId2);
    expect(dashboardAuthService).toBe(accountDetailsAuthService);  // Same object reference
  }));
});
```

**Step 4:** Only after test passes, convert components

Now it's safe to convert `AccountSummaryComponent` to standalone because `AuthService` is root-provided.

### Result

- No singleton break
- No production incident
- No customer impact
- Engineering time: 4 hours for planned migration vs 50 hours for incident response
- **Cost savings:** $11,500

---

## Key Takeaway

The build system and unit tests cannot detect DI scoping issues across lazy module boundaries. This is a category of bug that requires:
1. Architecture-level analysis BEFORE code changes
2. Integration tests that exercise the full module graph
3. Human review of service scoping decisions

**This is exactly why the playbook exists:** To catch the bugs that compilers and unit tests cannot catch.
