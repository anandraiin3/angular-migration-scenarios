# Scenario 07 — Downstream Consumer Cascade

## The Problem

This monorepo contains a shared component library (`shared-ui`) that exports an `AccountCardComponent` used by three consuming applications: Consumer Banking, Business Banking, and Wealth Management. The `AccountCardComponent` accepts an `AccountCardData` interface with specific properties including `accountType: 'checking' | 'savings'` and `lastTransaction: Date`. During Angular 20 migration, a developer "improves" the interface by adding two new account types (`'money-market' | 'investment'`) and makes `lastTransaction` optional (since not all account types have recent transactions). This is a breaking API change. Without running downstream consumer tests BEFORE opening the PR, the migration passes all tests in the `shared-ui` library but breaks builds in all three consuming applications simultaneously. On Monday morning, 14 teams across three divisions discover their CI builds are failing with TypeScript errors.

## Why This Matters for a Bank

This scenario represents the Chief Architect's primary concern about large-scale migrations: blast radius control. When a shared component library serves multiple applications, an uncoordinated API change creates a cascading failure that blocks all dependent teams. In a bank with hundreds of engineers across multiple divisions, this translates to: 12 engineers immediately blocked (cannot merge PRs), 47 engineers blocked within 4 hours (their PRs depend on others), CI/CD pipeline jammed with 83 failing builds, and an emergency war room to coordinate the fix. The financial impact: 12 engineering days lost to diagnosis and remediation at $2,000/day loaded cost = $24,000. The organizational impact: loss of confidence in the migration process, teams reverting to forking shared components instead of using the library (undermining the entire shared component strategy).

## What the Playbook Rule Says

**Playbook Rule 11.2 — Downstream Consumer Testing (BLOCKING CI Gate):**

> Before ANY pull request modifying a shared library can be approved:
> 1. Identify all consuming applications via dependency graph analysis
> 2. Build ALL downstream consumers in CI using the PR branch of the shared library
> 3. Run ALL downstream consumer tests (unit + integration)
> 4. If ANY downstream build or test fails, the PR is BLOCKED from merge
> 5. If the change is intentionally breaking:
>    - Increment major version of shared library (semantic versioning)
>    - Create migration guide document
>    - Coordinate with consuming teams on migration timeline
>    - Create compatibility shim if necessary for gradual migration
>
> **CI Configuration:**
> ```yaml
> downstream-consumer-tests:
>   runs-on: ubuntu-latest
>   steps:
>     - name: Build shared library from PR branch
>       run: cd libs/shared-ui && npm run build
>     - name: Test consumer-banking app
>       run: cd apps/consumer-banking && npm install && npm run build && npm test
>     - name: Test business-banking app
>       run: cd apps/business-banking && npm install && npm run build && npm test
>     - name: Test wealth-management app
>       run: cd apps/wealth-management && npm install && npm run build && npm test
> ```
>
> **Gate:** PR cannot merge if downstream-consumer-tests job fails.

## The Correct Migration Approach

### Step 1: Pre-Migration Dependency Analysis (Devin)

Before making ANY changes to shared components:

```bash
# Scan package.json files to find all consumers of shared-ui library
grep -r "\"@bank/shared-ui\":" apps/*/package.json
```

Output:
```
apps/consumer-banking/package.json:    "@bank/shared-ui": "^2.4.0",
apps/business-banking/package.json:    "@bank/shared-ui": "^2.4.0",
apps/wealth-management/package.json:   "@bank/shared-ui": "^2.3.0",
```

Document:
```markdown
SHARED LIBRARY DEPENDENCY MAP

Library: @bank/shared-ui
Current version: 2.4.0
Consuming applications: 3

1. Consumer Banking App (apps/consumer-banking)
   - Version: ^2.4.0
   - Team: Retail Banking Engineering (12 engineers)
   - Components used: AccountCardComponent, TransactionListComponent, QuickTransferComponent
   - Monthly active users: 14.2M

2. Business Banking App (apps/business-banking)
   - Version: ^2.4.0
   - Team: Commercial Banking Engineering (8 engineers)
   - Components used: AccountCardComponent, PaymentHistoryComponent
   - Monthly active users: 2.8M

3. Wealth Management App (apps/wealth-management)
   - Version: ^2.3.0 (ONE VERSION BEHIND)
   - Team: Wealth Management Engineering (6 engineers)
   - Components used: AccountCardComponent, PortfolioSummaryComponent
   - Monthly active users: 890K

RISK ASSESSMENT:
⚠️ HIGH RISK: Any breaking change to AccountCardComponent affects ALL three apps.
⚠️ VERSION SKEW: Wealth Management is one minor version behind — any change
   to AccountCardComponent must be compatible with 2.3.0 OR we must coordinate
   their upgrade first.
```

### Step 2: Determine If Change Is Breaking

Developer wants to make this change to `AccountCardData` interface:

