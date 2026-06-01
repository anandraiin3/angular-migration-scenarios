# Version Inventory & Compatibility Pre-Check

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`
**Assessed By:** Devin (Phase 0 Pre-Migration Assessment)

---

## 1. Current Version Inventory

The repository contains **10 demonstration scenario applications**, each in its own subdirectory. Scenarios 01–06 and 08–10 target Angular 14; Scenario 07 targets Angular 20 (to demonstrate downstream breakage post-migration).

### Scenario 01–06, 08–10 (Angular 14 Applications)

| Dependency | Current Version | Notes |
|---|---|---|
| **Angular Core** (`@angular/core`) | `^14.2.0` | All `@angular/*` packages at 14.2.0 |
| **Angular Material** | `^14.2.0` | Scenario 08 only |
| **Angular CDK** | `^14.2.0` | Scenario 08 only |
| **RxJS** | `~7.5.0` | v7.5.x — three-argument subscribe still works |
| **TypeScript** | `~4.7.4` | Below v15 requirement of ≥4.8 |
| **Zone.js** | `~0.11.4` | Below v16 requirement of ≥0.13.x |
| **Build System** | `@angular-devkit/build-angular ^14.2.0` | Webpack-based (pre-esbuild) |
| **`@angular-builders/custom-webpack`** | `^14.1.0` | Scenario 10 only |
| **Node.js** | Not pinned | No `.nvmrc` or `engines` field; system Node is v22.12.0 |

### Scenario 07 (Angular 20 — Downstream Cascade Demo)

| Dependency | Current Version | Notes |
|---|---|---|
| **Angular Core** (`@angular/core`) | `^20.0.0` | Already migrated to demonstrate breakage |
| **RxJS** | `~7.8.0` | |
| **TypeScript** | `~5.7.0` | |
| **Zone.js** | `~0.15.0` | |
| **Build System** | `@angular-devkit/build-angular ^20.0.0` | esbuild-based |

### Shared Component Library (`@bank/shared-ui`)

| Field | Value |
|---|---|
| **Package Name** | `@bank/shared-ui` |
| **Version** | `2.4.0` |
| **Source Location** | `07-downstream-consumer-cascade/src/libs/shared-ui/` |
| **Peer Dependencies** | `@angular/common ^20.0.0`, `@angular/core ^20.0.0` |
| **Risk** | Peer deps locked to `^20.0.0` — incompatible with Angular 14 consumers |

---

## 2. Version Compatibility Pre-Check

### Upgrade Path Requirements (Angular Update Guide)

| Target Version | Node.js Required | TypeScript Required | Zone.js Required | Current Status |
|---|---|---|---|---|
| **v15** | 14.20.x / 16.13.x / 18.10.x | ≥4.8 | ≥0.12.x | ⚠️ TS 4.7.4 → needs bump to ≥4.8 |
| **v16** | v16+ / v18+ | ≥4.9.3 | ≥0.13.x | ⚠️ Zone.js 0.11.4 → needs bump to ≥0.13.x. **ngcc removed** |
| **v17** | ≥18.13.0 | ≥5.2 | ≥0.14.x | ⚠️ Major TS jump (4.7→5.2). Zone.js bump required |
| **v18** | ≥18.19.0 | ≥5.4 | ≥0.14.x | TS ≥5.4 required |

### Dependency Upgrade Path

```
TypeScript:  4.7.4 → 4.8 (v15) → 4.9.3 (v16) → 5.2 (v17) → 5.4 (v18)
Zone.js:     0.11.4 → 0.12.x (v15) → 0.13.x (v16) → 0.14.x (v17/v18)
RxJS:        7.5.0 → 7.5+ (no change required through v18, but deprecated patterns must be fixed)
Node.js:     v22.12.0 (system) — exceeds all requirements ✓
```

### Third-Party Dependency Flags

| Dependency | Risk | Notes |
|---|---|---|
| `@angular-builders/custom-webpack ^14.1.0` | **HIGH** | Scenario 10: must be upgraded per Angular version; esbuild replaces webpack in v17+. Custom webpack config will be lost. |
| `@angular/material ^14.2.0` | **HIGH** | Scenario 08: MDC migration in v15 changes DOM/CSS for all components |
| Karma test runner | **HIGH** | Scenarios 09, 10: Karma deprecated in v16, CLI support removed in v17 |
| No View Engine-only libraries detected | LOW | All deps appear Ivy-compatible |
| No proprietary analytics SDK detected | N/A | Not present in this demo repo |
| No financial data provider libraries detected | N/A | Not present in this demo repo |

### Shared Library Compatibility

- **`@bank/shared-ui` v2.4.0** declares `peerDependencies: { "@angular/core": "^20.0.0" }`
- This means the library **already requires Angular 20** and is **incompatible** with Angular 14 consumers
- Downstream consumer apps (Consumer Banking, Business Banking, Wealth Management) all import from `@bank/shared-ui`
- **BLOCKER:** The peer dependency range must be widened (e.g., `">=14 <21"`) or consumers must upgrade in lockstep

---

## 3. Summary

| Category | Count | Risk Level |
|---|---|---|
| TypeScript version gap (4.7→5.4) | 1 | HIGH |
| Zone.js version gap (0.11→0.14) | 1 | MEDIUM |
| Custom webpack config at risk | 1 | HIGH |
| Material MDC migration needed | 1 | HIGH |
| Karma removal needed | 2 scenarios | HIGH |
| Shared library peer dep mismatch | 1 | HIGH (BLOCKER) |
| View Engine-only deps | 0 | LOW |
