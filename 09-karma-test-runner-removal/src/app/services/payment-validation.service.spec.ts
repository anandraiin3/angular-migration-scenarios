import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { PaymentValidationService, PaymentRequest, AccountBalance } from './payment-validation.service';

describe('PaymentValidationService', () => {
  let service: PaymentValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaymentValidationService]
    });
    service = TestBed.inject(PaymentValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validatePayment', () => {
    it('should validate a valid payment request', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100.00,
        currency: 'USD',
        recipientAccount: '87654321',
        description: 'Test payment'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      // Simulate passage of time for async validation
      tick(500);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    }));

    it('should reject payment with invalid account number', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '123',
        amount: 100.00,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid account number format');
    }));

    it('should reject payment amount below minimum', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 0.001,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be at least 0.01');
    }));

    it('should reject payment amount above maximum', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 1500000,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount exceeds maximum limit of 1000000');
    }));

    it('should warn on large transactions', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 75000,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.warnings).toContain('Large transaction - additional verification may be required');
    }));

    it('should reject unsupported currency', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100,
        currency: 'JPY',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unsupported currency');
    }));

    it('should reject transfer to same account', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100,
        currency: 'USD',
        recipientAccount: '12345678'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot transfer to the same account');
    }));

    it('should calculate correct processing time for small amounts', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 500,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.estimatedProcessingTime).toBe(1);
    }));

    it('should calculate correct processing time for large amounts', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 60000,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      let result: any;
      service.validatePayment(payment).subscribe(r => result = r);

      tick(500);

      expect(result.estimatedProcessingTime).toBe(5);
    }));
  });

  describe('checkSufficientBalance', () => {
    it('should return true when balance is sufficient', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      const balance: AccountBalance = {
        available: 500,
        pending: 0,
        currency: 'USD'
      };

      let result: any;
      service.checkSufficientBalance(payment, balance).subscribe(r => result = r);

      tick(300);

      expect(result).toBe(true);
    }));

    it('should return false when balance is insufficient', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 1000,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      const balance: AccountBalance = {
        available: 500,
        pending: 0,
        currency: 'USD'
      };

      let result: any;
      service.checkSufficientBalance(payment, balance).subscribe(r => result = r);

      tick(300);

      expect(result).toBe(false);
    }));

    it('should throw error on currency mismatch', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      const balance: AccountBalance = {
        available: 500,
        pending: 0,
        currency: 'EUR'
      };

      let error: any;
      service.checkSufficientBalance(payment, balance).subscribe({
        error: e => error = e
      });

      tick(300);

      expect(error).toBeDefined();
      expect(error.message).toContain('Currency mismatch');
    }));
  });

  describe('validateRecipientAccount', () => {
    it('should validate correct account number format', fakeAsync(() => {
      let result: any;
      service.validateRecipientAccount('12345678').subscribe(r => result = r);

      tick(400);

      expect(result).toBe(true);
    }));

    it('should reject account number too short', fakeAsync(() => {
      let result: any;
      service.validateRecipientAccount('1234').subscribe(r => result = r);

      tick(400);

      expect(result).toBe(false);
    }));

    it('should reject account number with non-digits', fakeAsync(() => {
      let result: any;
      service.validateRecipientAccount('12345ABC').subscribe(r => result = r);

      tick(400);

      expect(result).toBe(false);
    }));
  });

  describe('performCompleteValidation', () => {
    it('should perform complete validation with sufficient balance', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      const balance: AccountBalance = {
        available: 500,
        pending: 0,
        currency: 'USD'
      };

      let result: any;
      service.performCompleteValidation(payment, balance).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    }));

    it('should fail validation with insufficient balance', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 1000,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      const balance: AccountBalance = {
        available: 500,
        pending: 0,
        currency: 'USD'
      };

      let result: any;
      service.performCompleteValidation(payment, balance).subscribe(r => result = r);

      tick(500);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Insufficient funds');
    }));

    it('should warn about pending transactions', fakeAsync(() => {
      const payment: PaymentRequest = {
        accountNumber: '12345678',
        amount: 100,
        currency: 'USD',
        recipientAccount: '87654321'
      };

      const balance: AccountBalance = {
        available: 500,
        pending: 250,
        currency: 'USD'
      };

      let result: any;
      service.performCompleteValidation(payment, balance).subscribe(r => result = r);

      tick(500);

      expect(result.warnings).toContain('Pending transactions: 250 USD');
    }));
  });

  describe('validateBatch', () => {
    it('should validate multiple payments', fakeAsync(() => {
      const payments: PaymentRequest[] = [
        {
          accountNumber: '12345678',
          amount: 100,
          currency: 'USD',
          recipientAccount: '87654321'
        },
        {
          accountNumber: '12345678',
          amount: 200,
          currency: 'EUR',
          recipientAccount: '11111111'
        },
        {
          accountNumber: '12345678',
          amount: 300,
          currency: 'GBP',
          recipientAccount: '22222222'
        }
      ];

      let results: any;
      service.validateBatch(payments).subscribe(r => results = r);

      // Use flush() to complete all pending async operations
      flush();

      expect(results).toBeDefined();
      expect(results.length).toBe(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(true);
    }));

    it('should identify invalid payments in batch', fakeAsync(() => {
      const payments: PaymentRequest[] = [
        {
          accountNumber: '12345678',
          amount: 100,
          currency: 'USD',
          recipientAccount: '87654321'
        },
        {
          accountNumber: '123', // Invalid
          amount: 200,
          currency: 'USD',
          recipientAccount: '11111111'
        }
      ];

      let results: any;
      service.validateBatch(payments).subscribe(r => results = r);

      flush();

      expect(results.length).toBe(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].errors).toContain('Invalid account number format');
    }));

    it('should handle empty batch', fakeAsync(() => {
      const payments: PaymentRequest[] = [];

      let results: any;
      service.validateBatch(payments).subscribe(r => results = r);

      flush();

      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    }));
  });
});
