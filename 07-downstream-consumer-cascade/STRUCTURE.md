# Scenario 07 — Downstream Consumer Cascade: Complete Structure

## Overview

This scenario demonstrates a complete monorepo with a shared UI library consumed by three applications, showing how interface changes create cascading build failures without proper downstream testing.

## Directory Structure

```
07-downstream-consumer-cascade/
├── README.md                           # Complete scenario documentation
├── MIGRATION-ATTEMPT.md                # Detailed walkthrough of what breaks
├── STRUCTURE.md                        # This file
├── devin-session-prompt.txt            # Task instructions for Devin
├── package.json                        # Root workspace configuration
├── tsconfig.json                       # Root TypeScript configuration
├── .gitignore                          # Git ignore patterns
│
├── .github/
│   └── workflows/
│       └── shared-library-ci-example.yml  # Example CI workflow for downstream testing
│
├── src/
│   ├── libs/
│   │   └── shared-ui/                  # Shared UI component library
│   │       ├── package.json            # @bank/shared-ui v2.4.0
│   │       ├── public-api.ts           # Public exports
│   │       ├── tsconfig.lib.json       # Library TypeScript config
│   │       └── src/
│   │           └── lib/
│   │               └── account-card/
│   │                   ├── account-card-data.interface.ts  # THE INTERFACE THAT CHANGES
│   │                   └── account-card.component.ts       # Component using interface
│   │
│   └── apps/
│       ├── consumer-banking/           # Consumer Banking App
│       │   ├── package.json            # Uses @bank/shared-ui ^2.4.0
│       │   └── src/
│       │       └── app/
│       │           └── dashboard/
│       │               └── account-card-display.component.ts  # BREAKS: assumes lastTransaction always defined
│       │
│       ├── business-banking/           # Business Banking App
│       │   ├── package.json            # Uses @bank/shared-ui ^2.4.0
│       │   └── src/
│       │       └── app/
│       │           └── account-management/
│       │               └── business-account-overview.component.ts  # BREAKS: exhaustive switch on accountType
│       │
│       └── wealth-management/          # Wealth Management App
│           ├── package.json            # Uses @bank/shared-ui ^2.3.0 (ONE VERSION BEHIND)
│           └── src/
│               └── app/
│                   └── portfolio/
│                       └── client-accounts.component.ts  # BREAKS: assumes lastTransaction always defined
```

## Key Components

### 1. Shared Library (@bank/shared-ui)

**Location:** `src/libs/shared-ui/`

**Current Version:** 2.4.0

**Key Files:**
- `src/lib/account-card/account-card-data.interface.ts` - The interface that will be modified
- `src/lib/account-card/account-card.component.ts` - Component that consumes the interface
- `public-api.ts` - Public API exports

**Interface (Current - v2.4.0):**
```typescript
export interface AccountCardData {
  accountNumber: string;
  balance: number;
  accountType: 'checking' | 'savings';  // Only 2 types
  lastTransaction: Date;                // Required field
  holderName?: string;
}
```

**Proposed Breaking Change (v3.0.0):**
```typescript
export interface AccountCardData {
  accountNumber: string;
  balance: number;
  accountType: 'checking' | 'savings' | 'money-market' | 'investment';  // 4 types
  lastTransaction?: Date;  // Made optional - BREAKING
  holderName?: string;
}
```

---

### 2. Consumer Banking App

**Location:** `src/apps/consumer-banking/`

**Team:** Retail Banking Engineering (12 engineers)  
**Users:** 14.2M monthly active users  
**Criticality:** HIGH

**Dependencies:**
```json
{
  "@bank/shared-ui": "^2.4.0"
}
```

**Breaking Point:** `src/app/dashboard/account-card-display.component.ts`

