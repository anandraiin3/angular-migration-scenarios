import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface PaymentRequest {
  accountNumber: string;
  amount: number;
  currency: string;
  recipientAccount: string;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedProcessingTime?: number;
}

export interface AccountBalance {
  available: number;
  pending: number;
  currency: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentValidationService {
  private readonly MIN_AMOUNT = 0.01;
  private readonly MAX_AMOUNT = 1000000;
  private readonly VALIDATION_DELAY = 500; // Simulates API call delay

  constructor() {}

  /**
   * Validates a payment request with async operations
   * Returns Observable that emits after simulated API delay
   */
  validatePayment(payment: PaymentRequest): Observable<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Synchronous validations
    if (!payment.accountNumber || payment.accountNumber.length < 8) {
      errors.push('Invalid account number format');
    }

    if (!payment.recipientAccount || payment.recipientAccount.length < 8) {
      errors.push('Invalid recipient account number');
    }

    if (payment.amount < this.MIN_AMOUNT) {
      errors.push(`Amount must be at least ${this.MIN_AMOUNT}`);
    }

    if (payment.amount > this.MAX_AMOUNT) {
      errors.push(`Amount exceeds maximum limit of ${this.MAX_AMOUNT}`);
    }

    if (!['USD', 'EUR', 'GBP'].includes(payment.currency)) {
      errors.push('Unsupported currency');
    }

    // Warnings for large amounts
    if (payment.amount > 50000) {
      warnings.push('Large transaction - additional verification may be required');
    }

    if (payment.accountNumber === payment.recipientAccount) {
      errors.push('Cannot transfer to the same account');
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedProcessingTime: this.calculateProcessingTime(payment.amount)
    };

    // Simulate async API call with delay
    return of(result).pipe(delay(this.VALIDATION_DELAY));
  }

  /**
   * Checks if account has sufficient balance for payment
   * Simulates async balance check
   */
  checkSufficientBalance(
    payment: PaymentRequest,
    accountBalance: AccountBalance
  ): Observable<boolean> {
    if (payment.currency !== accountBalance.currency) {
      return throwError(() => new Error('Currency mismatch'));
    }

    const hasSufficientFunds = accountBalance.available >= payment.amount;

    // Simulate API delay
    return of(hasSufficientFunds).pipe(delay(300));
  }

  /**
   * Validates recipient account exists and is active
   * Simulates async account lookup
   */
  validateRecipientAccount(accountNumber: string): Observable<boolean> {
    // Simulate validation logic
    const isValid = accountNumber.length >= 8 &&
                   accountNumber.length <= 12 &&
                   /^\d+$/.test(accountNumber);

    // Simulate API call delay
    return of(isValid).pipe(delay(400));
  }

  /**
   * Performs complete validation including all async checks
   */
  performCompleteValidation(
    payment: PaymentRequest,
    balance: AccountBalance
  ): Observable<ValidationResult> {
    return this.validatePayment(payment).pipe(
      map(result => {
        // Add balance check results to validation
        if (balance.available < payment.amount) {
          result.valid = false;
          result.errors.push('Insufficient funds');
        }

        if (balance.pending > 0) {
          result.warnings.push(`Pending transactions: ${balance.pending} ${balance.currency}`);
        }

        return result;
      })
    );
  }

  /**
   * Calculates estimated processing time based on amount
   */
  private calculateProcessingTime(amount: number): number {
    if (amount < 1000) {
      return 1; // 1 business day
    } else if (amount < 10000) {
      return 2; // 2 business days
    } else if (amount < 50000) {
      return 3; // 3 business days
    } else {
      return 5; // 5 business days for large amounts
    }
  }

  /**
   * Batch validation for multiple payments
   */
  validateBatch(payments: PaymentRequest[]): Observable<ValidationResult[]> {
    const validations = payments.map(payment =>
      this.validatePayment(payment)
    );

    // This will be tested with fakeAsync and tick
    return new Observable(observer => {
      const results: ValidationResult[] = [];
      let completed = 0;

      validations.forEach((validation$, index) => {
        validation$.subscribe(result => {
          results[index] = result;
          completed++;

          if (completed === payments.length) {
            observer.next(results);
            observer.complete();
          }
        });
      });
    });
  }
}
