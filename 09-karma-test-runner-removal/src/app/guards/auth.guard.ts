import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface UserSession {
  userId: string;
  username: string;
  roles: string[];
  sessionToken: string;
  expiresAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private currentSession: UserSession | null = null;
  private readonly SESSION_CHECK_DELAY = 200; // Simulates API call

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuthentication(route, state);
  }

  /**
   * Checks if user is authenticated
   * Returns Observable that simulates async session validation
   */
  private checkAuthentication(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.validateSession().pipe(
      map(isValid => {
        if (!isValid) {
          // Store the attempted URL for redirecting after login
          return this.router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // Check if route requires specific roles
        const requiredRoles = route.data['roles'] as string[];
        if (requiredRoles && !this.hasRequiredRoles(requiredRoles)) {
          return this.router.createUrlTree(['/unauthorized']);
        }

        return true;
      })
    );
  }

  /**
   * Validates the current session
   * Simulates async API call to validate session token
   */
  private validateSession(): Observable<boolean> {
    // If no session exists, return false
    if (!this.currentSession) {
      return of(false).pipe(delay(this.SESSION_CHECK_DELAY));
    }

    // Check if session has expired
    const now = new Date();
    const isExpired = this.currentSession.expiresAt < now;

    if (isExpired) {
      this.clearSession();
      return of(false).pipe(delay(this.SESSION_CHECK_DELAY));
    }

    // Simulate API call to validate session token
    return of(true).pipe(delay(this.SESSION_CHECK_DELAY));
  }

  /**
   * Checks if user has required roles
   */
  private hasRequiredRoles(requiredRoles: string[]): boolean {
    if (!this.currentSession) {
      return false;
    }

    return requiredRoles.every(role =>
      this.currentSession!.roles.includes(role)
    );
  }

  /**
   * Sets the current user session
   * Used for testing and after successful login
   */
  setSession(session: UserSession): void {
    this.currentSession = session;
  }

  /**
   * Clears the current session
   */
  clearSession(): void {
    this.currentSession = null;
  }

  /**
   * Gets the current session
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Checks if user is authenticated (synchronous)
   */
  isAuthenticated(): boolean {
    if (!this.currentSession) {
      return false;
    }

    const now = new Date();
    return this.currentSession.expiresAt > now;
  }

  /**
   * Extends the current session
   * Simulates API call to extend session
   */
  extendSession(hours: number = 1): Observable<boolean> {
    if (!this.currentSession) {
      return of(false).pipe(delay(this.SESSION_CHECK_DELAY));
    }

    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + hours);
    this.currentSession.expiresAt = newExpiry;

    return of(true).pipe(delay(this.SESSION_CHECK_DELAY));
  }

  /**
   * Checks if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    if (!this.currentSession) {
      return false;
    }

    return roles.some(role => this.currentSession!.roles.includes(role));
  }

  /**
   * Checks if user has a specific permission
   * Simulates async permission check
   */
  hasPermission(permission: string): Observable<boolean> {
    if (!this.currentSession) {
      return of(false).pipe(delay(this.SESSION_CHECK_DELAY));
    }

    // Simulate permission check based on roles
    const permissionMap: { [key: string]: string[] } = {
      'view_transactions': ['user', 'admin'],
      'create_transaction': ['user', 'admin'],
      'approve_transaction': ['admin', 'approver'],
      'view_reports': ['admin', 'auditor'],
      'manage_users': ['admin']
    };

    const allowedRoles = permissionMap[permission] || [];
    const hasPermission = this.hasAnyRole(allowedRoles);

    return of(hasPermission).pipe(delay(this.SESSION_CHECK_DELAY));
  }
}
