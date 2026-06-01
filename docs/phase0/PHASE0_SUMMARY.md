# Phase 0 Pre-Migration Assessment Summary

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`
**Migration Path:** Angular 14.2.0 → 18.x
**Assessment Type:** Zero-code-change audit

---

## Executive Summary

This assessment covers 10 Angular 14 demonstration applications showcasing specific migration failure patterns. The codebase reveals **multiple critical risks** that must be addressed before migration can begin. The highest-risk items are:

1. **Auth interceptor chain** — silent drop during standalone migration causes all API calls to lose authentication
2. **Shared library peer dependency lock** — `@bank/shared-ui` requires `^20.0.0`, blocking Angular 14 consumers
3. **Custom webpack configuration** — 5 build-time features (including corporate CA cert injection) will be lost when esbuild replaces webpack in v17+
4. **Hardcoded credentials** — 25+ locations with embedded API keys, JWT tokens, and database passwords
5. **DomSanitizer XSS window** — `bypassSecurityTrustHtml()` on merchant-controlled data becomes exploitable without CSP

**Overall Risk Level:** HIGH

---

## Findings Count by Category

| Document | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|
| Version Inventory | 4 | 1 | 1 | 6 |
| Service Scoping | 1 | 0 | 1 | 2 |
| Dependency Architecture | 3 | 1 | 0 | 4 |
| RxJS Deprecation | 1 | 0 | 0 | 1 |
| TypeScript Strict | 1 | 1 | 0 | 2 |
| Auth-Critical Files | 8 | 3 | 1 | 12 |
| Breaking Changes (v14→v18) | 1 | 2 | 3 | 6 |
| Material Migration | 3 | 3 | 0 | 6 |
| Build Tooling | 3 | 0 | 0 | 3 |
| Downstream Consumers | 4 | 1 | 0 | 5 |
| **Total** | **29** | **12** | **6** | **47** |

---

## Findings by Version Boundary

| Version Jump | Findings | Key Patterns |
|---|---|---|
| **v14 → v15** | 3 | Class-based interceptors (must bridge/convert), @keyframes CSS |
| **v15 → v16** | 1 | Router.createUrlTree mock in tests |
| **v16 → v17** | 0 | No breaking patterns detected |
| **v17 → v18** | 2 | Guard UrlTree redirect behavior, ngModel usage |

---

## Risk Heat Map

| Risk Level | Count | Categories |
|---|---|---|
| 🔴 **CRITICAL** | 6 | Auth interceptor silent drop, singleton fracture, XSS window, hardcoded credentials, shared library peer deps, CA cert injection loss |
| 🟠 **HIGH** | 23 | Karma removal, TypeScript strict errors, Material MDC migration, webpack config loss, downstream team coordination |
| 🟡 **MEDIUM** | 12 | Router mocks in tests, untyped dialog refs, build variable injection, analytics PII handling |
| 🟢 **LOW** | 6 | CSS keyframes, FESM2015, redundant providers |

---

## Estimated Remediation Effort by Version Jump

| Version Jump | Effort | Schematic-Fixable? | Key Tasks |
|---|---|---|---|
| **Pre-migration** | **3–5 days** | N/A | Fix singleton scoping, remove hardcoded creds, add CSP, strict-mode type fixes |
| **v14 → v15** | **3–4 days** | Partial (`ng update` handles some) | Material MDC migration (2–4 hrs), interceptor chain redesign (2–4 hrs), functional guard conversion (30 min) |
| **v15 → v16** | **1–2 days** | Yes (most via `ng update`) | Verify View Engine compatibility, update test mocks |
| **v16 → v17** | **2–3 days** | Partial | Karma → Jest migration (1–2 days), webpack → esbuild (2–4 hrs) |
| **v17 → v18** | **1 day** | Yes (most via `ng update`) | Guard redirect behavior, final cleanup |
| **Shared Library** | **3–5 days** | No | Dual-version support, peer dep widening, downstream coordination |
| **Total** | **~14–20 days** | | |

---

## Critical Blockers

These must be resolved **before** migration begins:

| # | Blocker | Severity | Document |
|---|---|---|---|
| 1 | `@bank/shared-ui` peer deps locked to `^20.0.0` — consumers on Angular 14 blocked | **CRITICAL** | DOWNSTREAM_CONSUMER_MATRIX.md |
| 2 | Hardcoded credentials in 25+ locations (Scenario 06) — security review required before any code changes | **CRITICAL** | AUTH_CRITICAL_FILES_INVENTORY.md |
| 3 | `bypassSecurityTrustHtml()` on merchant-controlled data without CSP | **CRITICAL** | AUTH_CRITICAL_FILES_INVENTORY.md |
| 4 | Custom webpack DefinePlugin for CA cert injection — no esbuild equivalent configured | **CRITICAL** | BUILD_TOOLING_AUDIT.md |

---

## Recommended Migration Sequence

### Phase 1: Pre-Migration Fixes (Week 1–2)

1. Widen `@bank/shared-ui` peer dependencies to `">=14.0.0 <19.0.0"`
2. Fix `AuthService` singleton scoping (Scenario 01) — move to `providedIn: 'root'`
3. Fix RxJS three-argument subscribe pattern (Scenario 02)
4. Add TypeScript type annotations (Scenario 03) — address ~56 strict-mode errors
5. Move hardcoded credentials to vault/environment (Scenario 06)
6. Implement Content Security Policy (Scenario 05)
7. Design esbuild replacement for custom webpack features (Scenario 10)

### Phase 2: v14 → v15 (Week 3–4)

1. Run `ng update @angular/core@15 @angular/cli@15`
2. Run `ng update @angular/material@15` (Scenario 08)
3. Run `ng generate @angular/material:mdc-migration` for MDC migration
4. Convert `appearance="legacy"` → `appearance="fill"` or `"outline"`
5. Update CSS selectors from `.mat-*` to MDC equivalents
6. Plan interceptor migration strategy (bridge with `withInterceptorsFromDi()` or convert to functional)

### Phase 3: v15 → v16 (Week 5)

1. Run `ng update @angular/core@16 @angular/cli@16`
2. Verify no View Engine-only deps remain (ngcc removed)
3. Update Router test mocks if needed
4. `ng update` schematics handle most changes automatically

### Phase 4: v16 → v17 (Week 6–7)

1. Migrate Karma → Jest (95 tests across 4 spec files)
2. Replace custom webpack with esbuild-compatible alternatives
3. Run `ng update @angular/core@17 @angular/cli@17`
4. Convert class-based guards to functional guards

### Phase 5: v17 → v18 (Week 8)

1. Run `ng update @angular/core@18 @angular/cli@18`
2. Review guard UrlTree redirect behavior
3. Final TypeScript strict-mode validation
4. Visual regression testing for all Material components

### Phase 6: Downstream Rollout (Week 9–10)

1. Consumer Banking team upgrades (14.2M MAU)
2. Business Banking team upgrades (2.8M MAU)
3. Wealth Management team upgrades (890K MAU)
4. Remove Angular 14 backward compatibility from `@bank/shared-ui`

---

## `ng update` Schematics Availability

| Version Jump | Schematic Available? | Auto-Fixed Patterns |
|---|---|---|
| v14 → v15 | ✅ Yes | Some Material migrations, deprecated API updates |
| v15 → v16 | ✅ Yes | Import relocations, deprecated API removal |
| v16 → v17 | ✅ Yes | Zone.js imports, some Router changes |
| v17 → v18 | ✅ Yes | `async` → `waitForAsync`, minor API updates |
| Material MDC | ✅ `ng generate @angular/material:mdc-migration` | Form field, component class name updates |

**Manual remediation required for:** Interceptor chain redesign, Karma→Jest, custom webpack→esbuild, DomSanitizer XSS fixes, credential vault migration.

---

## Node.js / TypeScript Upgrade Path

```
Current:     Node v22.12.0 (system) / TypeScript 4.7.4
v15 target:  Node 14.20+ / 16.13+ / 18.10+  /  TS ≥4.8
v16 target:  Node 16+ / 18+                   /  TS ≥4.9.3
v17 target:  Node ≥18.13.0                    /  TS ≥5.2
v18 target:  Node ≥18.19.0                    /  TS ≥5.4
```

Node.js v22.12.0 exceeds all requirements — no Node upgrade needed.
TypeScript must be upgraded at each version boundary (managed by `ng update`).

---

## Downstream Coordination Plan

| Action | Responsible | Timeline |
|---|---|---|
| Widen `@bank/shared-ui` peer deps | Library team | Before migration begins |
| Notify Consumer Banking team (12 eng) | User (requestor) | 2 weeks before Phase 6 |
| Notify Business Banking team (8 eng) | User (requestor) | 2 weeks before Phase 6 |
| Notify Wealth Management team (6 eng) | User (requestor) | 2 weeks before Phase 6 |
| Shared library dual-version CI | Library team | During Phase 2 |
| Consumer visual regression testing | Each consumer team | During their upgrade |

---

## Go/No-Go Recommendation

### ✅ CONDITIONAL GO

The migration **can proceed** with the following conditions:

1. **MUST FIRST:** Resolve the 4 critical blockers listed above (shared library peer deps, hardcoded credentials, XSS/CSP, CA cert injection)
2. **MUST FIRST:** Allocate security team for auth interceptor migration review
3. **MUST FIRST:** Establish Karma → Jest migration plan with test coverage preservation
4. **Timeline:** 8–10 weeks for the main application, plus 2 weeks for downstream rollout
5. **Estimated Total Effort:** 14–20 developer-days across the 10 scenarios

**Risk to Compliance Deadline:** If the deadline is >12 weeks out, the migration is achievable. If <8 weeks, the timeline is tight and the auth interceptor chain + Karma migration are on the critical path.

### Top 3 Items Requiring Immediate Attention

1. **Auth Interceptor Chain (Scenario 04):** Highest single-item risk. Silent failure means all API calls lose authentication. Requires security team review. Plan functional interceptor conversion or `withInterceptorsFromDi()` bridge.

2. **Shared Library Peer Dependencies (Scenario 07):** Blocking all 3 downstream teams (26 engineers, 17.9M MAU). Widen peer deps immediately to unblock parallel work.

3. **Custom Webpack → esbuild (Scenario 10):** Corporate CA cert injection is business-critical. Without it, all internal HTTPS API calls fail. Must design esbuild alternative before v17 upgrade.
