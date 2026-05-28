import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
import { FundTransferComponent } from './fund-transfer.component';
import { PaymentService, PaymentRequest, PaymentResponse, PaymentError } from '../services/payment.service';

/**
 * Error-path integration tests for FundTransferComponent.
 *
 * Added as part of the Angular 14→20 Migration (Playbook Phase 3, Step 12).
 * These tests verify that payment error handlers fire correctly and that
 * user-facing error messages are displayed for every failure scenario.
 *
 * These tests MUST pass both before and after the three-argument subscribe()
 * conversion to object syntax (Playbook Step 11).
 */
describe('FundTransferComponent', () => {
  let component: FundTransferComponent;
  let fixture: ComponentFixture<FundTransferComponent>;
  let paymentService: jasmine.SpyObj<PaymentService>;

  const validRequest: PaymentRequest = {
    fromAccount: 'checking-4521',
    toAccount: '123456789',
    amount: 100,
    memo: 'Test transfer'
  };

  const successResponse: PaymentResponse = {
    transactionId: 'TXN_123',
    status: 'success',
    timestamp: new Date(),
    confirmationNumber: 'CONF-ABC123'
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('PaymentService', ['submitPayment']);

    await TestBed.configureTestingModule({
      declarations: [FundTransferComponent],
      imports: [FormsModule],
      providers: [{ provide: PaymentService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(FundTransferComponent);
    component = fixture.componentInstance;
    paymentService = TestBed.inject(PaymentService) as jasmine.SpyObj<PaymentService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form correctly', () => {
    expect(component.isFormValid()).toBeFalse();

    component.request = { ...validRequest };
    expect(component.isFormValid()).toBeTrue();
  });

  // --- Success path ---

  it('should handle successful payment', () => {
    paymentService.submitPayment.and.returnValue(of(successResponse));
    component.request = { ...validRequest };

    component.submitTransfer();

    expect(component.isProcessing).toBeFalse();
    expect(component.successMessage).toContain('$100');
    expect(component.confirmationNumber).toBe('CONF-ABC123');
    expect(component.errorMessage).toBeNull();
  });

  // --- Error path tests (P0 — required by Playbook Step 12) ---

  it('should display error message on INSUFFICIENT_FUNDS', () => {
    const error: PaymentError = {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds in source account',
      details: 'Available balance is less than $100'
    };
    paymentService.submitPayment.and.returnValue(throwError(() => error));
    component.request = { ...validRequest };

    component.submitTransfer();

    expect(component.isProcessing).toBeFalse();
    expect(component.errorCode).toBe('INSUFFICIENT_FUNDS');
    expect(component.errorMessage).toBe('Insufficient funds in source account');
    expect(component.errorDetails).toBe('Available balance is less than $100');
    expect(component.successMessage).toBeNull();
  });

  it('should display error message on INVALID_ACCOUNT', () => {
    const error: PaymentError = {
      code: 'INVALID_ACCOUNT',
      message: 'Destination account number is invalid',
      details: 'Please verify the account number and try again'
    };
    paymentService.submitPayment.and.returnValue(throwError(() => error));
    component.request = { ...validRequest };

    component.submitTransfer();

    expect(component.isProcessing).toBeFalse();
    expect(component.errorCode).toBe('INVALID_ACCOUNT');
    expect(component.errorMessage).toBe('Destination account number is invalid');
    expect(component.errorDetails).toBe('Please verify the account number and try again');
  });

  it('should display error message on LIMIT_EXCEEDED', () => {
    const error: PaymentError = {
      code: 'LIMIT_EXCEEDED',
      message: 'Daily transfer limit exceeded',
      details: 'Maximum daily transfer limit is $10,000'
    };
    paymentService.submitPayment.and.returnValue(throwError(() => error));
    component.request = { ...validRequest };

    component.submitTransfer();

    expect(component.isProcessing).toBeFalse();
    expect(component.errorCode).toBe('LIMIT_EXCEEDED');
    expect(component.errorMessage).toBe('Daily transfer limit exceeded');
    expect(component.errorDetails).toBe('Maximum daily transfer limit is $10,000');
  });

  it('should set isProcessing to false on error', () => {
    const error: PaymentError = {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds',
    };
    paymentService.submitPayment.and.returnValue(throwError(() => error));
    component.request = { ...validRequest };

    component.submitTransfer();

    expect(component.isProcessing).toBeFalse();
  });

  it('should provide default error details when none are given', () => {
    const error: PaymentError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    };
    paymentService.submitPayment.and.returnValue(throwError(() => error));
    component.request = { ...validRequest };

    component.submitTransfer();

    expect(component.errorDetails).toBe('Please try again or contact customer support.');
  });

  it('should clear previous success message when an error occurs', () => {
    // First: successful payment
    paymentService.submitPayment.and.returnValue(of(successResponse));
    component.request = { ...validRequest };
    component.submitTransfer();
    expect(component.successMessage).toBeTruthy();

    // Second: failed payment
    const error: PaymentError = {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds',
    };
    paymentService.submitPayment.and.returnValue(throwError(() => error));
    component.request = { ...validRequest };
    component.submitTransfer();

    expect(component.successMessage).toBeNull();
    expect(component.errorMessage).toBe('Insufficient funds');
  });

  // --- Form reset ---

  it('should reset all state when resetForm is called', () => {
    component.errorMessage = 'Some error';
    component.errorCode = 'ERR';
    component.errorDetails = 'Details';
    component.successMessage = 'Success';
    component.confirmationNumber = 'CONF-XYZ';
    component.isProcessing = true;

    component.resetForm();

    expect(component.errorMessage).toBeNull();
    expect(component.errorCode).toBeNull();
    expect(component.errorDetails).toBeNull();
    expect(component.successMessage).toBeNull();
    expect(component.confirmationNumber).toBeNull();
    expect(component.isProcessing).toBeFalse();
    expect(component.request.fromAccount).toBe('');
    expect(component.request.amount).toBe(0);
  });

  // --- Guard: form validation prevents submission ---

  it('should not submit when form is invalid', () => {
    component.request = { fromAccount: '', toAccount: '', amount: 0 };

    component.submitTransfer();

    expect(paymentService.submitPayment).not.toHaveBeenCalled();
    expect(component.isProcessing).toBeFalse();
  });
});
