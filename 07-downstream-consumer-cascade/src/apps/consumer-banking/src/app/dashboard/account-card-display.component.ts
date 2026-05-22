import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountCardComponent, AccountCardData } from '@bank/shared-ui';

/**
 * Consumer Banking Dashboard Component
 * Displays account information for retail banking customers
 *
 * Team: Retail Banking Engineering (12 engineers)
 * Users: 14.2M monthly active users
 * Criticality: HIGH
 */
@Component({
  selector: 'app-account-card-display',
  standalone: true,
  imports: [CommonModule, AccountCardComponent],
  template: `
    <div class="dashboard-section">
      <h2>Your Accounts</h2>
      <div class="account-list">
        <bank-account-card
          *ngFor="let account of accounts"
          [account]="account"
        />
      </div>
      <div class="transaction-summary">
        <h3>Recent Activity</h3>
        <div *ngFor="let account of accounts" class="activity-item">
          <span class="account-name">{{ account.accountType | titlecase }} ({{ formatAccountNumber(account.accountNumber) }})</span>
          <span class="last-transaction-date">
            <!-- CRITICAL ASSUMPTION: lastTransaction is always defined (required in v2.4.0) -->
            Last activity: {{ displayLastTransaction(account) }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-section {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h2 {
      font-size: 24px;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    .account-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .transaction-summary {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
    }
    h3 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #333;
    }
    .activity-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .activity-item:last-child {
      border-bottom: none;
    }
    .account-name {
      font-weight: 500;
    }
    .last-transaction-date {
      color: #666;
      font-size: 14px;
    }
  `]
})
export class AccountCardDisplayComponent {
  @Input() accounts: AccountCardData[] = [
    {
      accountNumber: '1234567890',
      balance: 5432.10,
      accountType: 'checking',
      lastTransaction: new Date('2026-05-19T14:32:00'),
      holderName: 'John Smith'
    },
    {
      accountNumber: '0987654321',
      balance: 12750.50,
      accountType: 'savings',
      lastTransaction: new Date('2026-05-18T09:15:00'),
      holderName: 'John Smith'
    }
  ];

  /**
   * Display last transaction date in user-friendly format
   *
   * BREAKING CHANGE IMPACT:
   * If lastTransaction becomes optional (lastTransaction?: Date), this method will fail
   * with TypeScript error: "Object is possibly 'undefined'"
   *
   * The code assumes lastTransaction is always present because the interface
   * requires it in v2.4.0. Making it optional is a BREAKING CHANGE.
   */
  displayLastTransaction(account: AccountCardData): string {
    // This line will break if lastTransaction becomes optional
    // TypeScript error: Property 'lastTransaction' is possibly undefined
    return account.lastTransaction.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format account number for display
   */
  formatAccountNumber(accountNumber: string): string {
    return `****${accountNumber.slice(-4)}`;
  }

  /**
   * Calculate days since last transaction
   *
   * BREAKING CHANGE IMPACT:
   * This method also assumes lastTransaction is always defined
   */
  getDaysSinceLastTransaction(account: AccountCardData): number {
    const now = new Date();
    const last = new Date(account.lastTransaction); // Will fail if optional
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
