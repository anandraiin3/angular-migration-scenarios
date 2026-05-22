import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Payment {
  amount: number;
  currency: string;
  accountNumber: string;
  routingNumber: string;
  description: string;
}

export interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  confirmationCode?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentGatewayService {
  // HARDCODED API KEY - Added during Sprint 23 for quick testing
  // TODO: Move to environment config (never happened)
  private readonly GATEWAY_API_KEY = 'pgw_live_DEMO_4f8a2c1b3d5e6789abcdef0123456789'; // DEMO_VALUE_DO_NOT_USE
  private readonly GATEWAY_URL = 'https://payments.internal.firstnationalbank.com/v2/process';
  private readonly GATEWAY_WEBHOOK_SECRET = 'whsec_DEMO_8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d'; // DEMO_VALUE_DO_NOT_USE

  constructor(private http: HttpClient) {}

  /**
   * Submit a payment to the gateway for processing
   * @param payment Payment details
   * @returns Observable of payment result
   */
  submitPayment(payment: Payment): Observable<PaymentResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': this.GATEWAY_API_KEY, // Using hardcoded key
      'X-Client-Version': '14.2.0'
    });

    return this.http.post<PaymentResult>(this.GATEWAY_URL, payment, { headers })
      .pipe(
        map(result => ({
          ...result,
          timestamp: new Date().toISOString()
        })),
        catchError(error => {
          console.error('Payment gateway error:', error);
          throw error;
        })
      );
  }

  /**
   * Verify webhook signature from payment gateway
   * Used for processing async payment notifications
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Simple verification using hardcoded webhook secret
    // In production this should use HMAC with vault-managed secret
    const expectedSignature = this.computeHmacSha256(payload, this.GATEWAY_WEBHOOK_SECRET);
    return signature === expectedSignature;
  }

  private computeHmacSha256(data: string, secret: string): string {
    // Simplified HMAC computation for demo
    return btoa(`${secret}:${data}`).substring(0, 64);
  }

  /**
   * Get payment status by transaction ID
   */
  getPaymentStatus(transactionId: string): Observable<PaymentResult> {
    const headers = new HttpHeaders({
      'X-API-Key': this.GATEWAY_API_KEY // Using hardcoded key again
    });

    return this.http.get<PaymentResult>(
      `${this.GATEWAY_URL}/${transactionId}`,
      { headers }
    );
  }
}
