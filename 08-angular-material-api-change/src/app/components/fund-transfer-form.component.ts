import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * FundTransferFormComponent
 *
 * PROBLEM: Uses MatFormField with appearance="legacy" which is removed in Material 15+
 *
 * This component handles fund transfers between accounts. The form fields use the
 * "legacy" appearance which was deprecated and removed in Material 15.
 *
 * IMPACT: After upgrading to Material 15+, the form will:
 * - Show console warnings (in dev mode)
 * - Render with broken/inconsistent styling
 * - Cause customer-facing payment forms to look unprofessional
 * - Create a P1 incident due to visual degradation on critical payment page
 *
 * This is a SILENT FAILURE - the code compiles successfully but the UI is broken.
 */
@Component({
  selector: 'app-fund-transfer-form',
  template: `
    <div class="fund-transfer-container">
      <h2>Transfer Funds</h2>

      <form [formGroup]="transferForm" (ngSubmit)="onSubmit()">
        <!-- ISSUE: appearance="legacy" removed in Material 15+ -->
        <mat-form-field appearance="legacy">
          <mat-label>From Account</mat-label>
          <mat-select formControlName="fromAccount" required>
            <mat-option value="checking">Checking Account (...4532)</mat-option>
            <mat-option value="savings">Savings Account (...7891)</mat-option>
            <mat-option value="business">Business Account (...2341)</mat-option>
          </mat-select>
          <mat-error *ngIf="transferForm.get('fromAccount')?.hasError('required')">
            Please select a source account
          </mat-error>
        </mat-form-field>

        <!-- ISSUE: appearance="legacy" removed in Material 15+ -->
        <mat-form-field appearance="legacy">
          <mat-label>To Account</mat-label>
          <mat-select formControlName="toAccount" required>
            <mat-option value="checking">Checking Account (...4532)</mat-option>
            <mat-option value="savings">Savings Account (...7891)</mat-option>
            <mat-option value="business">Business Account (...2341)</mat-option>
          </mat-select>
          <mat-error *ngIf="transferForm.get('toAccount')?.hasError('required')">
            Please select a destination account
          </mat-error>
        </mat-form-field>

        <!-- ISSUE: appearance="legacy" removed in Material 15+ -->
        <mat-form-field appearance="legacy">
          <mat-label>Amount</mat-label>
          <input
            matInput
            type="number"
            formControlName="amount"
            placeholder="0.00"
            required>
          <span matPrefix>$&nbsp;</span>
          <mat-error *ngIf="transferForm.get('amount')?.hasError('required')">
            Amount is required
          </mat-error>
          <mat-error *ngIf="transferForm.get('amount')?.hasError('min')">
            Amount must be greater than $0
          </mat-error>
          <mat-error *ngIf="transferForm.get('amount')?.hasError('max')">
            Amount cannot exceed $10,000
          </mat-error>
        </mat-form-field>

        <!-- ISSUE: appearance="legacy" removed in Material 15+ -->
        <mat-form-field appearance="legacy">
          <mat-label>Transfer Date</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="transferDate"
            required>
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error *ngIf="transferForm.get('transferDate')?.hasError('required')">
            Transfer date is required
          </mat-error>
        </mat-form-field>

        <!-- ISSUE: appearance="legacy" removed in Material 15+ -->
        <mat-form-field appearance="legacy">
          <mat-label>Memo (Optional)</mat-label>
          <textarea
            matInput
            formControlName="memo"
            rows="3"
            placeholder="Add a note about this transfer"></textarea>
        </mat-form-field>

        <div class="form-actions">
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="!transferForm.valid || isSubmitting">
            {{ isSubmitting ? 'Processing...' : 'Transfer Funds' }}
          </button>
          <button
            mat-button
            type="button"
            (click)="onCancel()">
            Cancel
          </button>
        </div>
      </form>

      <div class="form-info">
        <mat-icon>info</mat-icon>
        <p>Transfers are processed immediately for accounts at the same institution.</p>
      </div>
    </div>
  `,
  styles: [`
    .fund-transfer-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    mat-form-field {
      width: 100%;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .form-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 2rem;
      padding: 1rem;
      background-color: #e3f2fd;
      border-radius: 4px;
    }

    .form-info mat-icon {
      color: #1976d2;
    }

    .form-info p {
      margin: 0;
      font-size: 0.875rem;
      color: #424242;
    }
  `]
})
export class FundTransferFormComponent implements OnInit {
  transferForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.transferForm = this.fb.group({
      fromAccount: ['', Validators.required],
      toAccount: ['', Validators.required],
      amount: ['', [
        Validators.required,
        Validators.min(0.01),
        Validators.max(10000)
      ]],
      transferDate: [new Date(), Validators.required],
      memo: ['']
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  onSubmit(): void {
    if (this.transferForm.valid) {
      this.isSubmitting = true;

      // Simulate API call
      setTimeout(() => {
        console.log('Transfer submitted:', this.transferForm.value);
        this.snackBar.open('Transfer completed successfully!', 'Close', {
          duration: 3000
        });
        this.isSubmitting = false;
        this.transferForm.reset();
      }, 1500);
    }
  }

  onCancel(): void {
    this.transferForm.reset();
  }
}