```typescript
// CURRENT (v2.4.0)
export interface AccountCardData {
  accountNumber: string;
  balance: number;
  accountType: 'checking' | 'savings';  // Only 2 types
  lastTransaction: Date;                // Required
}

// PROPOSED (v3.0.0 — would be a MAJOR version bump)
export interface AccountCardData {
  accountNumber: string;
  balance: number;
  accountType: 'checking' | 'savings' | 'money-market' | 'investment';  // Added 2 types
  lastTransaction?: Date;  // Made optional (BREAKING)
}
```

**Is this breaking?**
- ✅ YES: Making `lastTransaction` optional is breaking because consuming code assumes it's always present:
  ```typescript
  // In consumer-banking app
  displayLastTransaction(account: AccountCardData) {
    // This will error with "possibly undefined" in strict TypeScript
    return account.lastTransaction.toLocaleDateString();
  }
  ```
- ✅ YES: Adding union types to `accountType` is technically non-breaking for consumers (they can ignore the new types), BUT any consumer code with exhaustive type checks will break:
  ```typescript
  getAccountIcon(type: AccountCardData['accountType']): string {
    switch(type) {
      case 'checking': return 'check';
      case 'savings': return 'piggy-bank';
      // TypeScript now errors: not all cases covered ('money-market' and 'investment' missing)
    }
  }
  ```

**Decision:** This is a BREAKING change requiring major version bump (2.4.0 → 3.0.0).

### Step 3: Options for Handling Breaking Change

**Option A: Coordinate simultaneous migration (Playbook-recommended for small consumer count)**

1. Create migration PR for shared library (v3.0.0)
2. Create migration PRs for ALL three consuming apps simultaneously
3. All four PRs reviewed together, merged together
4. Atomic deployment: library + all consumers deploy at once

**Timeline:** 2 weeks (coordination overhead, 3 teams involved)

**Option B: Compatibility shim for gradual migration**

1. Keep old interface, add new interface:
   ```typescript
   // v2.5.0 — NON-BREAKING
   export interface AccountCardData {
     accountNumber: string;
     balance: number;
     accountType: 'checking' | 'savings';
     lastTransaction: Date;
   }

   export interface AccountCardDataV2 {
     accountNumber: string;
     balance: number;
     accountType: 'checking' | 'savings' | 'money-market' | 'investment';
     lastTransaction?: Date;
   }

   @Component({...})
   export class AccountCardComponent {
     @Input() account: AccountCardData | AccountCardDataV2;
     // Component handles both interfaces internally
   }
   ```

2. Consuming apps migrate at their own pace
3. After all consumers migrated, deprecate old interface in v3.0.0

**Timeline:** 4-6 weeks (allows independent team timelines)

### Step 4: CI Configuration (BEFORE opening PR)

Add to `.github/workflows/ci.yml`:

```yaml
name: Shared Library CI

on:
  pull_request:
    paths:
      - 'libs/shared-ui/**'

jobs:
  build-library:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Build shared library
        run: cd libs/shared-ui && npm run build
      - name: Run library tests
        run: cd libs/shared-ui && npm test
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: shared-ui-dist
          path: libs/shared-ui/dist

  test-downstream-consumers:
    runs-on: ubuntu-latest
    needs: build-library
    strategy:
      matrix:
        app: [consumer-banking, business-banking, wealth-management]
    steps:
      - uses: actions/checkout@v3
      - name: Download shared library build
        uses: actions/download-artifact@v3
        with:
          name: shared-ui-dist
          path: libs/shared-ui/dist
      - name: Install app dependencies
        run: cd apps/${{ matrix.app }} && npm ci
      - name: Link local shared library
        run: cd apps/${{ matrix.app }} && npm link ../../libs/shared-ui
      - name: Build consumer app
        run: cd apps/${{ matrix.app }} && npm run build
      - name: Run consumer tests
        run: cd apps/${{ matrix.app }} && npm test

  block-on-consumer-failures:
    runs-on: ubuntu-latest
    needs: test-downstream-consumers
    if: failure()
    steps:
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ **DOWNSTREAM CONSUMER TESTS FAILED**\n\nThis PR introduces breaking changes that cause build or test failures in consuming applications. Please review the CI logs above to see which apps are affected.\n\n**Required actions:**\n1. Review TypeScript errors in downstream apps\n2. Choose migration strategy: simultaneous migration OR compatibility shim\n3. Coordinate with affected teams\n4. Update PR with non-breaking changes OR increment to major version with migration guide'
            })
```

### Step 5: Implementation with Blast Radius = 0

Developer opens PR with breaking change.

**CI runs:**
- ✅ Build shared library: SUCCESS
- ✅ Library tests: SUCCESS
- ❌ Consumer Banking build: **FAILED** (TypeScript error: lastTransaction possibly undefined)
- ❌ Business Banking build: **FAILED** (TypeScript error: accountType exhaustive check incomplete)
- ❌ Wealth Management build: **FAILED** (same errors)

**PR status:** ❌ BLOCKED

