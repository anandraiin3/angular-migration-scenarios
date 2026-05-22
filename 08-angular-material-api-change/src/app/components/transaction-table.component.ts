import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

/**
 * TransactionTableComponent
 *
 * PROBLEM: Uses old MatTableDataSource pattern with direct array assignment
 *
 * This component displays transaction history in a Material table. It uses the old
 * pattern of directly assigning an array to the dataSource property instead of
 * wrapping it in a MatTableDataSource instance.
 *
 * IMPACT: After upgrading to Material 15+, the table will:
 * - Appear empty even though data is fetched successfully
 * - Not respond to sorting or filtering
 * - Cause critical transaction reconciliation workflows to fail
 * - Block users from viewing their financial history
 *
 * This is a SILENT FAILURE - the code compiles, data is fetched, but nothing renders.
 */

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  balance: number;
  status: 'completed' | 'pending' | 'failed';
}

@Component({
  selector: 'app-transaction-table',
  template: `
    <div class="transaction-table-container">
      <div class="table-header">
        <h2>Transaction History</h2>
        <div class="table-actions">
          <mat-form-field appearance="fill" class="search-field">
            <mat-label>Search transactions</mat-label>
            <input matInput (keyup)="applyFilter($event)" placeholder="Search...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <button mat-raised-button color="primary">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </div>

      <div class="table-wrapper">
        <table mat-table [dataSource]="dataSource" matSort class="transaction-table">
          <!-- Date Column -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
            <td mat-cell *matCellDef="let transaction">
              {{ transaction.date | date:'short' }}
            </td>
          </ng-container>

          <!-- Description Column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Description</th>
            <td mat-cell *matCellDef="let transaction">
              {{ transaction.description }}
            </td>
          </ng-container>

          <!-- Category Column -->
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Category</th>
            <td mat-cell *matCellDef="let transaction">
              <mat-chip [class]="getCategoryClass(transaction.category)">
                {{ transaction.category }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Amount Column -->
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
            <td mat-cell *matCellDef="let transaction" [class.negative]="transaction.amount < 0">
              {{ transaction.amount | currency }}
            </td>
          </ng-container>

          <!-- Balance Column -->
          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Balance</th>
            <td mat-cell *matCellDef="let transaction">
              {{ transaction.balance | currency }}
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
            <td mat-cell *matCellDef="let transaction">
              <mat-chip [class]="getStatusClass(transaction.status)">
                {{ transaction.status | titlecase }}
              </mat-chip>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <!-- No Data Row -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="displayedColumns.length">
              No transactions found
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [pageSizeOptions]="[10, 25, 50, 100]"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [`
    .transaction-table-container {
      padding: 2rem;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .table-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .search-field {
      width: 300px;
    }

    .table-wrapper {
      overflow-x: auto;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 4px;
    }

    .transaction-table {
      width: 100%;
    }

    .mat-cell.negative {
      color: #d32f2f;
      font-weight: 500;
    }

    mat-chip {
      font-size: 0.75rem;
    }

    .status-completed {
      background-color: #4caf50;
      color: white;
    }

    .status-pending {
      background-color: #ff9800;
      color: white;
    }

    .status-failed {
      background-color: #f44336;
      color: white;
    }

    .category-income {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .category-expense {
      background-color: #ffebee;
      color: #c62828;
    }

    .category-transfer {
      background-color: #e3f2fd;
      color: #1565c0;
    }
  `]
})
export class TransactionTableComponent implements OnInit {
  displayedColumns: string[] = ['date', 'description', 'category', 'amount', 'balance', 'status'];

  // ISSUE: Direct array assignment instead of MatTableDataSource wrapper
  // In Material 15+, this needs to be: dataSource = new MatTableDataSource<Transaction>();
  dataSource: any;

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    // Simulate API call to fetch transactions
    setTimeout(() => {
      const transactions: Transaction[] = [
        {
          id: '1',
          date: new Date('2024-01-15T10:30:00'),
          description: 'Salary Deposit',
          category: 'income',
          amount: 5000.00,
          balance: 12500.00,
          status: 'completed'
        },
        {
          id: '2',
          date: new Date('2024-01-14T14:22:00'),
          description: 'Grocery Store',
          category: 'expense',
          amount: -125.43,
          balance: 7500.00,
          status: 'completed'
        },
        {
          id: '3',
          date: new Date('2024-01-13T09:15:00'),
          description: 'Transfer to Savings',
          category: 'transfer',
          amount: -1000.00,
          balance: 7625.43,
          status: 'completed'
        },
        {
          id: '4',
          date: new Date('2024-01-12T16:45:00'),
          description: 'Electric Bill',
          category: 'expense',
          amount: -89.50,
          balance: 8625.43,
          status: 'completed'
        },
        {
          id: '5',
          date: new Date('2024-01-11T11:30:00'),
          description: 'Online Purchase',
          category: 'expense',
          amount: -249.99,
          balance: 8714.93,
          status: 'pending'
        },
        {
          id: '6',
          date: new Date('2024-01-10T08:00:00'),
          description: 'ATM Withdrawal',
          category: 'expense',
          amount: -200.00,
          balance: 8964.92,
          status: 'completed'
        },
        {
          id: '7',
          date: new Date('2024-01-09T13:20:00'),
          description: 'Restaurant',
          category: 'expense',
          amount: -75.30,
          balance: 9164.92,
          status: 'completed'
        },
        {
          id: '8',
          date: new Date('2024-01-08T10:00:00'),
          description: 'Freelance Payment',
          category: 'income',
          amount: 1500.00,
          balance: 9240.22,
          status: 'completed'
        }
      ];

      // ISSUE: Direct array assignment - this pattern breaks in Material 15+
      // The table will compile but render empty because Material expects a
      // MatTableDataSource instance, not a raw array.
      //
      // CORRECT APPROACH for Material 15+:
      // this.dataSource = new MatTableDataSource(transactions);
      this.dataSource = transactions;

      console.log('Transactions loaded:', transactions.length);
      console.log('DataSource type:', typeof this.dataSource);
      console.log('Is array?', Array.isArray(this.dataSource));
      // After Material 15 upgrade, this will log that data loaded but table remains empty
    }, 500);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;

    // ISSUE: This won't work with direct array assignment in Material 15+
    // MatTableDataSource has a filter property, but raw arrays don't
    if (this.dataSource && this.dataSource.filter !== undefined) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
    } else {
      console.warn('Filter not available - dataSource is not a MatTableDataSource instance');
    }
  }

  getCategoryClass(category: string): string {
    return `category-${category}`;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
