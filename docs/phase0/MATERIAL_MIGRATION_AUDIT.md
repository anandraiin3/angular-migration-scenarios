# Angular Material / CDK Migration Audit

**Assessment Date:** 2026-06-01
**Repository:** `anandraiin3/angular-migration-scenarios`

---

## 1. Current Material Version

| Package | Version | Scenario |
|---|---|---|
| `@angular/material` | `^14.2.0` | Scenario 08 only |
| `@angular/cdk` | `^14.2.0` | Scenario 08 only |

**Note:** Only Scenario 08 (`08-angular-material-api-change/`) uses Angular Material. Other scenarios do not include Material as a dependency.

---

## 2. v15 MDC Migration — **HIGH IMPACT**

Angular Material v15 refactored all components to use Material Design Components for Web (MDC). This changes DOM structure, CSS class names, and density styles.

### 2.1 `appearance="legacy"` Form Fields — **CRITICAL**

| File | Line | Context | Risk |
|---|---|---|---|
| `08-angular-material-api-change/src/app/components/fund-transfer-form.component.ts` | 29 | `<mat-form-field appearance="legacy">` (From Account) | **HIGH** |
| same | 42 | `<mat-form-field appearance="legacy">` (To Account) | **HIGH** |
| same | 55 | `<mat-form-field appearance="legacy">` (Amount) | **HIGH** |
| same | 76 | `<mat-form-field appearance="legacy">` (Transfer Date) | **HIGH** |
| same | 91 | `<mat-form-field appearance="legacy">` (Memo) | **HIGH** |

**Total:** 5 instances of `appearance="legacy"` — removed in Material v15+

**Impact:** After upgrade, forms render with broken/inconsistent styling. This is a customer-facing payment form — visual degradation on critical payment page creates P1 incident.

**Remediation:** Change to `appearance="fill"` or `appearance="outline"`. The `legacy` and `standard` appearances were removed. Estimated 5 min per instance × 5 = 25 min.

### 2.2 Custom CSS Targeting Material Class Names

| File | Line | Selector | Risk |
|---|---|---|---|
| `08-angular-material-api-change/src/app/components/fund-transfer-form.component.ts` | 136 | `mat-form-field { width: 100%; }` | MEDIUM |
| `08-angular-material-api-change/src/app/components/transaction-table.component.ts` | 155 | `.mat-cell.negative { color: red; }` | **HIGH** |
| `08-angular-material-api-change/src/app/components/confirmation-dialog.component.ts` | 54 | `mat-dialog-content { min-width: 400px; }` | MEDIUM |
| same | 68 | `mat-dialog-actions { padding: 1rem 0; }` | MEDIUM |

**Impact:** MDC migration changes internal CSS class names from `.mat-*` to `.mdc-*` prefixes. Custom CSS selectors targeting old classes will stop working.

**Remediation:** Update CSS selectors to use MDC class names or Angular Material's official theming API. Estimated 30 min per component × 3 components = 1.5 hours.

### 2.3 Component-Specific DOM Selectors in Tests

- **0 Material component test files found** — Scenario 08 does not include spec files targeting Material DOM structure
- **Risk:** N/A for this codebase, but production apps should audit all Material-related test selectors

### 2.4 MatDialog API Changes

| File | Line | Pattern | Risk |
|---|---|---|---|
| `08-angular-material-api-change/src/app/components/confirmation-dialog.component.ts` | 150 | `this.dialog.open(ConfirmationDialogComponent, { data: ... })` — no generic type params | **MEDIUM** |
| same | 162 | `dialogRef.afterClosed().subscribe(result => ...)` — result is `any` | **MEDIUM** |
| same | 81 | `this.dialogRef.close()` — no explicit value passed on cancel | **MEDIUM** |

**Impact:** Material v15+ expects typed dialog references: `MatDialog.open<ComponentType, DataType, ResultType>`. Without generics, `afterClosed()` returns `Observable<any>`, losing type safety. The cancel handler passes `undefined` (not `false`), which could cause incorrect truthiness checks.

**Remediation:** Add generic type parameters and explicit result values. Estimated 30 min.

### 2.5 MatTable / MatPaginator / MatSort

| File | Line | Pattern | Risk |
|---|---|---|---|
| `08-angular-material-api-change/src/app/components/transaction-table.component.ts` | 2 | Uses `MatTableDataSource` | LOW |
| same | 52 | `[dataSource]="dataSource"` with `matSort` | LOW |
| same | 117–120 | `<mat-paginator>` with `showFirstLastButtons` | LOW |

**Impact:** MatTable API is largely stable across versions. Minor density/spacing changes with MDC but no API breaks.

### 2.6 MatChip Usage

| File | Line | Pattern | Risk |
|---|---|---|---|
| `08-angular-material-api-change/src/app/components/transaction-table.component.ts` | 73, 99 | `<mat-chip [class]="...">` | **MEDIUM** |

**Impact:** MatChip underwent significant API changes in v15 MDC migration. The `<mat-chip>` element's DOM structure and CSS classes changed.

---

## 3. Legacy Component Imports

- **Search:** `rg -n "@angular/material/legacy" --type ts`
- **Result:** 0 instances found
- **Note:** The `@angular/material/legacy-*` namespace (available as bridge in v15) is not used. This means migration must update all components directly.

---

## 4. Custom Theme Mixins

- **Search:** `rg -n "mat-core|mat-button-theme|@include.*mat-" --type ts --type scss --type css`
- **Result:** 0 instances found
- **Note:** No custom SCSS theme files detected. Scenario 08 uses inline component styles only.

---

## 5. `ng generate @angular/material:mdc-migration` Applicability

The Angular team provides an automated migration schematic. Applicability assessment:

| Aspect | Assessment |
|---|---|
| `appearance="legacy"` → `appearance="fill"` | ✅ Schematic can handle this |
| Custom CSS class updates | ⚠️ Schematic may miss inline styles |
| MatDialog typing | ❌ Manual — requires adding generics |
| MatChip API changes | ⚠️ Partial — may need manual review |
| Visual regression testing | ❌ Must be done manually |

**Recommendation:** Run `ng generate @angular/material:mdc-migration` as first pass, then manually review all inline styles and dialog patterns.

---

## 6. Visual Regression Risk

Components with Material overrides requiring visual regression testing:

| Component | File | Risk | Notes |
|---|---|---|---|
| FundTransferForm | `fund-transfer-form.component.ts` | **HIGH** | Customer-facing payment form with 5 legacy form fields |
| TransactionTable | `transaction-table.component.ts` | **HIGH** | Financial data table with custom negative-amount styling |
| ConfirmationDialog | `confirmation-dialog.component.ts` | **MEDIUM** | Critical action confirmations (transfers, account deletion) |

---

## 7. Summary

| Category | Count | Risk Level |
|---|---|---|
| `appearance="legacy"` form fields | 5 | **HIGH** |
| Custom CSS targeting `.mat-*` classes | 4 | **HIGH** |
| MatDialog API changes (untyped) | 3 instances in 1 file | **MEDIUM** |
| MatChip MDC changes | 2 | **MEDIUM** |
| Legacy component imports | 0 | N/A |
| Custom theme mixins | 0 | N/A |
| Components needing visual regression | 3 | **HIGH** |

**Estimated Total Remediation:** 3–4 hours
- Form field appearance changes: 25 min
- CSS selector updates: 1.5 hours
- Dialog typing: 30 min
- MatChip review: 30 min
- Visual regression testing: 1 hour
