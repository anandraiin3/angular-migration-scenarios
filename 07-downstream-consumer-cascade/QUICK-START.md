# Quick Start Guide - Scenario 07

## What This Scenario Demonstrates

A shared UI library (`@bank/shared-ui`) is consumed by three applications. A developer makes "improvements" to an interface during Angular 20 migration, which breaks all consumers simultaneously.

**Without downstream testing:** Monday morning war room, 26 engineers blocked, $11,354 cost  
**With downstream testing:** Breaking change caught in PR, blast radius = 0

## File Walkthrough (5-Minute Overview)

### Start Here
1. **README.md** (15 min) - Read sections:
   - "The Problem"
   - "Why This Matters for a Bank"
   - "The Correct Migration Approach" → Step 4: CI Configuration

### The Breaking Change
2. **src/libs/shared-ui/src/lib/account-card/account-card-data.interface.ts** (2 min)
   - Current interface with `lastTransaction: Date` (required)
   - Would break if changed to `lastTransaction?: Date` (optional)

3. **src/apps/consumer-banking/src/app/dashboard/account-card-display.component.ts** (3 min)
   - Line 47: `account.lastTransaction.toLocaleDateString()`
   - Assumes lastTransaction is always defined
   - Will error if it becomes optional

4. **src/apps/business-banking/src/app/account-management/business-account-overview.component.ts** (3 min)
   - Lines 67-72: Exhaustive switch on accountType
   - Will error if new types added to union
   - Intentional compile-time safety pattern

### The Solution
5. **.github/workflows/shared-library-ci-example.yml** (5 min)
   - CI workflow that builds library from PR
   - Tests all downstream consumers
   - Blocks PR if any consumer breaks
   - Posts detailed feedback

### The Failure Analysis
6. **MIGRATION-ATTEMPT.md** (10 min) - Read sections:
   - "The Breaking Change"
   - "Cascading Build Failures"
   - "Total Impact Summary"

## Key Takeaways

### The Problem
```typescript
// Developer changes this in shared library:
interface AccountCardData {
  lastTransaction: Date;  // Required
}

// To this:
interface AccountCardData {
  lastTransaction?: Date;  // Optional - BREAKING
}

// Consumer code breaks:
account.lastTransaction.toLocaleDateString();
// Error: Object is possibly 'undefined'
```

### The Impact
- **Consumer Banking:** 12 engineers blocked, 4 PRs failed
- **Business Banking:** 8 engineers blocked, 3 PRs failed
- **Wealth Management:** 6 engineers blocked, 2 PRs failed
- **Total:** 26 engineers, 39 hours lost, $11,354 cost

### The Solution
CI workflow that:
1. Builds shared library from PR branch
2. Links PR version into ALL consuming apps
3. Builds and tests ALL consumers
4. Blocks PR if ANY consumer fails
5. Forces coordination before merge

**Result:** Blast radius = 0

## Test the Scenario Locally

### Prerequisites
```bash
node --version  # Should be >= 20.0.0
npm --version   # Should be >= 10.0.0
```

### Install Dependencies
```bash
cd /path/to/07-downstream-consumer-cascade
npm install
```

### Build Shared Library
```bash
cd src/libs/shared-ui
npm run build
```

### Link Library to Consumers (Manual Test)
```bash
# In shared-ui directory
npm link

# In each consumer app
cd ../../apps/consumer-banking
npm link @bank/shared-ui

cd ../business-banking
npm link @bank/shared-ui

cd ../wealth-management
npm link @bank/shared-ui
```

### Build Consumers
```bash
# Should succeed with current v2.4.0 interface
cd src/apps/consumer-banking && npm run build
cd ../business-banking && npm run build
cd ../wealth-management && npm run build
```

### Simulate Breaking Change
1. Edit `src/libs/shared-ui/src/lib/account-card/account-card-data.interface.ts`
2. Change line 23: `lastTransaction: Date;` → `lastTransaction?: Date;`
3. Rebuild shared library: `cd src/libs/shared-ui && npm run build`
4. Try building consumers again → **Should fail with TypeScript errors**

This demonstrates what the CI workflow catches automatically.

## For Devin: Task Instructions

See `devin-session-prompt.txt` for complete task to build:
1. Dependency graph analysis
2. Breaking change detection tools
3. Complete CI workflow implementation
4. Local testing scripts
5. Migration guide templates
6. Testing strategy documentation

**Estimated Time:** 4-6 hours  
**Priority:** HIGH (blocking Angular 20 migration)

## Cost/Benefit

| Metric | Without Testing | With Testing |
|--------|----------------|--------------|
| **Setup Cost** | $0 | $2,000 (one-time) |
| **Cost per incident** | $11,354 | $0 |
| **Expected incidents** | 9 | 0 |
| **Total migration cost** | $127,530 | $2,000 |
| **ROI** | - | 6,276% |
| **Blast radius** | All consumers fail | 0 |

## Architecture Patterns

### Pattern 1: Direct Property Access
```typescript
// Breaks when required field becomes optional
account.lastTransaction.toLocaleDateString();
```

### Pattern 2: Exhaustive Type Checking
```typescript
// Breaks when union type expands
switch(accountType) {
  case 'checking': return '✓';
  case 'savings': return '💰';
  // No default - compile-time exhaustiveness check
}
```

### Pattern 3: Implicit Dependencies
```typescript
// Breaks when interface shape changes
new Date(account.lastTransaction);
```

## Related Scenarios

- **Scenario 03:** Standalone migration breaking module-scoped providers
- **Scenario 05:** Hidden API breakage (private/public mixing)
- **Scenario 11:** Test isolation failure in hybrid states

**Common theme:** Changes that pass tests in isolation but break in integration

## Questions & Discussion

### Q: Can't we just fix the consumers after merging?
**A:** Yes, but that creates a 6-hour window where 26 engineers are blocked and CI is broken. Downstream testing catches it in PR before any damage.

### Q: Isn't this overkill for small changes?
**A:** CI runs automatically. Zero developer effort. Catches 1 real issue and pays for itself immediately.

### Q: What if we need breaking changes?
**A:** Downstream testing doesn't prevent breaking changes - it forces coordination:
- Option A: Revert change
- Option B: Compatibility shim (gradual migration)
- Option C: Simultaneous migration (library + all consumers merge together)

### Q: How long does CI take?
**A:** ~12 minutes (library build + 3 consumers in parallel). Already in normal PR review cycle.

## Success Metrics

After implementing downstream testing, track:
1. **Incidents prevented:** Breaking changes caught in PR
2. **False positives:** PRs blocked unnecessarily (should be ~0)
3. **Time saved:** Engineering hours not spent on emergency fixes
4. **Team confidence:** Developers trust shared libraries
5. **Reuse rate:** More teams using shared components (not forking)

## Next Steps

1. **Understand the problem:** Read README.md and MIGRATION-ATTEMPT.md
2. **See the code:** Review the three breaking consumer components
3. **Review the solution:** Study the CI workflow
4. **Implement for your repo:** Use devin-session-prompt.txt
5. **Track metrics:** Measure incidents prevented

## Contact

- **Scenario owner:** Chief Architect
- **Implementation questions:** VP Engineering
- **CI/CD questions:** DevOps Team
- **Devin task questions:** See devin-session-prompt.txt

---

**Time to value:** 30 minutes to understand, 4-6 hours to implement, immediate ROI

**This is the Chief Architect's top concern:** Preventing cascading failures during large-scale migrations.
