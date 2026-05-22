import { Component, Input, OnInit } from '@angular/core';
import { AccountType, AccountTypeHelper } from '../models/account-type.enum';

/**
 * Transaction Formatter Component
 *
 * Demonstrates decorator metadata issues and type inference problems
 * that surface when migrating from TypeScript 4.7 to 5.x with strict mode.
 *
 * Issues:
 * 1. @Input() properties without explicit types
 * 2. Event handler parameters with implicit any
 * 3. Template variable types not properly inferred
 * 4. Object destructuring without type annotations
 */

interface Transaction {
  id: string;
  accountId: number;
  accountType: AccountType;
  amount: number;
  date: string;
  category: string;
  description: string;
  metadata?: any;
}

@Component({
  selector: 'app-transaction-formatter',
  template: `
    <div class="transaction-list">
      <div *ngFor="let transaction of transactions"
           class="transaction-item"
           (click)="onTransactionClick(transaction)">
        <div class="transaction-header">
          <span class="transaction-id">{{ transaction.id }}</span>
          <span class="transaction-date">{{ formatDate(transaction.date) }}</span>
        </div>
        <div class="transaction-details">
          <span class="account-type">{{ getAccountTypeName(transaction.accountType) }}</span>
          <span class="amount" [class.negative]="transaction.amount < 0">
            {{ formatCurrency(transaction.amount) }}
          </span>
        </div>
        <div class="transaction-description">
          {{ transaction.description }}
        </div>
        <div class="transaction-category">
          <span class="category-badge" [style.background-color]="getCategoryColor(transaction.category)">
            {{ transaction.category }}
          </span>
        </div>
      </div>
    </div>

    <div class="transaction-summary">
      <h3>Summary</h3>
      <div *ngFor="let item of getSummaryData()">
        <span>{{ item.label }}:</span>
        <span>{{ item.value }}</span>
      </div>
    </div>
  `,
  styles: [`
    .transaction-item {
      border: 1px solid #ddd;
      padding: 10px;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .transaction-item:hover { background-color: #f5f5f5; }
    .negative { color: red; }
    .category-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 12px;
    }
  `]
})
export class TransactionFormatterComponent implements OnInit {
  // Missing type annotation - TS 5 strict requires explicit type
  @Input() transactions;

  // Missing type annotation on Input
  @Input() filterOptions;

  // OK - has explicit type
  @Input() showSummary: boolean = true;

  // Missing return type
  ngOnInit() {
    this.processTransactions();
  }

  // Parameter has implicit any
  onTransactionClick(transaction) {
    console.log('Transaction clicked:', transaction.id);
    this.emitTransactionDetails(transaction);
  }

  // Missing return type and parameter types
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Parameter with implicit any
  formatCurrency(amount) {
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    return `${sign}$${absAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // Missing return type
  getAccountTypeName(type: AccountType) {
    return AccountTypeHelper.getDisplayName(type);
  }

  // Parameter and return type missing
  getCategoryColor(category) {
    const colors = {
      'groceries': '#4CAF50',
      'dining': '#FF9800',
      'transportation': '#2196F3',
      'entertainment': '#9C27B0',
      'utilities': '#795548',
      'healthcare': '#F44336',
      'shopping': '#E91E63',
      'other': '#607D8B'
    };
    return colors[category] || colors['other'];
  }

  // Missing return type with complex logic
  getSummaryData() {
    if (!this.transactions) return [];

    // 'total' and 't' have implicit any
    const total = this.transactions.reduce((sum, t) => sum + t.amount, 0);

    // 'count' and 'transaction' have implicit any
    const count = this.transactions.filter(transaction => transaction.amount > 0).length;

    // Object.entries returns implicit any in strict mode
    const byCategory = this.transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    // Array map without type annotations
    const categoryTotals = Object.entries(byCategory).map(([cat, amount]) => ({
      label: cat,
      value: this.formatCurrency(amount)
    }));

    return [
      { label: 'Total Transactions', value: this.transactions.length },
      { label: 'Total Amount', value: this.formatCurrency(total) },
      { label: 'Positive Transactions', value: count },
      ...categoryTotals
    ];
  }

  // Missing types everywhere
  processTransactions() {
    if (!this.transactions) return;

    // Array methods with implicit any
    this.transactions.forEach(transaction => {
      if (transaction.metadata) {
        // Property access without type checking
        transaction.enriched = true;
        transaction.processedDate = new Date().toISOString();
      }
    });
  }

  // Implicit any in destructuring
  emitTransactionDetails(transaction) {
    const { id, amount, date, category, description } = transaction;

    // Object creation without type
    const details = {
      transactionId: id,
      formattedAmount: this.formatCurrency(amount),
      formattedDate: this.formatDate(date),
      categoryInfo: {
        name: category,
        color: this.getCategoryColor(category)
      },
      description
    };

    console.log('Transaction details:', details);
  }

  // Missing return type with conditional logic
  getFilteredTransactions() {
    if (!this.filterOptions) return this.transactions;

    // Multiple implicit any in filter chain
    return this.transactions.filter(t => {
      if (this.filterOptions.minAmount && t.amount < this.filterOptions.minAmount) {
        return false;
      }
      if (this.filterOptions.maxAmount && t.amount > this.filterOptions.maxAmount) {
        return false;
      }
      if (this.filterOptions.categories && this.filterOptions.categories.length > 0) {
        return this.filterOptions.categories.includes(t.category);
      }
      return true;
    });
  }

  // Sort helper with implicit any
  sortTransactions(field, direction) {
    return [...this.transactions].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  // Grouping function with implicit any everywhere
  groupByAccountType() {
    const grouped = this.transactions.reduce((acc, transaction) => {
      const type = transaction.accountType;
      if (!acc[type]) {
        acc[type] = {
          transactions: [],
          total: 0,
          count: 0
        };
      }
      acc[type].transactions.push(transaction);
      acc[type].total += transaction.amount;
      acc[type].count++;
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, data]) => ({
      accountType: type,
      ...data
    }));
  }
}
