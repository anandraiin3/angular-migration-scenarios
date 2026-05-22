import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

@Component({
  selector: 'app-transaction-list',
  template: `
    <div class="transaction-list">
      <h3>Recent Transactions</h3>
      <p class="instance-id"><small>AuthService Instance: {{ authInstanceId }}</small></p>
      <div *ngIf="!isAuthenticated" class="auth-warning">
        <p>⚠️ Not authenticated - Cannot load transactions</p>
      </div>
      <table *ngIf="isAuthenticated">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let txn of transactions" [class.debit]="txn.type === 'debit'" [class.credit]="txn.type === 'credit'">
            <td>{{ txn.date | date:'MM/dd/yyyy' }}</td>
            <td>{{ txn.description }}</td>
            <td>{{ txn.amount | currency }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .transaction-list { padding: 20px; }
    .instance-id { color: #666; font-family: monospace; margin-bottom: 10px; }
    .auth-warning { background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .debit { color: #d32f2f; }
    .credit { color: #388e3c; }
  `]
})
export class TransactionListComponent implements OnInit {
  transactions: Transaction[] = [];
  isAuthenticated = false;
  authInstanceId: string;

  constructor(private authService: AuthService) {
    this.authInstanceId = authService.instanceId;
    console.log('[TransactionListComponent] Using AuthService instance:', this.authInstanceId);
  }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();

    if (this.isAuthenticated) {
      this.loadTransactions();
    }

    this.authService.session$.subscribe(session => {
      this.isAuthenticated = session !== null;
      if (this.isAuthenticated) {
        this.loadTransactions();
      }
    });
  }

  private loadTransactions(): void {
    // Simulate loading transactions
    this.transactions = [
      { id: '1', date: new Date(2024, 4, 18), description: 'Grocery Store', amount: -87.42, type: 'debit' },
      { id: '2', date: new Date(2024, 4, 17), description: 'Salary Deposit', amount: 3500.00, type: 'credit' },
      { id: '3', date: new Date(2024, 4, 16), description: 'Electric Bill', amount: -124.55, type: 'debit' },
      { id: '4', date: new Date(2024, 4, 15), description: 'Online Transfer', amount: -200.00, type: 'debit' },
      { id: '5', date: new Date(2024, 4, 14), description: 'ATM Withdrawal', amount: -60.00, type: 'debit' }
    ];
  }
}
