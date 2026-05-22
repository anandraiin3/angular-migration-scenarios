# Scenario 08: Angular Material API Breaking Changes

## Problem Statement

This scenario demonstrates breaking changes in Angular Material APIs that cause **silent runtime failures** rather than compilation errors. The application compiles successfully but renders incorrectly or loses functionality after upgrading from Material 14 to Material 15+.

### Specific Issues

1. **MatFormField `appearance="legacy"` Removed**
   - Material 15+ removes the `legacy` appearance option
   - Forms render with broken styling, causing customer-facing payment forms to appear unprofessional
   - No compilation error, only visual degradation

2. **MatTableDataSource Pattern Changed**
   - Old pattern: Direct array assignment to `dataSource` property
   - New pattern: Must use `MatTableDataSource` wrapper with proper initialization
   - Results in empty tables even though data is fetched successfully

3. **MatDialog API Return Type Changed**
   - `MatDialog.open()` return type changed from `MatDialogRef<any>` to more specific typing
   - `afterClosed()` observable behavior changed
   - Causes confirmation dialogs to fail silently

## Why It Matters

### Business Impact
- **P1 Customer-Facing Incident**: Payment forms render incorrectly, reducing user trust
- **Data Visibility Issue**: Transaction tables appear empty, blocking financial reconciliation workflows
- **UX Degradation**: Confirmation dialogs don't work properly, leading to accidental actions

### Technical Impact
- **Silent Failures**: Code compiles but doesn't work at runtime
- **Hard to Debug**: No error messages, requires visual inspection of every Material component
- **Systematic Problem**: Every Material component needs review, not just one-off fixes

## Migration Playbook Rule

**Rule: Material Migration Guide Applied Systematically with Visual Regression Tests**

When upgrading Angular Material versions:
1. Review the official Material migration guide for ALL breaking changes
2. Search codebase for every usage of changed APIs (MatFormField, MatTable, MatDialog, etc.)
3. Update each usage systematically, not just when issues are discovered
4. Add visual regression tests for critical UI components
5. Test in staging with real user workflows before production deployment

## Correct Approach

### 1. Identify All Material API Usage
```bash
# Search for deprecated appearance values
grep -r "appearance=\"legacy\"" src/

# Search for direct dataSource assignments
grep -r "dataSource\s*=" src/

# Search for MatDialog usage
grep -r "MatDialog" src/
```

### 2. Update Systematically

**MatFormField:**
```typescript
// Before (Material 14)
<mat-form-field appearance="legacy">

// After (Material 15+)
<mat-form-field appearance="fill"> <!-- or "outline" -->
```

**MatTableDataSource:**
```typescript
// Before (Material 14)
this.dataSource = transactions;

// After (Material 15+)
this.dataSource = new MatTableDataSource(transactions);
```

**MatDialog:**
```typescript
// Before (Material 14)
const dialogRef = this.dialog.open(ConfirmationDialogComponent);
dialogRef.afterClosed().subscribe(result => {
  if (result) { /* ... */ }
});

// After (Material 15+)
const dialogRef = this.dialog.open<ConfirmationDialogComponent, any, boolean>(
  ConfirmationDialogComponent
);
dialogRef.afterClosed().subscribe(result => {
  if (result === true) { /* ... */ }
});
```

### 3. Add Visual Regression Tests

```typescript
describe('FundTransferFormComponent', () => {
  it('should render form fields with proper styling', () => {
    fixture.detectChanges();
    const formField = fixture.nativeElement.querySelector('mat-form-field');
    expect(formField).toBeTruthy();
    expect(formField.classList.contains('mat-form-field-appearance-fill')).toBe(true);
  });
});
```

### 4. Test Critical User Workflows
- Payment form submission
- Transaction table data loading
- Confirmation dialog interactions

## Incorrect Approach

1. **Upgrading without reading migration guide**: Assuming backwards compatibility
2. **Fixing issues reactively**: Only updating components when users report bugs
3. **Ignoring visual changes**: Assuming "it compiles, so it works"
4. **No regression testing**: Deploying to production without visual validation

## Files in This Scenario

- `src/app/components/fund-transfer-form.component.ts` - Uses `appearance="legacy"` (removed in Material 15)
- `src/app/components/transaction-table.component.ts` - Uses old `MatTableDataSource` pattern
- `src/app/components/confirmation-dialog.component.ts` - Uses old `MatDialog` API
- `MIGRATION-ATTEMPT.md` - Documents the silent failures during upgrade
- `devin-session-prompt.txt` - Task description for automated Material API audit

## Testing This Scenario

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the application:**
   ```bash
   npm start
   ```

3. **Observe the issues:**
   - Payment form has broken/inconsistent styling
   - Transaction table is empty despite successful data fetch
   - Confirmation dialog doesn't work properly

4. **Upgrade to Material 15:**
   ```bash
   npm install @angular/material@15 @angular/cdk@15
   ```

5. **See the silent failures:**
   - No compilation errors
   - Application runs but features are broken
   - Requires manual testing to discover issues

## Key Takeaway

Material API breaking changes are particularly dangerous because they often result in **silent runtime failures** rather than compilation errors. A systematic approach using the official migration guide, comprehensive codebase search, and visual regression testing is essential to prevent customer-facing incidents.
