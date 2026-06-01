# Angular Version-Specific Breaking Changes Audit

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`
**Reference:** [Angular Update Guide v14→18 (Advanced)](https://angular.dev/update-guide?v=14.0-18.0&l=3)

---

## v14 → v15 Breaking Changes

### 1. `enableIvy` in tsconfig.json
- **Search:** `rg -n "enableIvy" --type ts --type json`
- **Result:** 0 instances found
- **Risk:** N/A

### 2. `@keyframes` in component CSS + programmatic reference
- **Search:** `rg -n "@keyframes" --type ts --type css`
- **Result:** 1 instance found
- **File:** `02-rxjs-behavioral-break/src/app/components/fund-transfer.component.ts:95`
- **Context:** `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` — inline CSS spinner
- **Risk:** LOW — keyframe is CSS-only, not referenced programmatically from TypeScript

### 3. Base classes with inherited constructors missing `@Injectable`/`@Directive`
- **Search:** `rg -n "extends.*Component|extends.*Service|extends.*Directive" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 4. `ControlValueAccessor` / `setDisabledState` behavior changes
- **Search:** `rg -n "ControlValueAccessor|setDisabledState" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 5. `canParse` from `@angular/localize/tools`
- **Search:** `rg -n "canParse" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 6. `ActivatedRouteSnapshot` without `title` property
- **Search:** `rg -n "ActivatedRouteSnapshot" --type ts`
- **Result:** 2 files found
- **File:** `09-karma-test-runner-removal/src/app/guards/auth.guard.ts:3,30,41`
- **Risk:** LOW — code does not access `title` property directly; reads `route.data['roles']`

### 7. `relativeLinkResolution` in Router config
- **Search:** `rg -n "relativeLinkResolution" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 8. `DATE_PIPE_DEFAULT_TIMEZONE` token
- **Search:** `rg -n "DATE_PIPE_DEFAULT_TIMEZONE" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 9. `<iframe>` attribute bindings (NG0910)
- **Search:** `rg -n "<iframe" --type ts --type html`
- **Result:** 0 instances (only in comments)
- **Risk:** N/A

### 10. `Injector.get()` / `TestBed.inject()` using `InjectFlags`
- **Search:** `rg -n "InjectFlags" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 11. `providedIn: 'any'` (deprecated)
- **Search:** `rg -n "providedIn.*any" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 12. `providedIn: SomeModule` (deprecated)
- **Search:** `rg -n "providedIn:.*Module" --type ts` (excluding 'root')
- **Result:** 0 instances found
- **Risk:** N/A

