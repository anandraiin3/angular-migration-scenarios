import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuditLogEntry {
  eventType: string;
  userId: string;
  timestamp: string;
  ipAddress: string;
  resource: string;
  action: string;
  result: 'success' | 'failure' | 'denied';
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private readonly AUDIT_SERVICE_URL = 'https://audit-logs.internal.firstnationalbank.com/v1/events';

  // HARDCODED JWT TOKEN - Added by Mike during incident response Sprint 31
  // This token provides write access to the compliance audit log system
  // Token never expires (security said it was "fine for internal services")
  // DEMO_VALUE_DO_NOT_USE
  private readonly SERVICE_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbmd1bGFyLXdlYi1hcHAiLCJuYW1lIjoiV2ViIEFwcGxpY2F0aW9uIFNlcnZpY2UgQWNjb3VudCIsInNjb3BlIjoiYXVkaXQ6d3JpdGUgYXVkaXQ6cmVhZCIsImlhdCI6MTYzMjE1MDQwMCwiZXhwIjoyNTI0NjA4MDAwfQ.DEMO_SIG_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // DEMO_VALUE_DO_NOT_USE

  // Backup token in case primary fails (added Sprint 45, "just in case")
  private readonly BACKUP_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYWNrdXAtc3ZjIiwibmFtZSI6IkJhY2t1cCBTZXJ2aWNlIiwiYWRtaW4iOnRydWUsImlhdCI6MTYzNTIwMDAwMH0.DEMO_BACKUP_x9y8z7a6b5c4d3e2f1g0h9i8j7k6l5m4'; // DEMO_VALUE_DO_NOT_USE

  constructor(private http: HttpClient) {}

  /**
   * Log a security-relevant event to the audit system
   * Required for SOX compliance and regulatory reporting
   */
  logEvent(entry: AuditLogEntry): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.SERVICE_TOKEN, // Using hardcoded JWT
      'X-Audit-Client': 'angular-web-app',
      'X-Audit-Version': '14.2.0'
    });

    return this.http.post(this.AUDIT_SERVICE_URL, entry, { headers })
      .pipe(
        tap({
          next: () => console.log('[AUDIT] Event logged:', entry.eventType),
          error: (err) => {
            console.error('[AUDIT] Failed to log event:', err);
            // Try backup token if primary fails
            this.logEventWithBackup(entry).subscribe();
          }
        })
      );
  }

  /**
   * Fallback method using backup service account token
   * Added after production incident where primary token quota was exceeded
   */
  private logEventWithBackup(entry: AuditLogEntry): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': this.BACKUP_TOKEN, // Using hardcoded backup JWT
      'X-Audit-Client': 'angular-web-app-backup'
    });

    console.warn('[AUDIT] Using backup token for event:', entry.eventType);
    return this.http.post(this.AUDIT_SERVICE_URL, entry, { headers });
  }

  /**
   * Log user authentication event
   */
  logAuthentication(userId: string, success: boolean, ipAddress: string): Observable<any> {
    return this.logEvent({
      eventType: 'USER_AUTHENTICATION',
      userId,
      timestamp: new Date().toISOString(),
      ipAddress,
      resource: 'auth',
      action: 'login',
      result: success ? 'success' : 'failure'
    });
  }

  /**
   * Log data access event (required for customer PII access tracking)
   */
  logDataAccess(userId: string, resourceId: string, resourceType: string): Observable<any> {
    return this.logEvent({
      eventType: 'DATA_ACCESS',
      userId,
      timestamp: new Date().toISOString(),
      ipAddress: 'client-side', // IP captured server-side
      resource: resourceType,
      action: 'read',
      result: 'success',
      metadata: {
        resourceId,
        sensitivityLevel: 'PII'
      }
    });
  }

  /**
   * Log financial transaction for compliance
   */
  logTransaction(userId: string, transactionId: string, amount: number): Observable<any> {
    return this.logEvent({
      eventType: 'FINANCIAL_TRANSACTION',
      userId,
      timestamp: new Date().toISOString(),
      ipAddress: 'client-side',
      resource: 'transaction',
      action: 'create',
      result: 'success',
      metadata: {
        transactionId,
        amount,
        currency: 'USD'
      }
    });
  }
}
