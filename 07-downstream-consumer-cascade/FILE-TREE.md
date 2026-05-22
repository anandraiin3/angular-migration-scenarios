# Complete File Tree - Scenario 07

```
07-downstream-consumer-cascade/
│
├── 📄 README.md                                    [15KB] Complete scenario documentation
├── 📄 MIGRATION-ATTEMPT.md                         [18KB] Detailed failure walkthrough with TypeScript errors
├── 📄 STRUCTURE.md                                 [13KB] Architecture overview and component analysis
├── 📄 QUICK-START.md                               [8KB]  5-minute quick reference guide
├── 📄 FILE-TREE.md                                 [This file] Visual directory structure
├── 📄 devin-session-prompt.txt                     [5KB]  Task instructions for Devin
│
├── 📦 package.json                                 [Root workspace configuration]
├── 📦 tsconfig.json                                [Root TypeScript configuration]
├── 📦 .gitignore                                   [Git ignore patterns]
│
├── .github/
│   └── workflows/
│       └── 📄 shared-library-ci-example.yml        [6KB] CI workflow for downstream testing
│
└── src/
    │
    ├── libs/
    │   └── shared-ui/                              [@bank/shared-ui v2.4.0]
    │       ├── 📦 package.json                     [Shared UI library config]
    │       ├── 📦 tsconfig.lib.json                [Library TypeScript config]
    │       ├── 📄 public-api.ts                    [Public exports - component + interface]
    │       └── src/
    │           └── lib/
    │               └── account-card/
    │                   ├── 📄 account-card-data.interface.ts    [THE INTERFACE THAT CHANGES]
    │                   │                                         [Breaking: lastTransaction: Date → lastTransaction?: Date]
    │                   │                                         [Breaking: accountType: 2 types → 4 types]
    │                   └── 📄 account-card.component.ts         [Component using interface]
    │
    └── apps/
        │
        ├── consumer-banking/                       [@bank/consumer-banking]
        │   │                                       [Team: 12 engineers | Users: 14.2M]
        │   ├── 📦 package.json                     [Depends on @bank/shared-ui ^2.4.0]
        │   └── src/
        │       └── app/
        │           └── dashboard/
        │               └── 📄 account-card-display.component.ts
        │                       [BREAKS: Line 47 - account.lastTransaction.toLocaleDateString()]
        │                       [Assumes lastTransaction is always defined]
        │                       [Error: "Object is possibly 'undefined'"]
        │
        ├── business-banking/                       [@bank/business-banking]
        │   │                                       [Team: 8 engineers | Users: 2.8M]
        │   ├── 📦 package.json                     [Depends on @bank/shared-ui ^2.4.0]
        │   └── src/
        │       └── app/
        │           └── account-management/
        │               └── 📄 business-account-overview.component.ts
        │                       [BREAKS: Lines 67-72 - Exhaustive switch on accountType]
        │                       [Intentional pattern for compile-time safety]
        │                       [Error: "Function lacks ending return statement"]
        │
        └── wealth-management/                      [@bank/wealth-management]
            │                                       [Team: 6 engineers | Users: 890K]
            ├── 📦 package.json                     [Depends on @bank/shared-ui ^2.3.0 ⚠️ VERSION SKEW]
            └── src/
                └── app/
                    └── portfolio/
                        └── 📄 client-accounts.component.ts
                                [BREAKS: Line 78 - new Date(account.lastTransaction)]
                                [BREAKS: Line 126 - getDaysSinceLastTransaction()]
                                [Multiple methods assume lastTransaction is defined]
                                [Error: "Object is possibly 'undefined'"]
```

## File Purposes

