# Shared Component Library & Downstream Consumer Matrix

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. Shared Library Identification

| Field | Value |
|---|---|
| **Package Name** | `@bank/shared-ui` |
| **Version** | `2.4.0` |
| **Source Location** | `07-downstream-consumer-cascade/src/libs/shared-ui/` |
| **Build Script** | `tsc -p tsconfig.lib.json` |
| **Publish Config** | `access: "restricted"` (private registry) |

---

## 2. Public API Exports

**File:** `07-downstream-consumer-cascade/src/libs/shared-ui/public-api.ts`

| Export | Type | File |
|---|---|---|
| `AccountCardComponent` | Standalone Component | `src/lib/account-card/account-card.component.ts` |
| `AccountCardData` | Interface | `src/lib/account-card/account-card-data.interface.ts` |

### `AccountCardData` Interface (Public API)

```typescript
interface AccountCardData {
  accountNumber: string;           // Required
  balance: number;                 // Required
  accountType: 'checking' | 'savings';  // Required, union type
  lastTransaction: Date;           // Required
  holderName?: string;             // Optional
}
```

### `AccountCardComponent` (Public API)

- **Selector:** `bank-account-card`
- **Standalone:** Yes (`standalone: true`)
- **Input:** `@Input({ required: true }) account!: AccountCardData`
- **Methods:** `formatAccountType()`, `formatAccountNumber()`, `formatCurrency()`, `formatDate()`

---

## 3. Peer Dependency Analysis — **BLOCKER**

**Current peer dependencies** (`package.json`):
```json
{
  "@angular/common": "^20.0.0",
  "@angular/core": "^20.0.0"
}
```

**Problem:** The library's peer dependencies are locked to `^20.0.0`, meaning:
- ❌ Angular 14 consumers CANNOT install this library
- ❌ Angular 15–19 consumers CANNOT install this library
- ✅ Only Angular 20+ consumers are supported

**Required Action:** Widen peer dependency range to support transition period:
```json
{
  "@angular/common": ">=14.0.0 <21.0.0",
  "@angular/core": ">=14.0.0 <21.0.0"
}
```

Or, if dual-version support is not feasible, consumers must upgrade in lockstep.

---

## 4. Breaking Interface/Type Changes

### 4.1 `accountType` Union Expansion Risk

**Current union:** `'checking' | 'savings'`

If the library adds new account types (e.g., `'money-market' | 'investment'`), downstream consumers using exhaustive switch statements will **fail to compile**.

**Affected consumers:**
- `BusinessAccountOverviewComponent` (lines 121–132, 140–148, 156–162) — 3 exhaustive switch statements on `AccountCardData['accountType']`
- **Risk:** **HIGH** — TypeScript will error: "Not all code paths return a value"

### 4.2 `lastTransaction` Required → Optional Risk

**Current:** `lastTransaction: Date` (required)

If the library makes `lastTransaction` optional (`lastTransaction?: Date`), all consumers accessing it without null checks will break.

**Affected consumers:**

| Consumer | File | Line | Pattern | Risk |
|---|---|---|---|---|
| Consumer Banking | `account-card-display.component.ts` | 114 | `account.lastTransaction.toLocaleDateString(...)` | **HIGH** — TypeError if undefined |
| Consumer Banking | same | 138 | `new Date(account.lastTransaction)` | **HIGH** |
| Business Banking | `business-account-overview.component.ts` | — | Indirect via `AccountCardComponent` | MEDIUM |
| Wealth Management | `client-accounts.component.ts` | 159 | `new Date(account.lastTransaction)` | **HIGH** |
| Wealth Management | same | 178 | `this.getDaysSinceLastTransaction(account)` | **HIGH** |

### 4.3 `QueryList.filter` Type Narrowing (v16)

- **Search:** `rg -n "QueryList" --type ts`
- **Result:** 0 instances in shared library or consumers
- **Risk:** N/A

### 4.4 Stricter `ngTemplateOutletContext` Typing (v16)

- **Search:** `rg -n "ngTemplateOutletContext" --type ts`
- **Result:** 0 instances found
- **Risk:** N/A

### 4.5 Material MDC DOM/CSS Changes

- The shared library (`@bank/shared-ui`) does **not** use Angular Material directly
- However, consumers may layer Material styles over the library's components
- **Risk:** LOW for the library itself; consumers must audit their own Material usage

---

