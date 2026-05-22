import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

/**
 * RichAlertComponent
 *
 * Displays alert messages with dynamic severity-based styling (colors, borders).
 * Uses DomSanitizer.bypassSecurityTrustStyle() to apply inline styles based on severity level.
 *
 * SECURITY ASSESSMENT: LOW RISK
 * Unlike TransactionDescriptionComponent, this component does NOT accept user-controlled
 * or merchant-controlled input. The severity levels (low, medium, high, critical) are
 * hardcoded internal values, not influenced by external data.
 *
 * Angular 14 vs Angular 20 behavior:
 * - bypassSecurityTrustStyle() allows inline CSS styles
 * - Since styles are generated from internal enum (not external data), XSS risk is minimal
 * - Even in Angular 20, this pattern is relatively safe IF input remains internally controlled
 *
 * SAFE USAGE CRITERIA:
 * ✓ Input is from internal enum (severity: 'low' | 'medium' | 'high' | 'critical')
 * ✓ No user-controlled data influences the style string
 * ✓ Style mapping is hardcoded in component logic
 * ✓ No API response data is used to generate styles
 *
 * DANGEROUS IF MODIFIED:
 * ✗ If severity level comes from API response without validation
 * ✗ If custom colors are accepted from user preferences
 * ✗ If style string includes any external data
 *
 * POTENTIAL RISK (edge case):
 * If a future developer modifies this to accept user-configurable theme colors from an API,
 * and those colors are not validated, CSS injection could occur:
 *
 * Example malicious API response (hypothetical future vulnerability):
 * {
 *   "userTheme": {
 *     "alertColor": "red; } body { display: none; } .x { color: blue"
 *   }
 * }
 *
 * This would result in:
 * <div style="background-color: red; } body { display: none; } .x { color: blue;">
 *
 * While CSS injection is less severe than script injection, it can enable:
 * - UI redressing (hiding legitimate content, showing fake content)
 * - Clickjacking attacks
 * - Data exfiltration via CSS selectors (attribute selectors + background-image)
 *
 * MIGRATION RECOMMENDATION:
 * LOW PRIORITY - This bypass is acceptable as long as style values remain internally controlled.
 * However, during Angular 20 migration security audit, verify:
 * 1. Severity input is validated against known enum values
 * 2. No API data is used to construct style strings
 * 3. Add comment documenting that any future use of external data requires sanitization
 */
@Component({
  selector: 'app-rich-alert',
  template: `
    <div class="alert" [style]="safeStyle">
      <div class="alert-icon">{{ icon }}</div>
      <div class="alert-content">
        <div class="alert-title">{{ title }}</div>
        <div class="alert-message">{{ message }}</div>
      </div>
    </div>
  `,
  styles: [`
    .alert {
      display: flex;
      align-items: center;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      border-left: 4px solid;
    }
    .alert-icon {
      font-size: 24px;
      margin-right: 12px;
    }
    .alert-content {
      flex: 1;
    }
    .alert-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .alert-message {
      font-size: 14px;
    }
  `]
})
export class RichAlertComponent implements OnInit {
  @Input() severity!: 'low' | 'medium' | 'high' | 'critical';
  @Input() title!: string;
  @Input() message!: string;

  safeStyle!: SafeStyle;
  icon!: string;

  // INTERNAL MAPPING: These are hardcoded values, not influenced by external data
  private readonly severityConfig = {
    low: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      borderColor: '#1976d2',
      icon: 'ℹ️'
    },
    medium: {
      backgroundColor: '#fff3e0',
      color: '#f57c00',
      borderColor: '#f57c00',
      icon: '⚠️'
    },
    high: {
      backgroundColor: '#fce4ec',
      color: '#c2185b',
      borderColor: '#c2185b',
      icon: '⚠️'
    },
    critical: {
      backgroundColor: '#ffebee',
      color: '#d32f2f',
      borderColor: '#d32f2f',
      icon: '🚨'
    }
  };

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Validate severity input against known values
    if (!this.severityConfig[this.severity]) {
      console.error('Invalid severity level:', this.severity);
      this.severity = 'low'; // Fallback to safe default
    }

    const config = this.severityConfig[this.severity];
    this.icon = config.icon;

    // Generate inline style string from hardcoded config
    const styleString = `
      background-color: ${config.backgroundColor};
      color: ${config.color};
      border-left-color: ${config.borderColor};
    `;

    // SECURITY NOTE: bypassSecurityTrustStyle() usage here is SAFE because:
    // 1. All values come from internal severityConfig mapping
    // 2. No user input or API data influences the style string
    // 3. Severity enum is validated before use
    //
    // This pattern is acceptable in Angular 20 as long as these conditions remain true.
    //
    // PLAYBOOK COMPLIANCE:
    // - Rule 8.4 requires documenting WHY bypass is necessary
    // - Reason: Dynamic severity-based styling for alerts
    // - Input source: Internal enum (low/medium/high/critical)
    // - User-controlled: NO
    // - Risk level: LOW
    // - Recommendation: ALLOW (but monitor for future changes)
    this.safeStyle = this.sanitizer.bypassSecurityTrustStyle(styleString);
  }

  /**
   * SECURITY REVIEW NOTES (for Angular 20 migration audit):
   *
   * CURRENT STATE: SAFE
   * - Input: Internal enum only
   * - No external data influence
   * - Validated before use
   *
   * FUTURE RISK FACTORS TO MONITOR:
   * - If severity level starts coming from API responses
   * - If custom theme colors are added to user preferences
   * - If any external data is incorporated into style generation
   *
   * DEFENSIVE CODING RECOMMENDATION:
   * Add TypeScript guard to ensure severity type safety:
   *
   * @Input()
   * set severity(value: string) {
   *   const validSeverities = ['low', 'medium', 'high', 'critical'] as const;
   *   if (validSeverities.includes(value as any)) {
   *     this._severity = value as typeof validSeverities[number];
   *   } else {
   *     console.error('Invalid severity, defaulting to low');
   *     this._severity = 'low';
   *   }
   * }
   * private _severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
   *
   * ALTERNATIVE APPROACH (eliminate bypass entirely):
   * Use [ngClass] or [ngStyle] with class-based styling instead of inline styles:
   *
   * template: `<div class="alert alert-{{ severity }}">`
   * styles: `
   *   .alert-low { background-color: #e3f2fd; color: #1976d2; }
   *   .alert-medium { background-color: #fff3e0; color: #f57c00; }
   *   ...
   * `
   * // No bypassSecurityTrustStyle() needed - safer and more maintainable
   */
}