### Documentation Files
| File | Purpose | Key Content |
|------|---------|-------------|
| **README.md** | Main scenario documentation | Problem, playbook rule 11.2, correct approach, ROI |
| **MIGRATION-ATTEMPT.md** | Detailed failure analysis | Breaking changes, cascading failures, TypeScript errors, timeline |
| **STRUCTURE.md** | Architecture overview | Component analysis, breaking patterns, testing strategies |
| **QUICK-START.md** | 5-minute overview | Quick walkthrough, key takeaways, local testing |
| **FILE-TREE.md** | This file | Visual structure and file purposes |
| **devin-session-prompt.txt** | Devin task instructions | Task to build testing infrastructure |

### Configuration Files
| File | Purpose |
|------|---------|
| **package.json** (root) | Workspace configuration, npm workspaces setup |
| **tsconfig.json** (root) | Root TypeScript configuration, path mapping |
| **package.json** (libs/shared-ui) | Shared library package config, v2.4.0 |
| **package.json** (apps/*) | Consumer app dependencies, @bank/shared-ui versions |
| **tsconfig.lib.json** | Library-specific TypeScript build config |
| **.gitignore** | Git ignore patterns for node_modules, dist, etc. |

### Source Code Files
| File | Lines | Purpose | Breaking Point |
|------|-------|---------|----------------|
| **account-card-data.interface.ts** | 35 | Interface definition | The interface that will change |
| **account-card.component.ts** | 136 | Shared component | Uses AccountCardData interface |
| **public-api.ts** | 17 | Public exports | Exports component + interface |
| **account-card-display.component.ts** | 115 | Consumer Banking | Line 47: Assumes lastTransaction defined |
| **business-account-overview.component.ts** | 141 | Business Banking | Lines 67-72: Exhaustive switch pattern |
| **client-accounts.component.ts** | 154 | Wealth Management | Lines 78, 126: Multiple lastTransaction uses |

### CI/CD Files
| File | Purpose |
|------|---------|
| **shared-library-ci-example.yml** | Example GitHub Actions workflow for downstream testing |

## Key Metrics

### Shared Library
- **Name:** @bank/shared-ui
- **Current Version:** 2.4.0
- **Components:** 1 (AccountCardComponent)
- **Public Interfaces:** 1 (AccountCardData)
- **Consumers:** 3 applications

### Consumer Applications

#### Consumer Banking
- **Package:** @bank/consumer-banking v3.12.0
- **Dependency:** @bank/shared-ui ^2.4.0
- **Team:** 12 engineers
- **Users:** 14.2M monthly active
- **Breaking Methods:** 2 (displayLastTransaction, getDaysSinceLastTransaction)

#### Business Banking
- **Package:** @bank/business-banking v2.8.0
- **Dependency:** @bank/shared-ui ^2.4.0
- **Team:** 8 engineers
- **Users:** 2.8M monthly active
- **Breaking Methods:** 3 (getAccountIcon, getAccountTypeLabel, getAccountDescription)

#### Wealth Management
- **Package:** @bank/wealth-management v1.15.0
- **Dependency:** @bank/shared-ui ^2.3.0 ⚠️ ONE VERSION BEHIND
- **Team:** 6 engineers
- **Users:** 890K monthly active
- **Breaking Methods:** 4 (formatLastActivity, isRecentActivity, getAccountStatus, getDaysSinceLastTransaction)

## Breaking Changes Summary

### Change #1: Make lastTransaction Optional
```typescript
// BEFORE (v2.4.0)
lastTransaction: Date;  // Required

// AFTER (v3.0.0)
lastTransaction?: Date;  // Optional
```

**Impact:** Breaks Consumer Banking (2 methods), Wealth Management (4 methods)

**TypeScript Error:** `Property 'lastTransaction' is possibly 'undefined'`

**Affected Lines:**
- Consumer Banking: Lines 47, 62
- Wealth Management: Lines 78, 103, 117, 126

---

### Change #2: Expand accountType Union
```typescript
// BEFORE (v2.4.0)
accountType: 'checking' | 'savings';  // 2 types

// AFTER (v3.0.0)
accountType: 'checking' | 'savings' | 'money-market' | 'investment';  // 4 types
```

**Impact:** Breaks Business Banking (3 switch statements)

**TypeScript Error:** `Function lacks ending return statement and return type does not include 'undefined'`

**Affected Lines:**
- Business Banking: Lines 67-72, 80-85, 93-98

## File Size Summary

| Category | File Count | Total Size |
|----------|------------|------------|
| **Documentation** | 6 files | ~59KB |
| **Configuration** | 8 files | ~5KB |
| **Source Code** | 6 files | ~11KB |
| **CI/CD** | 1 file | ~6KB |
| **Total** | 21 files | ~81KB |

## Navigation Paths

### For Quick Understanding
1. QUICK-START.md → README.md (sections 1-2) → MIGRATION-ATTEMPT.md (breaking changes section)
2. **Time:** 20 minutes
3. **Outcome:** Understand problem, impact, and solution

### For Implementation
1. README.md (full) → STRUCTURE.md → .github/workflows/shared-library-ci-example.yml → devin-session-prompt.txt
2. **Time:** 45 minutes
3. **Outcome:** Ready to implement downstream testing

### For Code Review
1. src/libs/shared-ui/src/lib/account-card/account-card-data.interface.ts (the interface)
2. src/apps/*/src/app/*/*.component.ts (the three breaking consumers)
3. **Time:** 15 minutes
4. **Outcome:** Understand exact breaking points in code

## Critical Lines to Review

### The Interface (Will Change)
**File:** `src/libs/shared-ui/src/lib/account-card/account-card-data.interface.ts`
- **Line 23:** `lastTransaction: Date;` → Will change to `lastTransaction?: Date;`
- **Line 19:** `accountType: 'checking' | 'savings';` → Will expand to include 'money-market' | 'investment'

### Consumer Breaking Points
**Consumer Banking:** `account-card-display.component.ts`
- **Line 47:** `return account.lastTransaction.toLocaleDateString(...);` → Will error

**Business Banking:** `business-account-overview.component.ts`
- **Lines 67-72:** `switch(type) { case 'checking': ... case 'savings': ... }` → Will error (incomplete)

**Wealth Management:** `client-accounts.component.ts`
- **Line 78:** `const date = new Date(account.lastTransaction);` → Will error
- **Line 126:** `const last = new Date(account.lastTransaction);` → Will error

## Testing the Scenario

### Manual Test (Local)
```bash
cd 07-downstream-consumer-cascade
npm install
cd src/libs/shared-ui && npm run build
npm link
cd ../../apps/consumer-banking && npm link @bank/shared-ui && npm run build  # Should succeed
```

### Simulate Breaking Change
```bash
# Edit src/libs/shared-ui/src/lib/account-card/account-card-data.interface.ts
# Change: lastTransaction: Date; → lastTransaction?: Date;
cd src/libs/shared-ui && npm run build
cd ../../apps/consumer-banking && npm run build  # Should fail
```

### CI Test (GitHub Actions)
```bash
# Push to branch that modifies src/libs/shared-ui/**
# CI workflow automatically runs downstream consumer tests
# PR blocked if any consumer fails
```

## Success Indicators

After implementing this scenario, you should have:

1. ✅ Complete monorepo structure with 1 library + 3 consumers
2. ✅ Working interface that will demonstrably break consumers if changed
3. ✅ Three different breaking patterns (direct access, exhaustive checks, implicit dependencies)
4. ✅ Detailed documentation showing exact TypeScript errors
5. ✅ Example CI workflow that catches breaking changes
6. ✅ Clear ROI calculation ($2K investment, $127K saved)
7. ✅ Task instructions for Devin to implement complete testing infrastructure

## Related Documentation

- **Playbook Rule:** 11.2 — Downstream Consumer Testing
- **Related Scenarios:** 03 (standalone migration), 05 (hidden API breakage), 11 (test isolation)
- **CI/CD Patterns:** Blast radius control, coordinated migrations, semantic versioning

---

**This file tree represents a complete, working demonstration of why downstream consumer testing is critical for monorepo migrations.**
