import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthGuard, UserSession } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let router: Router;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({} as UrlTree)
    };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: mockRouter }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    guard.clearSession();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('Session Management', () => {
    it('should set and get session', () => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      };

      guard.setSession(session);

      expect(guard.getCurrentSession()).toEqual(session);
    });

    it('should clear session', () => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);
      expect(guard.getCurrentSession()).toBeTruthy();

      guard.clearSession();
      expect(guard.getCurrentSession()).toBeNull();
    });

    it('should check if user is authenticated with valid session', () => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      expect(guard.isAuthenticated()).toBe(true);
    });

    it('should return false for expired session', () => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() - 1000) // Expired
      };

      guard.setSession(session);

      expect(guard.isAuthenticated()).toBe(false);
    });

    it('should return false when no session exists', () => {
      expect(guard.isAuthenticated()).toBe(false);
    });
  });

  describe('canActivate', () => {
    let mockRoute: ActivatedRouteSnapshot;
    let mockState: RouterStateSnapshot;

    beforeEach(() => {
      mockRoute = {
        data: {}
      } as ActivatedRouteSnapshot;

      mockState = {
        url: '/protected-route'
      } as RouterStateSnapshot;
    });

    it('should allow access with valid session', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      tick(200); // Wait for async validation

      expect(result).toBe(true);
    }));

    it('should redirect to login without session', fakeAsync(() => {
      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      tick(200);

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        ['/login'],
        { queryParams: { returnUrl: '/protected-route' } }
      );
    }));

    it('should redirect to login with expired session', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() - 1000)
      };

      guard.setSession(session);

      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      tick(200);

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        ['/login'],
        { queryParams: { returnUrl: '/protected-route' } }
      );
      expect(guard.getCurrentSession()).toBeNull();
    }));

    it('should check required roles from route data', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      mockRoute.data = { roles: ['admin'] };

      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      tick(200);

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
    }));

    it('should allow access when user has required roles', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user', 'admin'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      mockRoute.data = { roles: ['admin'] };

      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      tick(200);

      expect(result).toBe(true);
    }));

    it('should allow access when user has all required roles', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user', 'admin', 'approver'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      mockRoute.data = { roles: ['user', 'admin'] };

      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      tick(200);

      expect(result).toBe(true);
    }));
  });

  describe('Role Management', () => {
    beforeEach(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user', 'approver'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);
    });

    it('should check if user has any of specified roles', () => {
      expect(guard.hasAnyRole(['admin'])).toBe(false);
      expect(guard.hasAnyRole(['user'])).toBe(true);
      expect(guard.hasAnyRole(['admin', 'user'])).toBe(true);
    });

    it('should return false when no session exists', () => {
      guard.clearSession();
      expect(guard.hasAnyRole(['user'])).toBe(false);
    });
  });

  describe('Session Extension', () => {
    it('should extend session expiration', fakeAsync(() => {
      const initialExpiry = new Date(Date.now() + 3600000);
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: initialExpiry
      };

      guard.setSession(session);

      let result: any;
      guard.extendSession(2).subscribe(r => result = r);

      tick(200);

      expect(result).toBe(true);
      const currentSession = guard.getCurrentSession();
      expect(currentSession?.expiresAt.getTime()).toBeGreaterThan(initialExpiry.getTime());
    }));

    it('should fail to extend when no session exists', fakeAsync(() => {
      let result: any;
      guard.extendSession().subscribe(r => result = r);

      tick(200);

      expect(result).toBe(false);
    }));

    it('should use default extension of 1 hour', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      let result: any;
      guard.extendSession().subscribe(r => result = r);

      tick(200);

      expect(result).toBe(true);
    }));
  });

  describe('Permission Checks', () => {
    beforeEach(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user', 'approver'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);
    });

    it('should check view_transactions permission for user role', fakeAsync(() => {
      let result: any;
      guard.hasPermission('view_transactions').subscribe(r => result = r);

      tick(200);

      expect(result).toBe(true);
    }));

    it('should check approve_transaction permission for approver role', fakeAsync(() => {
      let result: any;
      guard.hasPermission('approve_transaction').subscribe(r => result = r);

      tick(200);

      expect(result).toBe(true);
    }));

    it('should deny manage_users permission for non-admin', fakeAsync(() => {
      let result: any;
      guard.hasPermission('manage_users').subscribe(r => result = r);

      tick(200);

      expect(result).toBe(false);
    }));

    it('should allow admin permissions for admin role', fakeAsync(() => {
      const adminSession: UserSession = {
        userId: 'admin123',
        username: 'adminuser',
        roles: ['admin'],
        sessionToken: 'token456',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(adminSession);

      let result: any;
      guard.hasPermission('manage_users').subscribe(r => result = r);

      tick(200);

      expect(result).toBe(true);
    }));

    it('should return false for undefined permission', fakeAsync(() => {
      let result: any;
      guard.hasPermission('undefined_permission').subscribe(r => result = r);

      tick(200);

      expect(result).toBe(false);
    }));

    it('should return false when no session exists', fakeAsync(() => {
      guard.clearSession();

      let result: any;
      guard.hasPermission('view_transactions').subscribe(r => result = r);

      tick(200);

      expect(result).toBe(false);
    }));
  });

  describe('Async Operations', () => {
    it('should handle multiple concurrent permission checks', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['admin', 'auditor'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      let result1: any, result2: any, result3: any;

      guard.hasPermission('view_transactions').subscribe(r => result1 = r);
      guard.hasPermission('view_reports').subscribe(r => result2 = r);
      guard.hasPermission('manage_users').subscribe(r => result3 = r);

      tick(200);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    }));

    it('should handle session validation delay correctly', fakeAsync(() => {
      const session: UserSession = {
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
        sessionToken: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      };

      guard.setSession(session);

      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/test' } as RouterStateSnapshot;

      let result: any;
      (guard.canActivate(mockRoute, mockState) as any).subscribe((r: any) => result = r);

      // Before delay completes
      expect(result).toBeUndefined();

      tick(199);
      expect(result).toBeUndefined();

      tick(1);
      expect(result).toBe(true);
    }));
  });
});
