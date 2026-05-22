import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * MfaInterceptor - Injects MFA tokens for sensitive banking operations
 *
 * THIS IS AN AUTH-CRITICAL FILE (Playbook Rule 7.1)
 *
 * This interceptor is responsible for:
 * 1. Detecting requests to sensitive endpoints (transfers, bill pay, account settings)
 * 2. Injecting X-MFA-Token header when MFA token is available
 * 3. Ensuring MFA-protected operations cannot proceed without MFA verification
 *
 * SENSITIVE ROUTES REQUIRING MFA:
 * - /api/transfers/** - All money transfer operations
 * - /api/billpay/** - Bill payment operations
 * - /api/settings/** - Account settings changes
 * - /api/beneficiaries/** - Adding/modifying beneficiaries
 * - /api/limits/** - Changing transaction limits
 *
 * CRITICAL SECURITY REQUIREMENT:
 * - This interceptor MUST be registered in the Angular DI system
 * - Without this interceptor, sensitive operations will reach the backend without MFA tokens
 * - Backend MUST validate MFA tokens for these routes (defense in depth)
 * - Frontend MFA check is UX optimization but NOT a security control
 *
 * ANGULAR 14 REGISTRATION (NgModule):
 * - Registered via HTTP_INTERCEPTORS multi-provider token in AppModule
 * - Should be registered AFTER SsoTokenInterceptor so both headers are present
 * - Example: { provide: HTTP_INTERCEPTORS, useClass: MfaInterceptor, multi: true }
 *
 * ANGULAR 15+ REGISTRATION (Standalone):
 * - Option A: Use provideHttpClient(withInterceptorsFromDi()) + HTTP_INTERCEPTORS provider
 * - Option B: Convert to functional interceptor and use provideHttpClient(withInterceptors([...]))
 *
 * KNOWN MIGRATION RISK:
 * If app is migrated to standalone components without updating the interceptor
 * registration pattern, this interceptor will be silently ignored. Sensitive operations
 * will reach the backend without MFA tokens, potentially bypassing frontend MFA checks.
 */
@Injectable()
export class MfaInterceptor implements HttpInterceptor {

  /**
   * List of URL patterns that require MFA verification
   * These are high-risk operations that require step-up authentication
   */
  private readonly MFA_REQUIRED_PATTERNS = [
    '/api/transfers',
    '/api/billpay',
    '/api/settings',
    '/api/beneficiaries',
    '/api/limits',
    '/api/wires',
    '/api/external-accounts'
  ];

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Check if this request requires MFA
    if (this.requiresMfa(request.url)) {
      const mfaToken = this.authService.getMfaToken();

      if (mfaToken) {
        // Clone request and add X-MFA-Token header
        request = request.clone({
          setHeaders: {
            'X-MFA-Token': mfaToken
          }
        });
      } else {
        // No MFA token available for MFA-required route
        // The backend will reject this with 403 Forbidden
        // Frontend should have prompted for MFA before making this call
        console.warn(
          `[MfaInterceptor] Request to MFA-protected endpoint without MFA token: ${request.url}`
        );
      }
    }

    return next.handle(request);
  }

  /**
   * Check if the request URL requires MFA verification
   * @param url - Request URL to check
   * @returns True if URL matches any MFA-required pattern
   */
  private requiresMfa(url: string): boolean {
    return this.MFA_REQUIRED_PATTERNS.some(pattern => url.includes(pattern));
  }
}
