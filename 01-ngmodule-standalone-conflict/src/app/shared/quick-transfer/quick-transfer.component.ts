import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-quick-transfer',
  template: `
    <div class="quick-transfer">
      <h3>Quick Transfer</h3>
      <p class="instance-id"><small>AuthService Instance: {{ authInstanceId }}</small></p>
      <div *ngIf="!isAuthenticated()" class="auth-warning">
        <p>⚠️ Please log in to make transfers</p>
      </div>
      <form *ngIf="isAuthenticated()" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>To Account:</label>
          <select [(ngModel)]="toAccount" name="toAccount">
            <option value="">Select Account</option>
            <option value="checking">Checking ****-4521</option>
            <option value="savings">Savings ****-7832</option>
          </select>
        </div>
        <div class="form-group">
          <label>Amount:</label>
          <input type="number" [(ngModel)]="amount" name="amount" step="0.01" min="0" />
        </div>
        <button type="submit" [disabled]="!toAccount || !amount">Transfer</button>
      </form>
    </div>
  `,
  styles: [`
    .quick-transfer { padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .instance-id { color: #666; font-family: monospace; margin-bottom: 10px; }
    .auth-warning { background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    select, input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    button { background: #1976d2; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    button:hover:not(:disabled) { background: #1565c0; }
  `]
})
export class QuickTransferComponent {
  toAccount = '';
  amount: number | null = null;
  authInstanceId: string;

  constructor(private authService: AuthService) {
    this.authInstanceId = authService.instanceId;
    console.log('[QuickTransferComponent] Using AuthService instance:', this.authInstanceId);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  onSubmit(): void {
    if (!this.isAuthenticated()) {
      alert('Session expired. Please log in again.');
      return;
    }

    const session = this.authService.getCurrentSession();
    console.log(`[QuickTransferComponent] Transfer initiated by ${session?.username}: $${this.amount} to ${this.toAccount}`);
    alert(`Transfer of $${this.amount} initiated successfully!`);

    // Reset form
    this.toAccount = '';
    this.amount = null;
  }
}
