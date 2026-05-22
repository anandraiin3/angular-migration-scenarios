import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  type: 'debit' | 'credit';
  status: 'pending' | 'completed' | 'failed';
  category?: string;
}

@Component({
  selector: 'app-transaction-list',
  template: `
    <div class="transaction-list">
      <div class="filters">
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (input)="onSearchChange()"
          placeholder="Search transactions..."
          class="search-input"
        />
        <select [(ngModel)]="filterType" (change)="onFilterChange()" class="type-filter">
          <option value="all">All Types</option>
          <option value="debit">Debits</option>
          <option value="credit">Credits</option>
        </select>
        <select [(ngModel)]="filterStatus" (change)="onFilterChange()" class="status-filter">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div class="transaction-count">
        Showing {{ filteredTransactions.length }} of {{ transactions.length }} transactions
      </div>

      <div class="transactions" *ngIf="filteredTransactions.length > 0">
        <div
          *ngFor="let transaction of filteredTransactions"
          class="transaction-item"
          [class.debit]="transaction.type === 'debit'"
          [class.credit]="transaction.type === 'credit'"
          [class.pending]="transaction.status === 'pending'"
        >
          <div class="transaction-date">{{ transaction.date | date:'short' }}</div>
          <div class="transaction-description">{{ transaction.description }}</div>
          <div class="transaction-amount">
            {{ transaction.type === 'debit' ? '-' : '+' }}
            {{ transaction.amount | currency:transaction.currency }}
          </div>
          <div class="transaction-status">{{ transaction.status }}</div>
        </div>
      </div>

      <div class="no-transactions" *ngIf="filteredTransactions.length === 0">
        No transactions found
      </div>

      <div class="loading" *ngIf="loading">
        Loading transactions...
      </div>
    </div>
  `,
  styles: [`
    .transaction-list {
      padding: 20px;
    }
    .filters {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    .search-input {
      flex: 1;
      padding: 8px;
    }
    .transaction-item {
      padding: 15px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: 150px 1fr 150px 100px;
      gap: 10px;
    }
    .transaction-item.debit {
      border-left: 4px solid #f44336;
    }
    .transaction-item.credit {
      border-left: 4px solid #4caf50;
    }
    .transaction-item.pending {
      opacity: 0.7;
    }
    .no-transactions, .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `]
})
export class TransactionListComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchTerm: string = '';
  filterType: string = 'all';
  filterStatus: string = 'all';
  loading: boolean = false;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadTransactions();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactions(): void {
    this.loading = true;

    // Simulate API call
    setTimeout(() => {
      this.transactions = this.getMockTransactions();
      this.applyFilters();
      this.loading = false;
    }, 500);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.transactions];

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.id.toLowerCase().includes(searchLower) ||
        (t.category && t.category.toLowerCase().includes(searchLower))
      );
    }

    // Apply type filter
    if (this.filterType !== 'all') {
      filtered = filtered.filter(t => t.type === this.filterType);
    }

    // Apply status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === this.filterStatus);
    }

    this.filteredTransactions = filtered;
  }

  startAutoRefresh(): void {
    // Refresh transactions every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadTransactions();
      });
  }

  getTotalBalance(): number {
    return this.transactions.reduce((sum, t) => {
      if (t.status === 'completed') {
        return sum + (t.type === 'credit' ? t.amount : -t.amount);
      }
      return sum;
    }, 0);
  }

  getPendingTotal(): number {
    return this.transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  private getMockTransactions(): Transaction[] {
    return [
      {
        id: 'TXN001',
        date: new Date('2024-01-15T10:30:00'),
        description: 'Salary Deposit',
        amount: 5000.00,
        currency: 'USD',
        type: 'credit',
        status: 'completed',
        category: 'Income'
      },
      {
        id: 'TXN002',
        date: new Date('2024-01-16T14:20:00'),
        description: 'Grocery Store',
        amount: 150.50,
        currency: 'USD',
        type: 'debit',
        status: 'completed',
        category: 'Shopping'
      },
      {
        id: 'TXN003',
        date: new Date('2024-01-17T09:15:00'),
        description: 'Electric Bill Payment',
        amount: 85.00,
        currency: 'USD',
        type: 'debit',
        status: 'completed',
        category: 'Utilities'
      },
      {
        id: 'TXN004',
        date: new Date('2024-01-17T16:45:00'),
        description: 'Online Transfer',
        amount: 500.00,
        currency: 'USD',
        type: 'debit',
        status: 'pending',
        category: 'Transfer'
      },
      {
        id: 'TXN005',
        date: new Date('2024-01-18T11:00:00'),
        description: 'Refund',
        amount: 25.99,
        currency: 'USD',
        type: 'credit',
        status: 'pending',
        category: 'Refund'
      }
    ];
  }
}
