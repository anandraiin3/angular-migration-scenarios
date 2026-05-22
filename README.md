
# angular-migration-scenarios
=======
# Angular 14 → 20 Migration Demo Scenarios

**Purpose:** Demonstrate the categories of problems that arise when migrating from Angular 14 to Angular 20 without a governed approach, and how Devin + playbook prevents each one.

**Audience:** Bank of America Engineering Leadership (VP Engineering, Security Engineer, Chief Architect)

---

## Scenarios Overview

1. **[NgModule vs Standalone Component Architecture Conflict](./01-ngmodule-standalone-conflict/)** — Shared service singletons break when converting to standalone components
2. **[RxJS Behavioral Break](./02-rxjs-behavioral-break/)** — Error handling silently stops working after RxJS 7→8 migration
3. **[TypeScript Strict Mode Regression](./03-typescript-strict-regression/)** — 47+ compilation errors appear when TypeScript 5 strict mode is enabled
4. **[Auth Interceptor Breakage](./04-auth-interceptor-breakage/)** — SSO token injection fails silently in standalone component mode
5. **[DomSanitizer XSS Window](./05-domsanitizer-xss-window/)** — bypassSecurityTrustHtml exposes XSS vectors under changed CSP handling
6. **[Hardcoded Credentials](./06-hardcoded-credentials/)** — API keys and service tokens embedded in code become visible during AI-assisted migration
7. **[Downstream Consumer Cascade](./07-downstream-consumer-cascade/)** — Shared component library API change breaks 3 consuming apps simultaneously
8. **[Angular Material API Change](./08-angular-material-api-change/)** — Legacy form appearance and dialog APIs break styling and functionality
9. **[Karma Test Runner Removal](./09-karma-test-runner-removal/)** — Entire test suite using Karma-specific patterns fails to compile
10. **[Webpack Custom Configuration Loss](./10-webpack-custom-config-loss/)** — Corporate CA certificates and build-time secrets silently fail to inject

---

## Demo Script (5-minute walkthrough)

**Order of presentation:**

### 1. Start with Scenario 07 — Downstream Consumer Cascade (1 min)
- **Why first:** Most visually dramatic — shows 3 apps breaking simultaneously
- **Show:** The monorepo structure, the interface change, the cascading build failures
- **Audience:** VP Engineering
- **Key message:** "This is why we migrate component-by-component with downstream tests running before every PR"

### 2. Scenario 04 — Auth Interceptor Breakage (1 min)
- **Show:** The interceptor registration pattern, how it compiles but doesn't run in standalone mode
- **Audience:** Security Engineer
- **Key message:** "Unauthenticated API calls in a consumer banking app is not a functionality bug — it's a critical security incident"

### 3. Scenario 05 — DomSanitizer XSS Window (1 min)
- **Show:** The bypassSecurityTrustHtml pattern, the XSS proof-of-concept when CSP is misconfigured
- **Audience:** Security Engineer
- **Key message:** "XSS in a consumer banking app with 59M users is a regulatory incident"

### 4. Scenario 02 — RxJS Silent Break (1 min)
- **Show:** The three-argument subscribe pattern, how it compiles after migration but silently swallows errors
- **Audience:** VP Engineering
- **Key message:** "Tests pass, build succeeds, but live payment errors are invisible to customers"

### 5. Scenario 10 — Webpack Custom Config Loss (1 min)
- **Show:** The custom webpack config, how ESBuild silently ignores it without errors
- **Audience:** Chief Architect
- **Key message:** "A build that succeeds but silently fails to inject security certificates is worse than a build that fails"

---

## The Devin Difference

| Scenario | Without Devin | With Devin + Playbook |
|----------|---------------|----------------------|
| **01: NgModule conflict** | Discovered in PR review after 2 weeks of migration work | Flagged in architecture inventory before first line of code |
| **02: RxJS silent break** | Discovered in production when payment errors stop showing | Caught by mandatory RxJS audit required by playbook |
| **03: TypeScript strict** | 47 compilation errors appear after upgrade, blocking deployment | Pre-migration TypeScript audit quantifies errors, creates remediation plan |
| **04: Auth interceptor** | Unauthenticated API calls reach production, P0 incident | Playbook requires security team review before auth-critical file changes |
| **05: DomSanitizer XSS** | XSS vulnerability discovered in security audit 3 months post-migration | Automated scan flags all `bypassSecurity*` patterns for manual review |
| **06: Hardcoded credentials** | API keys visible in git history, permanent exposure | Pre-migration secrets scan blocks migration start until remediated |
| **07: Downstream cascade** | 14 teams' builds break Monday morning, war room assembled | Downstream consumer tests run in CI before PR is opened, blast radius = 0 |
| **08: Material API change** | Payment forms render incorrectly in production, customer complaints | Material migration guide applied systematically, visual regression tests added |
| **09: Karma removal** | Test suite fails to compile, compliance coverage evidence lost for 6 weeks | Playbook includes Karma→Jest migration as prerequisite step, not during upgrade |
| **10: Webpack config loss** | Internal API calls fail in production due to missing CA certificates | ESBuild migration plan created with equivalent configuration before code changes |

