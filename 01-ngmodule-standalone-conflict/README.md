# Scenario 01 — NgModule vs Standalone Component Architecture Conflict

## The Problem

This codebase uses Angular's NgModule pattern to create a `SharedBankingModule` that declares and exports banking UI components (`AccountSummaryComponent`, `TransactionListComponent`, `QuickTransferComponent`) and provides a shared `AuthService` as a singleton in its providers array. Both the main `DashboardModule` and a lazy-loaded `AccountDetailsModule` import this shared module. When a developer naively converts individual components to Angular 20's standalone pattern while other modules still use NgModule imports, the dependency injection tree breaks — each lazy-loaded module receives its own instance of `AuthService` instead of sharing a singleton, breaking session state and causing authentication failures.

## Why This Matters for a Bank

Authentication state must be a singleton across the entire application. If a user logs in and the lazy-loaded account details page receives a different instance of `AuthService`, it sees the user as unauthenticated and redirects to login — even though the user just authenticated on the dashboard. This appears to customers as the application "forgetting" their login randomly, eroding trust in the banking platform. From a security perspective, multiple `AuthService` instances create race conditions where one instance may have a valid token while another has an expired token, leading to inconsistent security posture across the application.

## What the Playbook Rule Says

**Playbook Rule 3.2 — Singleton Service Integrity:**

> Before converting any component to standalone, produce an architecture inventory identifying:
> 1. All services provided in NgModule providers arrays (not `providedIn: 'root'`)
> 2. All lazy-loaded modules and their shared service dependencies
> 3. All components that inject these services
>
> Any service that must remain a singleton across lazy boundaries must either:
> - Remain provided in a shared NgModule until ALL consumers are migrated simultaneously, OR
> - Be converted to `providedIn: 'root'` with explicit verification that no code depends on module-scoped instances
>
> **Gate:** Architecture inventory must be reviewed and approved before any NgModule → standalone conversion begins.

## The Correct Migration Approach

### Step 1: Pre-Migration Architecture Inventory (Devin)
1. Scan all `@NgModule` decorators for services in `providers` arrays
2. Identify which services are `providedIn: 'root'` vs module-scoped
3. Trace all lazy-loaded module boundaries using `loadChildren` in routing configs
4. For each module-scoped service, identify all injection sites across all modules
5. Produce a report: "SharedBankingModule provides AuthService (not root-scoped). Injected in 14 components across DashboardModule and AccountDetailsModule (lazy). Cannot convert to standalone piecemeal."

### Step 2: Singleton Migration Plan (Human Review Required)
Architecture review determines one of two paths:
- **Path A:** Convert `AuthService` to `providedIn: 'root'` first, verify in tests that no code relies on module-scoped instances, THEN convert components to standalone
- **Path B:** Keep `SharedBankingModule` as NgModule, only convert leaf components that don't provide services, defer full standalone conversion until all consumers are ready for simultaneous migration

### Step 3: Implementation (Devin, after approval)
Following Path A example:
1. Change `AuthService` from module-provided to `providedIn: 'root'`
2. Add integration test verifying singleton behavior across lazy boundaries:
   ```typescript
   it('should maintain AuthService singleton across lazy modules', fakeAsync(() => {
     // Navigate to dashboard, capture AuthService instance
     // Navigate to lazy-loaded account details, capture AuthService instance
     // Verify instances are identical
   }));
   ```
3. Only after test passes, convert components to standalone one by one
4. Each PR includes: component conversion + verification that AuthService injection still works + downstream consumer test results

### Step 4: PR Requirements
- Architecture inventory document linked in PR description
- Approval comment from architecture review showing which path was chosen
- Test results showing singleton behavior maintained
- No component conversion without service migration completed first

---

## What Breaks Without This Approach

**Naive migration attempt:**
1. Developer sees Angular 20 deprecation warnings about NgModule
2. Converts `AccountSummaryComponent` to standalone using `ng generate component --standalone`
3. Updates `DashboardModule` to import `AccountSummaryComponent` directly instead of via `SharedBankingModule`
4. Build succeeds, unit tests pass (they mock `AuthService` so don't catch the singleton break)
5. Lazy-loaded `AccountDetailsModule` still imports `SharedBankingModule`, which still provides `AuthService`
6. Result: Dashboard gets one `AuthService` instance (from root or first module), account details page gets a different instance (from its lazy module)
7. User logs in on dashboard → navigates to account details → sees login screen again

**Detection time:** Discovered in production or QA testing when a user reports "the app keeps logging me out."

**Fix time:** 4-6 hours to diagnose (requires understanding Angular DI scoping), 2 hours to fix, 1 day to verify across all lazy boundaries.

**With playbook:** Flagged in architecture inventory before first line of code is changed. Fix time: 0, because code is never broken.
