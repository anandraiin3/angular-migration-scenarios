import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountCardData } from './account-card-data.interface';

/**
 * Reusable account card component for displaying account information
 * Used across Consumer Banking, Business Banking, and Wealth Management apps
 *
 * @version 2.4.0
 * @stable Public API component
 */
@Component({
  selector: 'bank-account-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="account-card">
      <div class="account-header">
        <h3 class="account-type">{{ formatAccountType(account.accountType) }}</h3>
        <span class="account-number">{{ formatAccountNumber(account.accountNumber) }}</span>
      </div>
      <div class="account-balance">
        <span class="balance-label">Balance</span>
        <span class="balance-amount">{{ formatCurrency(account.balance) }}</span>
      </div>
      <div class="account-footer">
        <span class="last-transaction">
          Last transaction: {{ formatDate(account.lastTransaction) }}
        </span>
      </div>
      <div *ngIf="account.holderName" class="account-holder">
        {{ account.holderName }}
      </div>
    </div>
  `,
  styles: [`
    .account-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin: 8px 0;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .account-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .account-type {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .account-number {
      color: #666;
      font-size: 14px;
    }
    .account-balance {
      margin: 16px 0;
    }
    .balance-label {
      display: block;
      color: #666;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .balance-amount {
      display: block;
      font-size: 28px;
      font-weight: 700;
      color: #1a73e8;
    }
    .account-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }
    .last-transaction {
      font-size: 12px;
      color: #666;
    }
    .account-holder {
      margin-top: 8px;
      font-size: 14px;
      color: #333;
    }
  `]
})
export class AccountCardComponent {
  /**
   * Account data to display
   */
  @Input({ required: true }) account!: AccountCardData;

  /**
   * Format account type for display
   */
  formatAccountType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Format account number to hide middle digits
   */
  formatAccountNumber(accountNumber: string): string {
    if (accountNumber.length < 8) {
      return accountNumber;
    }
    const lastFour = accountNumber.slice(-4);
    return `****${lastFour}`;
  }

  /**
   * Format currency with proper USD formatting
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Format date for display
   * Note: This assumes lastTransaction is always defined (required in v2.4.0)
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }
}
