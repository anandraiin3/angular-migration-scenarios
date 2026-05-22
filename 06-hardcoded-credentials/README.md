# Scenario 06 — Hardcoded Credentials

## The Problem

This codebase accumulated hardcoded values over years of development — API keys embedded in service files, internal service tokens, environment-specific URLs with authentication parameters, and credentials moved from environment files directly into components for "convenience." These values are invisible during normal code review because experienced developers know not to look at old, stable files. However, when an AI agent (like Devin) reads the entire codebase to perform a migration, these hardcoded credentials enter the AI system's context window. Even if the values are not copied forward into migrated code, they have now been exposed to the AI system and any logging/telemetry associated with it.

## Why This Matters for a Bank

Hardcoded credentials in git history represent permanent exposure — even after rotation, the old values remain in commit history forever. When these credentials are read by an AI agent during migration, they enter the AI provider's context window and potentially logs. For a banking institution, internal service tokens are not just authentication mechanisms — they provide access to sensitive systems: payment processing, customer data APIs, internal audit logs, and compliance reporting systems. The regulatory requirement under OCC guidelines is that credentials must NEVER be stored in source code or transmitted to external systems (including AI service providers) without explicit security approval. The presence of credentials in git history triggers mandatory rotation, forensic analysis of who accessed the credentials, and examination of whether any unauthorized access occurred.

## What the Playbook Rule Says

**Playbook Rule 9.1 — Pre-Migration Secrets Detection (BLOCKING):**

> Before ANY AI agent reads the codebase for migration planning:
> 1. Run automated secrets detection scan (truffleHog, git-secrets, or gitleaks)
> 2. Scan for patterns:
>    - API keys: `[A-Za-z0-9_-]{32,}` in variable assignments
>    - Bearer tokens: `Bearer [A-Za-z0-9-_.]+`
>    - Basic auth: `Basic [A-Za-z0-9+/=]+`
>    - Connection strings with passwords: `password=`, `pwd=`
>    - URLs with embedded tokens: `?token=`, `?api_key=`
>    - Private keys: `-----BEGIN.*PRIVATE KEY-----`
> 3. For every match:
>    - Document the credential type and purpose
>    - Determine if it's live (still in use) or historical
>    - Mark as BLOCKING issue
> 4. Remediation REQUIRED before migration starts:
>    - Move all credentials to secure vault (AWS Secrets Manager, HashiCorp Vault)
>    - Rotate all exposed credentials
>    - Update code to fetch from vault at runtime
>    - Add pre-commit hook to prevent future credential commits
>
> **Gate:** AI agent CANNOT read codebase until secrets scan shows zero findings.

## The Correct Migration Approach

### Step 1: Pre-Migration Secrets Scan (Automated, BEFORE Devin)

Run secrets detection tool:
```bash
truffleHog filesystem src/ --json > secrets-report.json
```

Example findings:
```json
{
  "findings": [
    {
      "file": "src/app/services/payment-gateway.service.ts",
      "line": 23,
      "match": "pgw_live_4f8a2c1b3d5e6789abcdef0123456789",
      "type": "API Key",
      "entropy": 4.2,
      "severity": "HIGH"
    },
    {
      "file": "src/app/services/audit-log.service.ts",
      "line": 18,
      "match": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "type": "JWT Token",
      "entropy": 4.8,
      "severity": "CRITICAL"
    },
    {
      "file": "src/environments/environment.prod.ts",
      "line": 8,
      "match": "https://internal-api.bank.com?token=sk_live_abc123",
      "type": "URL with embedded token",
      "severity": "HIGH"
    }
  ],
  "summary": {
    "total": 3,
    "critical": 1,
    "high": 2
  }
}
```

### Step 2: Security Review (BLOCKING)

Security team reviews findings and determines:
1. **Which credentials are live (still grant access)**
   - Payment gateway API key: LIVE — provides access to payment processing system
   - Audit log service token: LIVE — provides write access to compliance audit logs
   - Internal API token: REVOKED 2 years ago — no longer grants access

2. **Rotation requirements**
   - Live credentials: MUST rotate before migration
   - Revoked credentials: Document in git history, no rotation needed

3. **Vault migration plan**
   - All live credentials moved to AWS Secrets Manager
   - Code updated to fetch at runtime:
   ```typescript
   // BEFORE (hardcoded)
   private readonly API_KEY = 'pgw_live_4f8a2c1b3d5e6789abcdef0123456789';

   // AFTER (vault)
   private apiKey: string;
   constructor(private secretsService: SecretsService) {
     this.apiKey = await this.secretsService.getSecret('payment-gateway-api-key');
   }
   ```

### Step 3: Remediation Implementation

**Step 3a:** Set up secrets management infrastructure
```typescript
// secrets.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SecretsService {
  private cache = new Map<string, Observable<string>>();

  constructor(private http: HttpClient) {}

  getSecret(secretName: string): Observable<string> {
    if (!this.cache.has(secretName)) {
      // In production, this calls AWS Secrets Manager API
      // In development, reads from local environment
      const secret$ = this.http.get<{value: string}>(`/api/secrets/${secretName}`)
        .pipe(
          map(response => response.value),
          shareReplay(1)
        );
      this.cache.set(secretName, secret$);
    }
    return this.cache.get(secretName)!;
  }
}
```