Line 47:
```typescript
displayLastTransaction(account: AccountCardData): string {
  // ERROR if lastTransaction becomes optional:
  // Property 'lastTransaction' is possibly 'undefined'
  return account.lastTransaction.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

**Impact:** 4 PRs blocked, 12 engineers affected

---

### 3. Business Banking App

**Location:** `src/apps/business-banking/`

**Team:** Commercial Banking Engineering (8 engineers)  
**Users:** 2.8M monthly active users  
**Criticality:** HIGH

**Dependencies:**
```json
{
  "@bank/shared-ui": "^2.4.0"
}
```

**Breaking Point:** `src/app/account-management/business-account-overview.component.ts`

Lines 67-72:
```typescript
getAccountIcon(type: AccountCardData['accountType']): string {
  switch (type) {
    case 'checking':
      return '✓';
    case 'savings':
      return '💰';
    // ERROR if new types added:
    // Function lacks ending return statement and return type does not include 'undefined'
  }
}
```

This uses **exhaustive type checking** - an intentional TypeScript pattern to ensure all union members are handled. When new types are added to the union, the compiler correctly identifies incomplete coverage.

**Impact:** 3 PRs blocked, 8 engineers affected

---

### 4. Wealth Management App

**Location:** `src/apps/wealth-management/`

**Team:** Wealth Management Engineering (6 engineers)  
**Users:** 890K monthly active users  
**Criticality:** MEDIUM

**Dependencies:**
```json
{
  "@bank/shared-ui": "^2.3.0"  // ONE VERSION BEHIND
}
```

**Breaking Point:** `src/app/portfolio/client-accounts.component.ts`

Line 78:
```typescript
formatLastActivity(account: AccountCardData): string {
  // ERROR if lastTransaction becomes optional:
  // Property 'lastTransaction' is possibly 'undefined'
  const date = new Date(account.lastTransaction);
  // ... rest of logic
}
```

**Additional Complexity:** This team is one version behind (v2.3.0 vs v2.4.0), requiring version upgrade coordination.

**Impact:** 2 PRs blocked, 6 engineers affected

---

## The Breaking Changes

### Breaking Change #1: Making lastTransaction Optional

**Before:**
```typescript
lastTransaction: Date;  // Required
```

**After:**
```typescript
lastTransaction?: Date;  // Optional
```

**Why It Breaks:**
- Consumer Banking: Directly calls `.toLocaleDateString()` on lastTransaction without null check
- Wealth Management: Creates `new Date(account.lastTransaction)` without null check
- TypeScript strict mode: "Property 'lastTransaction' is possibly 'undefined'"

**Affected Apps:** Consumer Banking, Wealth Management

---

### Breaking Change #2: Adding Union Types

**Before:**
```typescript
accountType: 'checking' | 'savings';  // 2 options
```

**After:**
```typescript
accountType: 'checking' | 'savings' | 'money-market' | 'investment';  // 4 options
```

**Why It Breaks:**
- Business Banking uses exhaustive type checking (switch without default)
- TypeScript ensures all union members are handled
- New types = incomplete switch coverage
- Error: "Function lacks ending return statement"

**Affected Apps:** Business Banking

---

## Cascading Failure Timeline (Without Downstream Testing)

| Time | Event | Impact |
|------|-------|--------|
| Mon 9:00 AM | Developer merges PR changing AccountCardData | Shared library v2.5.0 published |
| Mon 9:15 AM | CI picks up new version | All apps start using v2.5.0 |
| Mon 9:30 AM | Consumer Banking build fails | 4 PRs blocked, 12 engineers affected |
| Mon 9:35 AM | Business Banking build fails | 3 PRs blocked, 8 engineers affected |
| Mon 9:42 AM | Wealth Management build fails | 2 PRs blocked, 6 engineers affected |
| Mon 9:45 AM | War room assembled | 26 engineers total affected |
| Mon 10:00 AM | Diagnosis begins | All teams investigating simultaneously |
| Mon 11:00 AM | Emergency fix starts | 3 teams scrambling |
| Mon 3:30 PM | All fixes merged | 39 engineering hours lost |

**Total Cost:** $11,354 (engineering time + CI waste + emergency overhead)

---

## The Solution: Downstream Consumer Testing

### CI Workflow

**File:** `.github/workflows/shared-library-ci-example.yml`

**How It Works:**

1. **Build Shared Library** (from PR branch)
   - Compile @bank/shared-ui with proposed changes
   - Run library unit tests
   - Upload build artifacts

2. **Test Each Consumer** (in parallel)
   - Download shared library build
   - Link local version (not published version)
   - Build consumer app
   - Run consumer tests
   - Report failures with team/user impact

3. **Gate PR Merge**
   - If ANY consumer fails, block PR
   - Post detailed comment with:
     - Which apps failed
     - Team impact
     - Required actions
     - Migration options

4. **Result: Blast Radius = 0**
   - Breaking changes detected in PR
   - Never reach production
   - No engineers blocked
   - Coordinated migration if necessary

---

## Key Files for Review

### Understanding the Problem
1. **README.md** - Complete scenario context and playbook rule
2. **MIGRATION-ATTEMPT.md** - Detailed walkthrough of cascading failures
3. **STRUCTURE.md** - This file (architecture overview)

### The Breaking Code
4. **src/libs/shared-ui/src/lib/account-card/account-card-data.interface.ts** - Interface that changes
5. **src/apps/consumer-banking/src/app/dashboard/account-card-display.component.ts** - Breaks on optional field
6. **src/apps/business-banking/src/app/account-management/business-account-overview.component.ts** - Breaks on union expansion
7. **src/apps/wealth-management/src/app/portfolio/client-accounts.component.ts** - Breaks on optional field

### The Solution
8. **.github/workflows/shared-library-ci-example.yml** - CI workflow implementing downstream testing
9. **devin-session-prompt.txt** - Task for implementing complete testing infrastructure

---

## Testing Patterns Demonstrated

### 1. Direct Property Access (Consumer Banking, Wealth Management)

```typescript
// Code assumes property is always present
account.lastTransaction.toLocaleDateString();

