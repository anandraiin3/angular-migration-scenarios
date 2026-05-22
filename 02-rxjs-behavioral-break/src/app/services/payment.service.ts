import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface PaymentRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  memo?: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: Date;
  confirmationNumber: string;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: string;
}

/**
 * PaymentService - DEMONSTRATES THE RXJS 7 DEPRECATED PATTERN
 *
 * THIS CODE USES THE THREE-ARGUMENT subscribe() PATTERN:
 *   observable.subscribe(nextFn, errorFn, completeFn)
 *
 * This pattern is DEPRECATED in RxJS 7 and REMOVED in RxJS 8.
 *
 * In RxJS 8 (Angular 20), the three-argument overload no longer exists.
 * TypeScript will match the single-argument overload instead, treating
 * the second argument (errorFn) as part of the observable sequence,
 * effectively IGNORING the error handler.
 *
 * This means errors are silently swallowed - the code compiles, tests
 * pass (if they don't test error paths), but production error handling
 * is completely broken.
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly API_BASE = 'https://api.internal.bank'; // DEMO_VALUE_DO_NOT_USE

  constructor(private http: HttpClient) {}

  /**
   * Submit a payment - uses deprecated three-argument subscribe pattern
   * in the component that calls this
   */
  submitPayment(request: PaymentRequest): Observable<PaymentResponse> {
    // Simulate payment processing with potential failures
    return new Observable<PaymentResponse>(observer => {
      setTimeout(() => {
        // Simulate different failure scenarios
        const random = Math.random();

        if (random < 0.15) {
          // 15% chance: insufficient funds
          observer.error({
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds in source account',
            details: `Available balance is less than $${request.amount}`
          } as PaymentError);
        } else if (random < 0.25) {
          // 10% chance: invalid account
          observer.error({
            code: 'INVALID_ACCOUNT',
            message: 'Destination account number is invalid',
            details: 'Please verify the account number and try again'
          } as PaymentError);
        } else if (random < 0.30) {
          // 5% chance: daily limit exceeded
          observer.error({
            code: 'LIMIT_EXCEEDED',
            message: 'Daily transfer limit exceeded',
            details: 'Maximum daily transfer limit is $10,000'
          } as PaymentError);
        } else {
          // 70% chance: success
          observer.next({
            transactionId: `TXN_${Date.now()}`,
            status: 'success',
            timestamp: new Date(),
            confirmationNumber: `CONF-${Math.random().toString(36).substring(7).toUpperCase()}`
          });
          observer.complete();
        }
      }, 1500); // Simulate network delay
    });
  }

  /**
   * Mock HTTP call that can fail - for testing purposes
   */
  mockHttpPayment(request: PaymentRequest): Observable<PaymentResponse> {
    // This simulates an actual HTTP call pattern
    if (request.amount > 10000) {
      return throwError(() => ({
        code: 'LIMIT_EXCEEDED',
        message: 'Amount exceeds maximum limit',
        details: 'Maximum transfer amount is $10,000'
      } as PaymentError));
    }

    return of({
      transactionId: `TXN_${Date.now()}`,
      status: 'success',
      timestamp: new Date(),
      confirmationNumber: `CONF-${Math.random().toString(36).substring(7).toUpperCase()}`
    } as PaymentResponse).pipe(delay(1000));
  }
}