**Step 3b:** Update all hardcoded credential references
```typescript
// payment-gateway.service.ts BEFORE
@Injectable({ providedIn: 'root' })
export class PaymentGatewayService {
  private readonly GATEWAY_API_KEY = 'pgw_live_4f8a2c1b3d5e6789abcdef0123456789'; // HARDCODED
  private readonly GATEWAY_URL = 'https://payments.internal.bank/v2';

  submitPayment(payment: Payment): Observable<PaymentResult> {
    return this.http.post(this.GATEWAY_URL, payment, {
      headers: { 'X-API-Key': this.GATEWAY_API_KEY }
    });
  }
}

// payment-gateway.service.ts AFTER
@Injectable({ providedIn: 'root' })
export class PaymentGatewayService {
  private readonly GATEWAY_URL = 'https://payments.internal.bank/v2';
  private apiKey$: Observable<string>;

  constructor(
    private http: HttpClient,
    private secretsService: SecretsService
  ) {
    this.apiKey$ = this.secretsService.getSecret('payment-gateway-api-key');
  }

  submitPayment(payment: Payment): Observable<PaymentResult> {
    return this.apiKey$.pipe(
      switchMap(apiKey =>
        this.http.post(this.GATEWAY_URL, payment, {
          headers: { 'X-API-Key': apiKey }
        })
      )
    );
  }
}
```

**Step 3c:** Rotate all live credentials

Security team:
1. Generates new payment gateway API key via provider portal
2. Stores new key in AWS Secrets Manager: `payment-gateway-api-key`
3. Verifies application can retrieve key from vault
4. Revokes old key in provider portal
5. Monitors for any systems still using old key (should be none)

### Step 4: Verification

Add integration test:
```typescript
it('should retrieve API key from secrets manager, not hardcoded value', async () => {
  const service = TestBed.inject(PaymentGatewayService);

  // Verify no hardcoded keys in source
  const sourceCode = await fs.readFile('src/app/services/payment-gateway.service.ts', 'utf-8');
  expect(sourceCode).not.toContain('pgw_live_');
  expect(sourceCode).not.toContain('Bearer ');

  // Verify key is fetched from vault
  const secretsService = TestBed.inject(SecretsService);
  spyOn(secretsService, 'getSecret').and.returnValue(of('vault-retrieved-key'));

  service.submitPayment(mockPayment).subscribe();

  expect(secretsService.getSecret).toHaveBeenCalledWith('payment-gateway-api-key');
});
```

### Step 5: Add Pre-Commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running secrets detection scan..."
truffleHog filesystem . --fail --exclude-paths .truffleHog-exclude

if [ $? -ne 0 ]; then
  echo "❌ COMMIT BLOCKED: Secrets detected in staged files"
  echo "Remove credentials and use secrets management system"
  exit 1
fi

echo "✓ No secrets detected"
exit 0
```

### Step 6: ONLY NOW Can Migration Begin

After ALL credentials removed and rotated:
1. Re-run secrets scan: MUST show zero findings
2. Security team sign-off: "Codebase ready for AI agent access"
3. Document in PR: "Pre-migration secrets remediation complete. All credentials moved to vault. All live credentials rotated."
4. NOW Devin can read the codebase for migration planning

---

## What Breaks Without This Approach

### Naive Migration

Developer starts Devin session:
```
Task: Migrate this Angular 14 application to Angular 20
```

Devin reads entire codebase including:
- `payment-gateway.service.ts` with hardcoded API key
- `audit-log.service.ts` with hardcoded JWT token
- `environment.prod.ts` with internal URLs containing tokens

These values enter:
- Devin's context window
- AI model provider's logs (if logging enabled)
- Telemetry systems
- Developer's session transcripts

### Security Incident Timeline

**Week 1** - Migration proceeds, credentials in AI context

**Week 3** - Security audit discovers hardcoded credentials in source

**Week 3 Day 2** - Forensic analysis begins:
- Determine which credentials are live
- Identify all systems with access to the credentials
- Review AI provider's data retention policy
- Assess whether credentials were exposed outside organization

**Week 3 Day 3** - Mandatory rotation:
- Payment gateway API key rotated (requires coordination with payment processor)
- Audit log service token rotated (requires updating internal services)
- Internal API keys rotated

**Week 3 Day 4** - Downstream impact:
- 3 internal services break because audit log token changed
- Payment processing temporarily suspended during key rotation
- 4 hours of payment outage

**Week 4** - Regulatory reporting:
- OCC examination triggered
- Incident report filed under cybersecurity incident reporting requirements

### Cost Impact

**Direct costs:**
- Security forensics: 60 hours = $15,000
- Credential rotation coordination: 40 hours = $10,000
- Downstream service fixes: 32 hours = $8,000
- Regulatory response: 24 hours = $6,000
- **Total direct:** $39,000

**Indirect costs:**
- Payment outage (4 hours): $2.1M in lost transaction volume
- Regulatory penalties: $50,000-$500,000 (depending on OCC findings)
- Reputation: Customer trust impact

**Total incident cost:** $2.1M - $2.6M

**With playbook (preventive approach):**
- Secrets scan: 1 hour = $250
- Vault migration implementation: 16 hours = $4,000
- Credential rotation (planned): 8 hours = $2,000
- Pre-commit hook setup: 2 hours = $500
- **Total:** $6,750
- **Incidents:** 0

**Cost avoidance:** $2.09M - $2.59M

---

## Key Insight

The playbook rule exists because **credentials in AI context = credentials exposed to external system**. Even if Devin doesn't copy them into migrated code, the act of reading them is itself a security event requiring rotation and disclosure.

The ONLY safe approach: Remove credentials BEFORE any AI agent reads the codebase.