// Breaks when property becomes optional
// Error: Object is possibly 'undefined'
```

### 2. Exhaustive Type Checking (Business Banking)

```typescript
// Intentional pattern for compile-time safety
function getIcon(type: AccountCardData['accountType']): string {
  switch (type) {
    case 'checking': return '✓';
    case 'savings': return '💰';
    // No default - TypeScript ensures exhaustive coverage
  }
}

// Breaks when union expands
// Error: Function lacks ending return statement
```

### 3. Implicit Dependencies (All Apps)

```typescript
// Code implicitly depends on interface shape
const days = Math.floor(
  (now.getTime() - new Date(account.lastTransaction).getTime()) / (1000 * 60 * 60 * 24)
);

// Breaks when interface changes
```

---

## Lessons for Migration Teams

### 1. Interface Changes Are Breaking
- Required → Optional: **BREAKING**
- Adding union types: **POTENTIALLY BREAKING** (exhaustive checks)
- Removing fields: **BREAKING**
- Changing types: **BREAKING**

### 2. Trust Is Built Through Safety
If developers cannot trust shared libraries (because they break builds), they will:
- Fork components instead of using library
- Avoid updates
- Duplicate code
- Undermine entire shared component strategy

### 3. Blast Radius Control
Without downstream testing:
- One change = all consumers break simultaneously
- No coordination possible
- Emergency war rooms
- Lost engineering time

With downstream testing:
- Breaking changes caught in PR
- Forced coordination before merge
- Compatibility shims possible
- Blast radius = 0

### 4. Semantic Versioning Matters
This should have been v2.4.0 → v3.0.0 (major bump):
- Breaking changes require major version
- Migration guide needed
- Consumer coordination required
- Gradual rollout possible

---

## ROI Calculation

### Cost to Implement Downstream Testing
- CI workflow configuration: 4 hours = $1,000
- Dependency analysis tools: 2 hours = $500
- Documentation: 2 hours = $500
- **Total:** 8 hours = $2,000

### Cost Avoided Per Incident
- Engineering time lost: 39 hours = $9,750
- War room overhead: 4 hours = $1,000
- CI/CD waste: 21 CPU-hours = $420
- Emergency deployment: $500
- **Total:** $11,354

### Expected Incidents Without Governance
- Components with interface changes: 12
- Expected breaking changes: 8-10
- Total cost: 9 × $11,354 = $127,530

### ROI
- Investment: $2,000
- Cost avoided: $127,530
- **ROI: 6,276%**
- **Payback: First prevented incident**

---

## Next Steps for Devin

See `devin-session-prompt.txt` for detailed task instructions:

1. Analyze dependency graph
2. Document breaking change patterns
3. Create complete CI workflow
4. Build local testing scripts
5. Write migration guide template
6. Document testing strategy

This provides the infrastructure to prevent downstream consumer cascades during the Angular 20 migration.

---

## Questions?

- See README.md for full playbook context
- See MIGRATION-ATTEMPT.md for detailed failure analysis
- See .github/workflows/shared-library-ci-example.yml for CI implementation
- Contact: Chief Architect or VP Engineering