---

## ROI Calculation for VP Engineering

**Scenario 07 (Downstream Cascade) Impact:**

- **Without governance:** 3 consuming apps × 4 developers per app × 1 day to diagnose + fix = **12 engineering days lost**
- **With Devin + playbook:** Downstream tests run in CI before PR opens = **0 engineering days lost**

**Cost per incident:** $2,000/day loaded cost × 12 days = **$24,000 per shared component API break**

**Migration scope:** 247 shared components in enterprise component library

**Expected API breaks without governance:** 15-20% = **37-49 incidents**

**Total cost avoidance:** $24,000 × 43 (midpoint) = **$1,032,000**

---

## Security Incident Quantification for Security Engineer

**Scenario 04 (Auth Interceptor) + Scenario 05 (XSS) + Scenario 06 (Hardcoded Credentials):**

| Incident Type | Without Governance | With Playbook Rule |
|---------------|-------------------|-------------------|
| Unauthenticated API calls (04) | Discovered in production → P0 incident, customer data exposure | Flagged in pre-PR security review → never reaches main branch |
| XSS vulnerability (05) | Discovered in audit 3 months post-migration → regulatory reporting required | Automated scan + manual review blocks PR until remediated |
| Hardcoded credentials (06) | API keys in git history → permanent exposure, requires key rotation + forensics | Pre-migration secrets scan blocks migration start, credentials never enter AI context |

**Regulatory impact:** Each security incident in a consumer banking application triggers:
- OCC examination escalation
- Incident reporting to federal regulators
- Customer notification requirements (depending on exposure)
- Minimum 40 hours of incident response + forensics time
- Reputational risk quantified in millions

**Playbook approach:** These three scenarios are why auth-critical files, sanitization patterns, and secrets detection have mandatory human review gates — the failure mode is not a bug, it's a material security event.

---

## Architectural Integrity for Chief Architect

**Scenario 01 (NgModule) + Scenario 07 (Downstream Cascade) + Scenario 10 (Webpack):**

The Chief Architect's concern is not individual bugs — it's whether the migration maintains:
1. **Dependency injection integrity** (Scenario 01) — singleton services remain singletons, lazy module isolation is preserved
2. **API contract stability** (Scenario 07) — shared libraries maintain semantic versioning, breaking changes are versioned and communicated
3. **Build system reproducibility** (Scenario 10) — security certificate injection, secret management, and asset handling transfer to the new build system with evidence of equivalence

**Key demonstration points:**
- Scenario 01 shows why Devin produces an architecture inventory BEFORE code changes — to identify singleton services and lazy-loaded module boundaries
- Scenario 07 shows why downstream consumer tests are a CI gate, not a post-merge discovery
- Scenario 10 shows why build system migration has a separate plan phase with equivalence testing — "the build succeeds" is not the acceptance criteria, "the build produces identical artifacts" is

---

## Setup Instructions

Each scenario is a standalone Angular 14 application that compiles and runs independently.

### Prerequisites
- Node.js 16.x or 18.x
- npm 8.x+
- Angular CLI 14.x: `npm install -g @angular/cli@14`

### Running a scenario

```bash
cd [scenario-folder]
npm install
ng serve
```

Each scenario includes:
- `README.md` — problem explanation, bank-specific impact, correct migration approach
- `MIGRATION-ATTEMPT.md` — what breaks when you naively run `ng update @angular/core@20`
- `devin-session-prompt.txt` — the correct Devin task prompt for this scenario
- Working Angular 14 source code demonstrating the problem pattern

### For Scenario 07 (Downstream Cascade):
```bash
cd 07-downstream-consumer-cascade
npm install
# Build the shared library first
cd src/libs/shared-ui && ng build
# Then run any consuming app
cd ../../apps/consumer-banking && ng serve
```

---

## Technical Details

- **Angular version:** 14.2.0
- **TypeScript version:** 4.7.4
- **RxJS version:** 7.5.7
- **Angular Material version:** 14.2.0
- **Test runner:** Karma + Jasmine (scenarios 09)
- **Build system:** Webpack via `@angular-builders/custom-webpack` (scenario 10)

All credentials, API keys, and tokens in this codebase are fake demo values clearly marked as `// DEMO_VALUE_DO_NOT_USE`.

---

## Questions for Each Audience Member

**For VP Engineering:**
- "How many shared component libraries does BofA maintain?"
- "What's the typical downstream consumer count per shared component?"
- "What's your current process for detecting breaking changes before they merge?"

**For Security Engineer:**
- "How are auth-critical files currently identified in your CI/CD pipeline?"
- "What's your process for secrets detection in AI-assisted code generation?"
- "How quickly can you rotate credentials if they're discovered in git history?"

**For Chief Architect:**
- "What custom webpack configurations are in use across your Angular applications?"
- "How do you maintain singleton service guarantees in a micro-frontend architecture?"
- "What's your current approach to versioning shared component library breaking changes?"

---



