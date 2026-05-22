import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountCardComponent, AccountCardData } from '@bank/shared-ui';

/**
 * Wealth Management Client Accounts Component
 * Displays high-net-worth client account information
 *
 * Team: Wealth Management Engineering (6 engineers)
 * Users: 890K monthly active users
 * Criticality: MEDIUM
 *
 * NOTE: This app is currently using @bank/shared-ui v2.3.0 (one version behind)
 */
@Component({
  selector: 'app-client-accounts',
  standalone: true,
  imports: [CommonModule, AccountCardComponent],
  template: `
    <div class="wealth-dashboard">
      <div class="client-header">
        <h2>Client Portfolio Accounts</h2>
        <div class="total-assets">
          <span class="label">Total Assets Under Management</span>
          <span class="amount">{{ calculateTotalAssets() | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
      </div>

      <div class="accounts-section">
        <h3>Deposit Accounts</h3>
        <div class="account-list">
          <div *ngFor="let account of accounts" class="account-item">
            <bank-account-card [account]="account" />
            <div class="account-metadata">
              <div class="metadata-row">
                <span class="label">Last Activity:</span>
                <span class="value">{{ formatLastActivity(account) }}</span>
              </div>
              <div class="metadata-row">
                <span class="label">Account Status:</span>
                <span class="value" [class.active]="isRecentActivity(account)">
                  {{ getAccountStatus(account) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wealth-dashboard {
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .client-header {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    h2 {
      font-size: 32px;
      margin: 0 0 16px 0;
      color: #1a1a1a;
    }
    .total-assets {
      display: flex;
      flex-direction: column;
      margin-top: 12px;
    }
    .total-assets .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }
    .total-assets .amount {
      font-size: 36px;
      font-weight: 700;
      color: #667eea;
    }
    .accounts-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    h3 {
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #333;
    }
    .account-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .account-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    .account-metadata {
      padding: 16px;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }
    .metadata-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .metadata-row .label {
      color: #666;
      font-size: 14px;
    }
    .metadata-row .value {
      font-weight: 500;
      color: #333;
    }
    .metadata-row .value.active {
      color: #4CAF50;
    }
  `]
})
export class ClientAccountsComponent {
  @Input() accounts: AccountCardData[] = [
    {
      accountNumber: '7771234567',
      balance: 2450000.00,
      accountType: 'savings',
      lastTransaction: new Date('2026-05-18T11:30:00'),
      holderName: 'Elizabeth Wellington'
    },
    {
      accountNumber: '7779876543',
      balance: 875000.50,
      accountType: 'checking',
      lastTransaction: new Date('2026-05-19T14:15:00'),
      holderName: 'Elizabeth Wellington'
    }
  ];

  calculateTotalAssets(): number {
    return this.accounts.reduce((sum, account) => sum + account.balance, 0);
  }

  /**
   * Format last activity timestamp
   *
   * BREAKING CHANGE IMPACT:
   * Assumes lastTransaction is always defined (required in v2.3.0 and v2.4.0)
   * Will break if it becomes optional
   */
  formatLastActivity(account: AccountCardData): string {
    // This will error if lastTransaction becomes optional
    const date = new Date(account.lastTransaction);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays} days ago`;
    }
  }

  /**
   * Check if account has recent activity
   *
   * BREAKING CHANGE IMPACT:
   * Assumes lastTransaction is always defined
   */
  isRecentActivity(account: AccountCardData): boolean {
    const daysSince = this.getDaysSinceLastTransaction(account);
    return daysSince <= 7;
  }

  /**
   * Get account status based on activity
   *
   * BREAKING CHANGE IMPACT:
   * Depends on lastTransaction being defined
   */
  getAccountStatus(account: AccountCardData): string {
    const daysSince = this.getDaysSinceLastTransaction(account);
    if (daysSince <= 7) {
      return 'Active';
    } else if (daysSince <= 30) {
      return 'Normal';
    } else {
      return 'Inactive';
    }
  }

  /**
   * Helper method to calculate days since last transaction
   *
   * BREAKING CHANGE IMPACT:
   * Direct usage of lastTransaction without null check
   * Will fail with "possibly undefined" error if interface changes
   */
  private getDaysSinceLastTransaction(account: AccountCardData): number {
    const now = new Date();
    // This line will break if lastTransaction becomes optional
    const last = new Date(account.lastTransaction);
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }
}
