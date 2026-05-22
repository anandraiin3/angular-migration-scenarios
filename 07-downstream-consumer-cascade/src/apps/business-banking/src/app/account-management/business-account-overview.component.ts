import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountCardComponent, AccountCardData } from '@bank/shared-ui';

/**
 * Business Banking Account Overview Component
 * Displays business account information for commercial banking customers
 *
 * Team: Commercial Banking Engineering (8 engineers)
 * Users: 2.8M monthly active users
 * Criticality: HIGH
 */
@Component({
  selector: 'app-business-account-overview',
  standalone: true,
  imports: [CommonModule, AccountCardComponent],
  template: `
    <div class="business-dashboard">
      <h2>Business Accounts Overview</h2>
      <div class="account-grid">
        <div *ngFor="let account of accounts" class="account-wrapper">
          <div class="account-type-indicator" [class]="'indicator-' + account.accountType">
            <span class="account-icon">{{ getAccountIcon(account.accountType) }}</span>
          </div>
          <bank-account-card [account]="account" />
          <div class="account-actions">
            <button class="action-btn">View Details</button>
            <button class="action-btn">Transfer</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .business-dashboard {
      padding: 32px;
      background: #f5f5f5;
    }
    h2 {
      font-size: 28px;
      margin-bottom: 24px;
      color: #1a1a1a;
    }
    .account-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }
    .account-wrapper {
      position: relative;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .account-type-indicator {
      padding: 8px;
      text-align: center;
      font-weight: bold;
    }
    .indicator-checking {
      background: #4CAF50;
      color: white;
    }
    .indicator-savings {
      background: #2196F3;
      color: white;
    }
    .account-icon {
      font-size: 24px;
    }
    .account-actions {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #e0e0e0;
    }
    .action-btn {
      flex: 1;
      padding: 8px 16px;
      background: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .action-btn:hover {
      background: #1557b0;
    }
  `]
})
export class BusinessAccountOverviewComponent {
  @Input() accounts: AccountCardData[] = [
    {
      accountNumber: '5551234567',
      balance: 145780.25,
      accountType: 'checking',
      lastTransaction: new Date('2026-05-20T08:45:00'),
      holderName: 'Acme Corporation'
    },
    {
      accountNumber: '5559876543',
      balance: 523400.00,
      accountType: 'savings',
      lastTransaction: new Date('2026-05-15T16:20:00'),
      holderName: 'Acme Corporation'
    }
  ];

  /**
   * Get icon for account type using exhaustive type checking
   *
   * BREAKING CHANGE IMPACT:
   * If new account types are added to the union ('money-market' | 'investment'),
   * TypeScript will error because the switch statement is not exhaustive.
   *
   * Error: "Not all code paths return a value"
   * This is INTENTIONAL - we use exhaustive checking to ensure all account types are handled.
   */
  getAccountIcon(type: AccountCardData['accountType']): string {
    switch (type) {
      case 'checking':
        return '✓';
      case 'savings':
        return '💰';
      // No default case - TypeScript ensures this is exhaustive
      // If new types are added to the union, this will fail to compile
    }
    // TypeScript will error here if the switch is not exhaustive
    // This is a compile-time safety feature
  }

  /**
   * Get display label for account type
   *
   * BREAKING CHANGE IMPACT:
   * Same exhaustive checking pattern - will break if union expands
   */
  getAccountTypeLabel(type: AccountCardData['accountType']): string {
    switch (type) {
      case 'checking':
        return 'Business Checking';
      case 'savings':
        return 'Business Savings';
      // Exhaustive check - no default case
    }
  }

  /**
   * Get account type description
   *
   * BREAKING CHANGE IMPACT:
   * Another exhaustive pattern that will break with new account types
   */
  getAccountDescription(type: AccountCardData['accountType']): string {
    switch (type) {
      case 'checking':
        return 'Operating account for daily business transactions';
      case 'savings':
        return 'Interest-bearing savings account for business reserves';
    }
  }
}
