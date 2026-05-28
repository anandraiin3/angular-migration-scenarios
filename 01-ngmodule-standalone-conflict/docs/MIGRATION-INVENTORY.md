# Migration Inventory — Scenario 01: NgModule vs Standalone Component Conflict

**Component:** SharedBankingModule (AuthService + 3 UI components)  
**Migration Path:** Angular 14.2.0 → 20.0.0  
**Author:** Devin (automated pre-migration analysis)  
**Status:** AWAITING ARCHITECT APPROVAL — no code changes made  

---

## Files in Scope

| File | Type |
|------|------|
| `src/app/shared/auth.service.ts` | Service (`@Injectable()`) |
| `src/app/shared/shared-banking.module.ts` | NgModule |
| `src/app/shared/account-summary/account-summary.component.ts` | Component |
| `src/app/shared/transaction-list/transaction-list.component.ts` | Component |
| `src/app/shared/quick-transfer/quick-transfer.component.ts` | Component |
| `package.json` | Dependencies |

---

## Version-by-Version Breaking Changes

### Angular 14 → 15

| Breaking Change | Affects This Codebase? | Required Action |
|----------------|----------------------|-----------------|
| Keyframe names prefixed with component scope name | NO — no `@keyframes` in any component | None |
| Invalid constructors for DI now report compilation errors | POSSIBLY — `AuthService` uses `@Injectable()` without `providedIn` but is provided via NgModule, so valid | Verify compilation; no change expected |
| `enableIvy` compiler option removed | NO — not set in this codebase | None |
| Standalone APIs graduated from developer preview | NO IMPACT — per **Rule 2.1** we preserve NgModule architecture | None |
| `RouterModule.forRoot` strictness changes | NOT IN SCOPE — no routing files in this scenario | None |
| `HttpClientModule` improvements | NOT IN SCOPE — no HTTP usage in these files | None |

**TypeScript:** 4.7 → 4.8 or 4.9 required (minimum 4.8.2)  
**RxJS:** 7.5 compatible, no changes needed  
**Zone.js:** 0.11.x → 0.12.x or 0.13.x  

### Angular 15 → 16

| Breaking Change | Affects This Codebase? | Required Action |
|----------------|----------------------|-----------------|
| `DestroyRef` introduced | NO — not used | None |
| Signals introduced (developer preview) | NO IMPACT — optional feature | None |
| Required inputs (developer preview) | NO — not used | None |
| Node.js 14 support dropped | YES — ensure build environment uses Node.js ≥ 16 | Verify CI/build environment |
| `ngcc` removed | YES — if any View Engine libraries are in use | Verify all dependencies are Ivy-native |

**TypeScript:** minimum 4.9.3 required  
**RxJS:** 7.5 compatible  

### Angular 16 → 17

| Breaking Change | Affects This Codebase? | Required Action |
|----------------|----------------------|-----------------|
| New control flow syntax (`@if`, `@for`) available | NO CHANGE — per **Rule 2.1** preserve existing template syntax; `*ngIf`/`*ngFor` still supported | None |
| Standalone as recommended default for new components | NO CHANGE — per **Rule 2.1** preserve NgModule | None |
| ESBuild as default build system for **new** projects | NO CHANGE — per **Rule 2.2** preserve Webpack | None |
| Deferrable views (`@defer`) | NO CHANGE — optional feature | None |
| Animations module refactoring | NO — no animations used in these files | None |

**TypeScript:** minimum 5.2 required  
**Node.js:** minimum 18.13 required  

### Angular 17 → 18

| Breaking Change | Affects This Codebase? | Required Action |
|----------------|----------------------|-----------------|
| Zoneless change detection (experimental) | NO CHANGE — optional feature | None |
| Route redirects can use functions | NOT IN SCOPE | None |
| `@angular/platform-browser-dynamic` still supported | N/A | None |
| ESBuild+Vite default for new projects | NO CHANGE — per **Rule 2.2** preserve Webpack | None |

**TypeScript:** minimum 5.4 required  
**RxJS:** 7.x compatible  

### Angular 18 → 19

| Breaking Change | Affects This Codebase? | Required Action |
|----------------|----------------------|-----------------|
| **Components/directives/pipes standalone by default** | **YES — CRITICAL** | Must add `standalone: false` to all 3 component decorators since they are declared in an NgModule (per **Rule 2.1**) |
| TypeScript < 5.5 dropped | YES | Upgrade TypeScript to ≥ 5.5 |
| `effect()` timing changes | NO — not used | None |
| `ExperimentalPendingTasks` → `PendingTasks` | NO — not used | None |

### Angular 19 → 20

| Breaking Change | Affects This Codebase? | Required Action |
|----------------|----------------------|-----------------|
| TypeScript < 5.8 dropped | YES | Upgrade TypeScript to ~5.8 |
| Suspicious date format patterns throw errors | POSSIBLY — `date:'short'` and `date:'MM/dd/yyyy'` used in templates | Verify these are not flagged (standard formats should be fine) |
| `effect`, `linkedSignal`, `toSignal` stabilized | NO — not used | None |
| Zoneless promoted to developer preview | NO CHANGE — optional | None |
| Style guide updates | REVIEW — flag under "Architecture Decision Required" per Rule 2.3 | None — cosmetic |

---

## Summary of Required Code Changes

| Change | Files Affected | Rule Reference |
|--------|---------------|----------------|
| Add `standalone: false` to all `@Component` decorators | 3 component files | Rule 2.1 (preserve NgModule) |
| Update `package.json` Angular deps to ^20.0.0 | package.json | — |
| Update TypeScript to ~5.8.0 | package.json | — |
| Update zone.js to ~0.15.0 | package.json | — |
| Keep `*ngIf` / `*ngFor` / `CommonModule` (no control flow migration) | — (no change) | Rule 2.1 |
| Keep Karma test runner | — (no change) | Rule 4.2 |
| Keep Webpack build system | — (no change) | Rule 2.2 |
| Flag NgModule deprecation warnings in PR | PR description | Rule 2.1 |

---

## Architecture Decision Required

Per **Rule 2.1**, Angular 20 will produce deprecation warnings about NgModule patterns. These should be flagged in the PR description under "Architecture Decision Required" — not resolved autonomously.

Specifically:
- `SharedBankingModule` uses `@NgModule` with `providers: [AuthService]`
- `AuthService` uses `@Injectable()` without `providedIn: 'root'`
- All 3 components are declared in the NgModule

These patterns are deprecated in Angular 20 but **still fully functional**. The playbook explicitly requires preserving this architecture.

---

## Order of Application

1. Update `package.json` dependencies (Angular 14 → 20, TypeScript, zone.js)
2. Add `standalone: false` to all 3 component decorators
3. Verify compilation
4. Verify all existing unit tests pass on Karma
5. Open PR with all required sections per Rule 4.1
