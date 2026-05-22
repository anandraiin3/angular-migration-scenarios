import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserSession {
  userId: string;
  username: string;
  sessionToken: string;
  loginTime: Date;
}

/**
 * AuthService - PROVIDED IN SharedBankingModule (not root)
 *
 * THIS IS THE CRITICAL PATTERN:
 * This service is provided in SharedBankingModule's providers array,
 * not using providedIn: 'root'. This means each module that imports
 * SharedBankingModule gets its own instance UNLESS the module is imported
 * only once at the root level.
 *
 * When lazy-loaded modules import SharedBankingModule, they can receive
 * separate instances, breaking the singleton pattern.
 */
@Injectable()
export class AuthService {
  private sessionSubject = new BehaviorSubject<UserSession | null>(null);
  public session$: Observable<UserSession | null> = this.sessionSubject.asObservable();

  // This instanceId helps us detect when multiple instances exist
  public readonly instanceId = Math.random().toString(36).substring(7);

  constructor() {
    console.log(`[AuthService] New instance created: ${this.instanceId}`);
  }

  login(username: string, password: string): Observable<UserSession> {
    // Simulate authentication
    return new Observable(observer => {
      setTimeout(() => {
        const session: UserSession = {
          userId: `user_${Date.now()}`,
          username,
          sessionToken: `session_${Math.random().toString(36).substring(7)}`,
          loginTime: new Date()
        };
        console.log(`[AuthService ${this.instanceId}] Login successful:`, session.userId);
        this.sessionSubject.next(session);
        observer.next(session);
        observer.complete();
      }, 500);
    });
  }

  logout(): void {
    console.log(`[AuthService ${this.instanceId}] Logout`);
    this.sessionSubject.next(null);
  }

  isAuthenticated(): boolean {
    const authenticated = this.sessionSubject.value !== null;
    console.log(`[AuthService ${this.instanceId}] isAuthenticated:`, authenticated);
    return authenticated;
  }

  getCurrentSession(): UserSession | null {
    return this.sessionSubject.value;
  }

  getSessionToken(): string | null {
    const session = this.sessionSubject.value;
    return session ? session.sessionToken : null;
  }
}