### 13. `RouterLinkWithHref` directive
- **Search:** `rg -n "RouterLinkWithHref" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 14. Class-based HTTP interceptors (must plan migration)
- **Result:** 2 instances found (see DEPENDENCY_ARCHITECTURE.md)
- **Files:** `sso-token.interceptor.ts:42`, `mfa.interceptor.ts:49`
- **Risk:** **HIGH** — Must convert to functional interceptors or use `withInterceptorsFromDi()` bridge

**v14→v15 Summary:** 2 HIGH-risk findings (class-based interceptors), 1 LOW-risk finding (@keyframes)

---

## v15 → v16 Breaking Changes

### 1. `RouterEvent` in Event type unions
- **Search:** `rg -n "RouterEvent" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 2. `NavigationSkipped` event handling
- **Search:** `rg -n "NavigationSkipped" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 3. `RendererType2.styles` with nested arrays
- **Search:** `rg -n "RendererType2" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 4. `BrowserPlatformLocation` in tests
- **Search:** `rg -n "BrowserPlatformLocation" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 5. View Engine-only third-party libraries (ngcc removed)
- **Search:** Manual inspection of `package.json` dependencies
- **Result:** 0 View Engine-only libraries detected
- **Risk:** N/A — All dependencies appear Ivy-compatible

### 6. `Router.createUrlTree` mocks in tests
- **Search:** `rg -n "createUrlTree" --type ts`
- **Result:** 1 instance in test mock
- **File:** `09-karma-test-runner-removal/src/app/guards/auth.guard.spec.ts:12`
- **Context:** `createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({} as UrlTree)`
- **Risk:** **MEDIUM** — Mock may break with v16 Router bug fixes; verify test behavior after upgrade

### 7. `ApplicationConfig` import location
- **Search:** `rg -n "ApplicationConfig" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 8. `renderModuleFactory` usage
- **Search:** `rg -n "renderModuleFactory" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 9. `XhrFactory` import from `@angular/common/http`
- **Search:** `rg -n "XhrFactory" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 10. `BrowserModule.withServerTransition()`
- **Search:** `rg -n "withServerTransition" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 11. `EnvironmentInjector.runInContext`
- **Search:** `rg -n "runInContext" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 12. `ComponentFactoryResolver` usage
- **Search:** `rg -n "ComponentFactoryResolver" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 13. `@Directive`/`@Component` `moduleId` property
- **Search:** `rg -n "moduleId" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 14. `TransferState`/`StateKey`/`makeStateKey` imports from `@angular/platform-browser`
- **Search:** `rg -n "TransferState|StateKey|makeStateKey" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 15. `ANALYZE_FOR_ENTRY_COMPONENTS` token
- **Search:** `rg -n "ANALYZE_FOR_ENTRY_COMPONENTS" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 16. `entryComponents` in `@NgModule`/`@Component`
- **Search:** `rg -n "entryComponents" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 17. `ReflectiveInjector` usage
- **Search:** `rg -n "ReflectiveInjector" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 18. `BrowserTransferStateModule` references
- **Search:** `rg -n "BrowserTransferStateModule" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 19. `EventManager.addGlobalEventListener`
- **Search:** `rg -n "addGlobalEventListener" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 20. `ngTemplateOutletContext` stricter type checking
- **Search:** `rg -n "ngTemplateOutletContext" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 21. FESM2015 removal (ECMAScript 2020→2022)
- **Search:** `rg -n "FESM2015|fesm2015" --type ts --type json`
- **Result:** 0 explicit references found
- **Risk:** LOW — Build system handles this automatically; verify no manual FESM2015 imports exist

**v15→v16 Summary:** 1 MEDIUM-risk finding (Router.createUrlTree mock in tests), 0 HIGH

---

## v16 → v17 Breaking Changes

### 1. `REMOVE_STYLES_ON_COMPONENT_DESTROY`
- **Search:** `rg -n "REMOVE_STYLES_ON_COMPONENT_DESTROY" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 2. Router properties set directly on Router instance
- **Search:** `rg -n "canceledNavigationResolution|paramsInheritanceStrategy|titleStrategy|urlUpdateStrategy|urlHandlingStrategy|malformedUriErrorHandler" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 3. `malformedUriErrorHandler`
- **Result:** 0 instances (covered by search above)

### 4. Zone.js deep imports
- **Search:** `rg -n "zone.js/bundles|zone.js/dist" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 5. Absolute redirects in routing config (infinite loop risk)
- **Search:** `rg -n "redirectTo.*/" --type ts`
- **Result:** 0 route redirect configurations found
- **Risk:** N/A

### 6. `AnimationDriver.NOOP`
- **Search:** `rg -n "AnimationDriver.NOOP" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 7. `NgSwitch` strict equality (`==` → `===`)
- **Search:** `rg -n "ngSwitch" --type ts --type html`
- **Result:** 0 instances found
- **Risk:** N/A

### 8. `Signal.mutate()` calls
- **Search:** `rg -n "Signal.mutate|\.mutate\(" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 9. `withNoDomReuse` in hydration config
- **Search:** `rg -n "withNoDomReuse" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 10. `loadComponent` routes with `paramsInheritanceStrategy`
- **Search:** `rg -n "paramsInheritanceStrategy" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 11. Dynamically instantiated components with `ngDoCheck`
- **Search:** `rg -n "ngDoCheck" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

**v16→v17 Summary:** 0 findings. No v16→v17 breaking patterns detected.

---

## v17 → v18 Breaking Changes

### 1. `async` from `@angular/core/testing` (removed → `waitForAsync`)
- **Search:** `rg -n "from '@angular/core/testing'" --type ts`
- **Result:** 5 files import from `@angular/core/testing`
- **Analysis:** All files import `fakeAsync`, `tick`, `flush`, `waitForAsync` — none import `async`
- **File:** `09-karma-test-runner-removal/src/app/components/transaction-list.component.spec.ts:1` uses `waitForAsync` (correct)
- **Risk:** N/A — already using `waitForAsync`

### 2. `AnimationDriver.matchesElement`
- **Search:** `rg -n "matchesElement" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 3. `StateKey`/`TransferState` from `@angular/platform-browser`
- **Result:** 0 instances (already checked above)

