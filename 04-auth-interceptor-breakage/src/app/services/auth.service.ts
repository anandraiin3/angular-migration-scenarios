import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * AuthService - Manages authentication state and tokens
 *
 * This service is responsible for:
 * - Storing SSO tokens received from the authentication provider
 * - Providing access to current authentication tokens
 * - Managing MFA (Multi-Factor Authentication) tokens for sensitive operations
 * - Handling token refresh flows
 *
 * SECURITY CRITICAL: This service is used by interceptors to inject
 * authentication headers on all API calls. Any failure in token management
 * will result in unauthenticated API requests.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private mfaTokenSubject = new BehaviorSubject<string | null>(null);
  private refreshingSubject = new BehaviorSubject<boolean>(false);

  public token$ = this.tokenSubject.asObservable();
  public mfaToken$ = this.mfaTokenSubject.asObservable();

  constructor() {
    // On initialization, try to restore token from sessionStorage
    const storedToken = sessionStorage.getItem('sso_token');
    if (storedToken) {
      this.tokenSubject.next(storedToken);
    }
  }

  /**
   * Get the current SSO authentication token
   * Used by SsoTokenInterceptor to inject Authorization header
   *
   * @returns Current SSO token or null if not authenticated
   */
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Set the SSO authentication token
   * Called after successful login or token refresh
   *
   * @param token - The SSO token from authentication provider
   */
  setToken(token: string): void {
    this.tokenSubject.next(token);
    sessionStorage.setItem('sso_token', token);
  }

  /**
   * Clear the current authentication token
   * Called on logout or when token is invalid
   */
  clearToken(): void {
    this.tokenSubject.next(null);
    sessionStorage.removeItem('sso_token');
  }

  /**
   * Get the current MFA token
   * Used by MfaInterceptor to inject X-MFA-Token header for sensitive operations
   *
   * @returns Current MFA token or null if MFA not completed
   */
  getMfaToken(): string | null {
    return this.mfaTokenSubject.value;
  }

  /**
   * Set the MFA token
   * Called after successful MFA verification
   *
   * @param token - The MFA token
   */
  setMfaToken(token: string): void {
    this.mfaTokenSubject.next(token);
    sessionStorage.setItem('mfa_token', token);
  }

  /**
   * Clear the MFA token
   * Called when MFA session expires or on logout
   */
  clearMfaToken(): void {
    this.mfaTokenSubject.next(null);
    sessionStorage.removeItem('mfa_token');
  }

  /**
   * Check if a token refresh is currently in progress
   * Used to prevent multiple simultaneous refresh attempts
   *
   * @returns True if refresh is in progress
   */
  isRefreshing(): boolean {
    return this.refreshingSubject.value;
  }

  /**
   * Set the refreshing state
   * Internal use for token refresh flow coordination
   */
  setRefreshing(refreshing: boolean): void {
    this.refreshingSubject.next(refreshing);
  }

  /**
   * Perform token refresh
   * Called when API returns 401 and current token is expired
   *
   * @returns Observable of the new token
   */
  refreshToken(): Observable<string> {
    // In real implementation, this would call the SSO provider
    // For this demo, we just simulate the refresh
    return new Observable(observer => {
      this.setRefreshing(true);

      // Simulate API call to refresh endpoint
      setTimeout(() => {
        const newToken = 'refreshed-token-' + Date.now();
        this.setToken(newToken);
        this.setRefreshing(false);
        observer.next(newToken);
        observer.complete();
      }, 1000);
    });
  }

  /**
   * Check if user is currently authenticated
   * @returns True if valid token exists
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Logout user and clear all tokens
   */
  logout(): void {
    this.clearToken();
    this.clearMfaToken();
  }
}