## 5. Downstream Consumer Teams

| Consumer App | Package | Team | Team Size | MAU | Criticality | Current Library Version |
|---|---|---|---|---|---|---|
| **Consumer Banking** (`@bank/consumer-banking`) | `07-downstream-consumer-cascade/src/apps/consumer-banking/` | Retail Banking Engineering | 12 engineers | 14.2M | **HIGH** | Uses `@bank/shared-ui` (latest) |
| **Business Banking** (`@bank/business-banking`) | `07-downstream-consumer-cascade/src/apps/business-banking/` | Commercial Banking Engineering | 8 engineers | 2.8M | **HIGH** | Uses `@bank/shared-ui` (latest) |
| **Wealth Management** (`@bank/wealth-management`) | `07-downstream-consumer-cascade/src/apps/wealth-management/` | Wealth Management Engineering | 6 engineers | 890K | **MEDIUM** | Uses `@bank/shared-ui` v2.3.0 (one version behind) |

**Total downstream impact:** 26 engineers across 3 teams, 17.9M monthly active users

---

## 6. Angular Version Support Strategy

### Option A: Dual-Version Support (Recommended)

Library supports both Angular 14 and 18 simultaneously during transition:

| Pros | Cons |
|---|---|
| Teams upgrade independently | Library must maintain dual compatibility |
| No big-bang migration | More testing burden |
| Lower risk per team | Wider peer dependency range |

**Implementation:**
1. Widen peer deps to `">=14.0.0 <19.0.0"`
2. Avoid APIs only available in Angular 18+
3. Use `ViewContainerRef` patterns compatible with both versions
4. Test library against both Angular 14 and 18 in CI

**Estimated effort:** 3–5 days

### Option B: Lockstep Upgrade

All consumers upgrade together:

| Pros | Cons |
|---|---|
| Single migration effort | Requires coordination across 3 teams |
| No dual-version maintenance | Higher risk — any failure blocks all |
| Cleaner dependency tree | Scheduling 26 engineers simultaneously |

### Recommendation

**Option A (dual-version support)** is recommended given:
- 3 teams with different release cadences
- Wealth Management is already 1 version behind
- 17.9M MAU — cannot risk simultaneous disruption

---

## 7. Upgrade Sequencing

| Step | Action | Dependency |
|---|---|---|
| 1 | Widen `@bank/shared-ui` peer deps to `">=14 <19"` | None |
| 2 | Upgrade `@bank/shared-ui` internal build to Angular 18 | Step 1 |
| 3 | Verify library works with Angular 14 consumers (backward compat) | Step 2 |
| 4 | Consumer Banking upgrades to Angular 18 | Step 3 |
| 5 | Business Banking upgrades to Angular 18 | Step 3 |
| 6 | Wealth Management upgrades to Angular 18 (and catches up to v2.4.0) | Step 3 |
| 7 | Remove Angular 14 backward compatibility from library | Steps 4–6 complete |

**Critical Path:** The shared library MUST be upgraded first (or at least made compatible). Consumer teams cannot begin their Angular 18 upgrades until the library supports it.

---

## 8. CI Pipeline Impact

- No CI pipeline configurations found in this demo repository
- **Recommendation:** Each consumer team's CI must be updated to:
  1. Test against the upgraded `@bank/shared-ui`
  2. Run visual regression tests for Material/CSS changes
  3. Validate TypeScript strict-mode compatibility

---

## 9. Summary

| Category | Finding | Risk |
|---|---|---|
| Peer dependency locked to `^20.0.0` | **BLOCKER** — consumers on Angular 14 cannot use library | **CRITICAL** |
| `accountType` union expansion risk | 3 exhaustive switches in Business Banking will break | **HIGH** |
| `lastTransaction` optionality risk | 5+ direct property accesses will throw TypeError | **HIGH** |
| Downstream teams affected | 3 teams, 26 engineers, 17.9M MAU | **HIGH** |
| Wealth Management version lag | On v2.3.0, one version behind | **MEDIUM** |
| Library must upgrade first | Shared library is on critical path | **CRITICAL** |

**Coordination Required:**
- Retail Banking Engineering team (12 engineers) — HIGH priority
- Commercial Banking Engineering team (8 engineers) — HIGH priority
- Wealth Management Engineering team (6 engineers) — MEDIUM priority
- All teams need advance notice of interface changes and migration timeline