### 4. `isPlatformWorkerUi`/`isPlatformWorkerApp`
- **Search:** `rg -n "isPlatformWorkerUi|isPlatformWorkerApp" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 5. Template expressions writing to properties alongside `[(ngModel)]`
- **Search:** `rg -n "ngModel" --type ts`
- **Result:** `09-karma-test-runner-removal/src/app/components/transaction-list.component.ts` uses `[(ngModel)]` for search/filter binding
- **Risk:** LOW — Standard two-way binding, no conflicting property writes detected

### 6. `Testability` methods (removed)
- **Search:** `rg -n "increasePendingRequestCount|decreasePendingRequestCount|getPendingRequestCount" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 7. Environment providers in `RouterOutlet`
- **Search:** `rg -n "RouterOutlet.*providers" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 8. Guard returning `UrlTree` for redirect (v18 uses `replaceUrl`)
- **Search:** `rg -n "createUrlTree" --type ts` (non-test files)
- **Result:** `09-karma-test-runner-removal/src/app/guards/auth.guard.ts:48,56`
- **Risk:** **MEDIUM** — Guard returns UrlTree for login/unauthorized redirects; v18 changes redirect behavior to use `replaceUrl`. May need `RedirectCommand` for correct history management.

### 9. `RESOURCE_CACHE_PROVIDER`
- **Search:** `rg -n "RESOURCE_CACHE_PROVIDER" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 10. `platformDynamicServer`
- **Search:** `rg -n "platformDynamicServer" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 11. `ServerTransferStateModule`
- **Search:** `rg -n "ServerTransferStateModule" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 12. `Route.redirectTo` as string-only
- **Result:** 0 route redirects found to assess

### 13. Guards/resolvers expecting only `boolean|UrlTree`
- **Result:** `AuthGuard` returns `Observable<boolean | UrlTree>` (line 32). v18 adds `RedirectCommand` as possible return — existing code is compatible but won't leverage new capability.
- **Risk:** LOW

### 14. `OnPush` components with host bindings not marked dirty
- **Search:** `rg -n "OnPush" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 15. `ComponentFixture.whenStable` / `autoDetect` test changes
- **Search:** `rg -n "whenStable|autoDetect" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 16. `withHttpTransferCache` / `includeRequestsWithAuthHeaders`
- **Search:** `rg -n "withHttpTransferCache|includeRequestsWithAuthHeaders" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

**v17→v18 Summary:** 1 MEDIUM-risk finding (guard UrlTree redirect behavior change)

---

## Cross-Version Findings Summary

| Version Boundary | Patterns Found | HIGH Risk | MEDIUM Risk | LOW Risk | No Impact |
|---|---|---|---|---|---|
| **v14→v15** | 3 | 1 (interceptors) | 0 | 2 | 11 |
| **v15→v16** | 1 | 0 | 1 (createUrlTree mock) | 0 | 20 |
| **v16→v17** | 0 | 0 | 0 | 0 | 11 |
| **v17→v18** | 2 | 0 | 1 (UrlTree redirect) | 1 | 14 |
| **Total** | **6** | **1** | **2** | **3** | **56** |

**Note:** Many of the "no impact" items reflect that this is a demonstration repository with focused scenarios. A production application would likely have more hits. The patterns documented here serve as a checklist for scanning the actual production codebase.
