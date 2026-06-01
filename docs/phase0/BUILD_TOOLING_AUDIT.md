# Build System & Test Runner Assessment

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. Build System

### Current Build System

| Scenario | Builder | Version | Notes |
|---|---|---|---|
| 01–06, 08–09 | `@angular-devkit/build-angular` | `^14.2.0` | Standard Angular CLI Webpack builder |
| 07 | `@angular-devkit/build-angular` | `^20.0.0` | esbuild-based (Angular 20) |
| 10 | `@angular-builders/custom-webpack` | `^14.1.0` | Custom Webpack configuration |

### Custom Webpack Configuration (Scenario 10) — **HIGH RISK**

**File:** `10-webpack-custom-config-loss/custom-webpack.config.js` (142 lines)

Angular CLI switches from Webpack to esbuild in v17+. The custom Webpack configuration will be **completely lost** during migration. All customizations must be replicated using alternative approaches.

#### Custom Webpack Plugins/Features Requiring esbuild Equivalents:

| # | Feature | Webpack Implementation | esbuild Equivalent | Risk |
|---|---|---|---|---|
| 1 | **CA Certificate Injection** | `webpack.DefinePlugin` embeds corporate CA cert at build time (lines 33–37) | Must use env vars or Angular `fileReplacements` | **CRITICAL** — Without CA cert, all internal HTTPS API calls fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` |
| 2 | **Build-time Environment Variables** | `webpack.DefinePlugin` for `process.env.*` injection (lines 52–73) — API keys, service URLs, build metadata | Angular `fileReplacements` or `--define` flags in esbuild | **HIGH** — API keys and service URLs will be `undefined` without injection |
| 3 | **Custom Module Aliases** | `config.resolve.alias` maps internal package names (lines 83–92) — `@company/shared-components` → internal registry | `tsconfig.json` paths or esbuild resolve plugins | **MEDIUM** — Requires rewriting import aliases |
| 4 | **Legacy Code Loaders** | `babel-loader` for `.legacy.js` files with decorator transforms (lines 101–117) | Custom esbuild plugins or pre-build step | **MEDIUM** — Legacy decorator transforms need alternative |
| 5 | **Production Console Stripping** | `terserOptions.compress.drop_console` (line 127) | esbuild `drop: ['console']` option | **LOW** — Direct equivalent exists |

#### Build-Time Injected Values (from `build-config.ts`):

| Variable | Source | Critical? |
|---|---|---|
| `ANALYTICS_API_KEY` | CI/CD secrets | Yes |
| `MAPS_API_KEY` | CI/CD secrets | Yes |
| `AUTH_SERVICE_URL` | Environment-specific | Yes |
| `DATA_SERVICE_URL` | Environment-specific | Yes |
| `CORPORATE_CA_CERT` | File system | **CRITICAL** |
| `CA_CERT_EMBEDDED` | Derived | Yes |
| `BUILD_NUMBER` | CI/CD | No |
| `GIT_COMMIT` | CI/CD | No |
| `BUILD_TIMESTAMP` | Build time | No |

**Remediation Strategy:**
1. Replace `DefinePlugin` with Angular `fileReplacements` or runtime environment injection
2. Replace `resolve.alias` with `tsconfig.json` path mappings
3. Replace `babel-loader` with pre-build compilation step
4. Use esbuild's native console stripping

**Estimated Effort:** 2–4 hours (high complexity due to CA cert injection)

---

## 2. Test Runner

### Karma Configuration

Two scenarios use Karma for testing:

#### Scenario 09: `09-karma-test-runner-removal/karma.conf.js` (95 lines)

| Setting | Value | Migration Impact |
|---|---|---|
| **Framework** | `jasmine` + `@angular-devkit/build-angular` | Must migrate to Jest or Web Test Runner |
| **Plugins** | `karma-jasmine`, `karma-chrome-launcher`, `karma-jasmine-html-reporter`, `karma-coverage` | All Karma-specific — must be replaced |
| **Coverage** | `karma-coverage` with thresholds: statements 80%, branches 75%, functions 80%, lines 80% | Must configure Jest/WTR coverage equivalently |
| **Custom Launchers** | `ChromeHeadlessCI` (CI), `ChromeDebug` (debugging) | Jest runs in Node (no browser needed) |
| **Browser Config** | `browserDisconnectTimeout: 10000`, `browserDisconnectTolerance: 3`, `browserNoActivityTimeout: 60000` | Not needed with Jest |
| **Proxies** | `/api/` → `http://localhost:3000/api/` | Must configure in test setup |
| **Preprocessors** | `src/**/*.ts` → `['coverage']` | Jest handles natively |

#### Scenario 10: `10-webpack-custom-config-loss/karma.conf.js` (44 lines)

| Setting | Value |
|---|---|
| **Framework** | `jasmine` + `@angular-devkit/build-angular` |
| **Plugins** | Standard Karma plugin set |
| **Coverage** | `karma-coverage` (no thresholds) |
| **Browser** | Chrome |

### Test Count (Scenario 09)

| Spec File | Test Count | Category |
|---|---|---|
| `auth.guard.spec.ts` | 25 | Auth guard (session, roles, canActivate) |
| `transaction-list.component.spec.ts` | 29 | Component (rendering, filtering, search) |
| `payment-validation.service.spec.ts` | 22 | Service (payment validation logic) |
| `account-data.service.spec.ts` | 19 | Service (account CRUD operations) |
| **Total** | **95** | |

### Test Patterns Requiring Migration

| Pattern | Count | Jest Equivalent | Effort |
|---|---|---|---|
| `fakeAsync() + tick()` | ~40 uses | `jest.useFakeTimers()` + `jest.advanceTimersByTime()` | 5 min each |
| `waitForAsync()` | 1 use | `async/await` or `done()` callback | 5 min |
| `flush()` | ~5 uses | `jest.runAllTimers()` | 5 min each |
| `jasmine.createSpy()` | ~5 uses | `jest.fn()` | 5 min each |
| `TestBed.configureTestingModule()` | 4 setups | Same API (Angular testing utils) | No change |
| `fixture.detectChanges()` | ~10 uses | Same API | No change |

**Karma Timeline:**
- Angular 16: Karma deprecated
- Angular 17: CLI support for Karma removed
- **Must migrate before v17 upgrade**

---

## 3. FESM2015 Consumption

- **Search:** `rg -n "fesm2015|FESM2015" --type ts --type json`
- **Result:** 0 explicit references found
- **Note:** Angular packages no longer include FESM2015 from v16 (ECMAScript updated 2020→2022). Build system handles this transparently — no manual action required.

---

## 4. Custom Builders / Schematics / CLI Plugins

| Package | Version | Scenario | Angular 18 Compatible? |
|---|---|---|---|
| `@angular-builders/custom-webpack` | `^14.1.0` | 10 | ❌ — Must upgrade to match Angular version; custom webpack config lost with esbuild switch |
| No other custom builders detected | — | — | — |

---

## 5. Summary

| Category | Count | Risk Level | Effort |
|---|---|---|---|
| Custom Webpack config (will be lost) | 1 (5 features) | **CRITICAL** | 2–4 hours |
| Karma test configurations | 2 | **HIGH** | 1–2 days |
| Test specs requiring migration | 95 tests | **HIGH** | 1–2 days |
| FESM2015 consumption | 0 | N/A | — |
| Custom builders/schematics | 1 | **HIGH** | Included in webpack estimate |

**Total Estimated Effort:** 2–4 days (including test migration and build system replacement)
