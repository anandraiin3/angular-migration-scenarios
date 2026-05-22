import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * SsoTokenInterceptor - Injects SSO authentication tokens into HTTP requests
 *
 * THIS IS AN AUTH-CRITICAL FILE (Playbook Rule 7.1)
 *
 * This interceptor is responsible for:
 * 1. Injecting the Authorization header with Bearer token on ALL outgoing HTTP requests
 * 2. Handling 401 Unauthorized responses by attempting token refresh
 * 3. Retrying failed requests after successful token refresh
 *
 * CRITICAL SECURITY REQUIREMENT:
 * - This interceptor MUST be registered in the Angular DI system
 * - Without this interceptor, ALL API calls will be unauthenticated
 * - Bank API gateway will reject unauthenticated requests with 401
 *
 * ANGULAR 14 REGISTRATION (NgModule):
 * - Registered via HTTP_INTERCEPTORS multi-provider token in AppModule
 * - Example: { provide: HTTP_INTERCEPTORS, useClass: SsoTokenInterceptor, multi: true }
 *
 * ANGULAR 15+ REGISTRATION (Standalone):
 * - Option A: Use provideHttpClient(withInterceptorsFromDi()) + HTTP_INTERCEPTORS provider
 * - Option B: Convert to functional interceptor and use provideHttpClient(withInterceptors([...]))
 *
 * KNOWN MIGRATION RISK:
 * If app is migrated to standalone components without updating the interceptor
 * registration pattern, this interceptor will be silently ignored. The code will
 * compile, unit tests will pass, but production API calls will fail authentication.
 */
@Injectable()
export class SsoTokenInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Clone request and add Authorization header if token exists
    const token = this.authService.getToken();

    if (token) {
      request = this.addAuthHeader(request, token);
    }

    // Handle the request and catch 401 errors for token refresh
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && token) {
          // Token might be expired, attempt refresh
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Add Authorization header to request
   * @param request - Original HTTP request
   * @param token - SSO token to inject
   * @returns Cloned request with Authorization header
   */
  private addAuthHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  /**
   * Handle 401 Unauthorized error by attempting token refresh
   * @param request - Failed request
   * @param next - HTTP handler
   * @returns Observable of retried request or error
   */
  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Prevent multiple simultaneous refresh attempts
    if (this.authService.isRefreshing()) {
      // Wait for refresh to complete, then retry with new token
      return this.authService.token$.pipe(
        switchMap(token => {
          if (token) {
            return next.handle(this.addAuthHeader(request, token));
          }
          return throwError(() => new Error('Token refresh failed'));
        })
      );
    }

    // Attempt token refresh
    return this.authService.refreshToken().pipe(
      switchMap(newToken => {
        // Retry original request with new token
        return next.handle(this.addAuthHeader(request, newToken));
      }),
      catchError(error => {
        // Refresh failed, clear token and redirect to login
        this.authService.logout();
        return throwError(() => error);
      })
    );
  }
}