**Developer sees:**
```
CI Job: test-downstream-consumers (consumer-banking) — FAILED
Error: apps/consumer-banking/src/app/dashboard/account-card-display.component.ts:47:12
  Property 'lastTransaction' is possibly undefined.
    return account.lastTransaction.toLocaleDateString();
                   ~~~~~~~~~~~~~~~
```

**Developer has three options:**
1. Revert the breaking change
2. Implement compatibility shim (non-breaking)
3. Coordinate simultaneous migration with all three teams

**Result:** Breaking change never reaches main branch. Blast radius = 0.

---

## What Breaks Without This Approach

### Naive Migration (No Downstream Testing)

Developer opens PR changing `AccountCardData` interface.

**CI runs:**
- ✅ Build shared library: SUCCESS
- ✅ Library tests: SUCCESS (they only test the component in isolation)

**Code review:** Approved (reviewers see tests passing, assume it's safe)

**PR merges:** Monday 9:00 AM

**Shared library v2.5.0 published:** Monday 9:15 AM

### Cascading Failure Timeline

**Monday 9:30 AM** — Consumer Banking team's CI build fails
```
Error: Cannot read property 'toLocaleDateString' of undefined
  at AccountCardDisplayComponent.displayLastTransaction
```

**Monday 9:35 AM** — Business Banking team's CI build fails
```
Error: Not all cases covered in switch statement for accountType
  Expected: 'checking' | 'savings'
  Received: 'checking' | 'savings' | 'money-market' | 'investment'
```

**Monday 9:42 AM** — Wealth Management team's CI build fails (same errors)

**Monday 9:45 AM** — 12 engineers blocked from merging PRs

**Monday 10:00 AM** — War room assembled:
- Shared library team: "We added new account types for the migration"
- Consumer teams: "You broke our builds!"
- Engineering manager: "How did this get through code review?"

**Monday 10:30 AM** — Decision: Emergency fix required

**Monday 11:00 AM - 3:00 PM** — Three teams scrambling to update their code simultaneously:
- Consumer Banking: 4 engineers × 4 hours = 16 hours
- Business Banking: 3 engineers × 4 hours = 12 hours
- Wealth Management: 2 engineers × 4 hours = 8 hours
- **Total:** 36 engineering hours blocked

**Monday 3:30 PM** — All fixes merged, CI green again

**Impact:**
- **Engineering time lost:** 36 hours = $9,000
- **PRs blocked during outage:** 14 PRs across all teams
- **Deploy pipeline jammed:** 83 failed builds clogging CI queue
- **Team morale:** Significant damage

---

## ROI Calculation for VP Engineering

### Cost Per Incident (Undetected Breaking Change)

| Cost Component | Calculation | Amount |
|----------------|-------------|--------|
| Diagnosis time | 3 teams × 1 hour × 3 engineers = 9 hours | $2,250 |
| Fix implementation | 3 teams × 4 hours × 3 engineers = 36 hours | $9,000 |
| Code review + merge | 3 teams × 1 hour × 2 engineers = 6 hours | $1,500 |
| War room overhead | 8 people × 0.5 hours = 4 hours | $1,000 |
| CI/CD resource waste | 83 failed builds × 15 min = 21 CPU-hours | $420 |
| **Total per incident** | | **$14,170** |

### Shared Library Migration Scope

- **Number of shared components in library:** 47
- **Components with public interface changes in Angular 20 migration:** 12 (26%)
- **Expected breaking changes without governance:** 8-10 (17-21% of total)
- **Total incident cost without governance:** 9 incidents × $14,170 = **$127,530**

### Cost of Implementing Downstream Testing

| Item | Time | Cost |
|------|------|------|
| CI pipeline configuration | 4 hours | $1,000 |
| Dependency graph analysis tool | 2 hours | $500 |
| Documentation for developers | 2 hours | $500 |
| **Total one-time investment** | 8 hours | **$2,000** |

### Ongoing Cost Per PR

- CI job runtime: 12 additional minutes per PR (3 apps × 4 min each)
- CI cost: ~$0.15 per PR
- Developer waiting time: included in normal PR review cycle (no added delay)

### ROI

**Investment:** $2,000 (one-time)  
**Cost avoidance:** $127,530 (during migration) + ongoing incident prevention  
**ROI:** 6,276% return on investment  
**Payback period:** First prevented incident (saves $14,170)  

---

## Key Message for Chief Architect

This scenario demonstrates why architectural governance at the CI level is non-negotiable:

1. **Blast radius control:** One breaking change affects 3 teams = 36 engineering hours lost
2. **Shared component strategy:** If developers can't trust shared components (because they break builds), they'll fork them, undermining the entire reuse strategy
3. **Migration confidence:** VP Engineering needs evidence that the migration won't create a Monday morning war room

**The playbook solution:** Downstream consumer tests as a BLOCKING CI gate. Breaking changes are detected in CI, not in production. Blast radius = 0.

**Cost avoidance for this single pattern:** $125,530 over the course of the migration

This is why the Chief Architect should care about Devin + Playbook: Not because it makes migration faster, but because it makes migration *safe at scale*.
