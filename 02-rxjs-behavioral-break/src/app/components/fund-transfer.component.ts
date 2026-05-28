import { Component } from '@angular/core';
import { PaymentService, PaymentRequest, PaymentResponse, PaymentError } from '../services/payment.service';

/**
 * FundTransferComponent - DEMONSTRATES THE BREAKING PATTERN
 *
 * THIS IS THE CRITICAL CODE:
 * Lines 45-49 use the three-argument subscribe() pattern.
 *
 * In Angular 14 (RxJS 7): This works perfectly.
 * In Angular 20 (RxJS 8): The error handler is SILENTLY IGNORED.
 *
 * When a payment fails:
 * - RxJS 7: handlePaymentError() is called, user sees error message
 * - RxJS 8: handlePaymentError() is NEVER called, loading spinner never stops
 *
 * The code compiles with no errors. Tests pass (if they don't test error paths).
 * But production error handling is completely broken.
 */
@Component({
  selector: 'app-fund-transfer',
  template: `
    <div class="fund-transfer">
      <h2>Fund Transfer</h2>

      <form *ngIf="!isProcessing && !successMessage" (ngSubmit)="submitTransfer()">
        <div class="form-group">
          <label>From Account:</label>
          <select [(ngModel)]="request.fromAccount" name="fromAccount" required>
            <option value="">Select Account</option>
            <option value="checking-4521">Checking ****-4521 ($12,487.32)</option>
            <option value="savings-7832">Savings ****-7832 ($45,203.18)</option>
          </select>
        </div>

        <div class="form-group">
          <label>To Account Number:</label>
          <input type="text" [(ngModel)]="request.toAccount" name="toAccount" placeholder="Enter account number" required />
        </div>

        <div class="form-group">
          <label>Amount:</label>
          <input type="number" [(ngModel)]="request.amount" name="amount" step="0.01" min="0.01" required />
        </div>

        <div class="form-group">
          <label>Memo (optional):</label>
          <input type="text" [(ngModel)]="request.memo" name="memo" placeholder="Payment description" />
        </div>

        <button type="submit" [disabled]="!isFormValid()">Submit Transfer</button>
      </form>

      <div *ngIf="isProcessing" class="processing">
        <div class="spinner"></div>
        <p>Processing your transfer...</p>
      </div>

      <!-- THIS ERROR MESSAGE WILL NEVER APPEAR IN ANGULAR 20 -->
      <div *ngIf="errorMessage" class="error-message">
        <h3>⚠️ Payment Failed</h3>
        <p><strong>{{ errorCode }}</strong></p>
        <p>{{ errorMessage }}</p>
        <p class="error-details">{{ errorDetails }}</p>
        <button (click)="resetForm()">Try Again</button>
      </div>

      <div *ngIf="successMessage" class="success-message">
        <h3>✓ Transfer Successful</h3>
        <p>{{ successMessage }}</p>
        <p class="confirmation">Confirmation: {{ confirmationNumber }}</p>
        <button (click)="resetForm()">Make Another Transfer</button>
      </div>

      <div class="warning-box">
        <p><strong>⚠️ RxJS 7 Deprecated Pattern Warning:</strong></p>
        <p>This component uses the three-argument subscribe() pattern (lines 87-91 in the TypeScript file).
           This works in Angular 14 but will SILENTLY FAIL in Angular 20.</p>
        <p><strong>Try it:</strong> Submit a transfer multiple times. You'll see some fail with error messages.
           After migration to Angular 20, those error messages will never appear - the loading spinner will just spin forever.</p>
      </div>
    </div>
  `,
  styles: [`
    .fund-transfer { max-width: 600px; margin: 0 auto; padding: 20px; }
    h2 { color: #1976d2; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    button { background: #1976d2; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    button:hover:not(:disabled) { background: #1565c0; }
    .processing { text-align: center; padding: 40px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1976d2; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-message { background: #ffebee; border-left: 4px solid #d32f2f; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .error-message h3 { color: #d32f2f; margin-top: 0; }
    .error-details { color: #666; font-size: 14px; }
    .success-message { background: #e8f5e9; border-left: 4px solid #388e3c; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .success-message h3 { color: #388e3c; margin-top: 0; }
    .confirmation { font-family: monospace; font-size: 14px; color: #666; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 30px; border-radius: 4px; }
    .warning-box strong { color: #856404; }
    .warning-box p { margin: 5px 0; font-size: 14px; }
  `]
})
export class FundTransferComponent {
  request: PaymentRequest = {
    fromAccount: '',
    toAccount: '',
    amount: 0,
    memo: ''
  };

  isProcessing = false;
  errorMessage: string | null = null;
  errorCode: string | null = null;
  errorDetails: string | null = null;
  successMessage: string | null = null;
  confirmationNumber: string | null = null;

  constructor(private paymentService: PaymentService) {}

  isFormValid(): boolean {
    return !!(this.request.fromAccount && this.request.toAccount && this.request.amount > 0);
  }

  submitTransfer(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Migrated from three-argument subscribe(next, error, complete) to object
    // syntax for RxJS 8 compatibility. The error handler (handlePaymentError)
    // must continue to fire on payment failures to display user-facing error
    // messages (INSUFFICIENT_FUNDS, INVALID_ACCOUNT, LIMIT_EXCEEDED).
    // See: Playbook Step 11 — manual RxJS migration, human-reviewed.
    this.paymentService.submitPayment(this.request).subscribe({
      next: (result) => this.handleSuccess(result),
      error: (error) => this.handlePaymentError(error),
      complete: () => this.finalize()
    });
  }

  private handleSuccess(result: PaymentResponse): void {
    console.log('[FundTransferComponent] Payment successful:', result);
    this.isProcessing = false;
    this.successMessage = `Transfer of $${this.request.amount} completed successfully!`;
    this.confirmationNumber = result.confirmationNumber;
  }

  private handlePaymentError(error: PaymentError): void {
    console.error('[FundTransferComponent] Payment error:', error);
    this.isProcessing = false;
    this.errorCode = error.code;
    this.errorMessage = error.message;
    this.errorDetails = error.details || 'Please try again or contact customer support.';
  }

  private finalize(): void {
    console.log('[FundTransferComponent] Payment processing finalized');
  }

  resetForm(): void {
    this.request = {
      fromAccount: '',
      toAccount: '',
      amount: 0,
      memo: ''
    };
    this.errorMessage = null;
    this.successMessage = null;
    this.isProcessing = false;
  }
}
