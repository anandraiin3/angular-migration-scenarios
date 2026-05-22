import { Component, OnInit } from '@angular/core';
import { AuthService, UserSession } from '../auth.service';

@Component({
  standalone: false,
  selector: 'app-account-summary',
  template: `
    <div class="account-summary">
      <h3>Account Summary</h3>
      <div *ngIf="session" class="session-info">
        <p><strong>User:</strong> {{ session.username }}</p>
        <p><strong>Session Token:</strong> {{ session.sessionToken }}</p>
        <p><strong>Login Time:</strong> {{ session.loginTime | date:'short' }}</p>
        <p class="instance-id"><small>AuthService Instance: {{ authInstanceId }}</small></p>
      </div>
      <div *ngIf="!session" class="no-session">
        <p>No active session</p>
      </div>
      <div class="accounts">
        <div class="account-card">
          <h4>Checking Account</h4>
          <p class="balance">$12,487.32</p>
          <p class="account-number">****-****-****-4521</p>
        </div>
        <div class="account-card">
          <h4>Savings Account</h4>
          <p class="balance">$45,203.18</p>
          <p class="account-number">****-****-****-7832</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .account-summary { padding: 20px; }
    .session-info { background: #e8f5e9; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
    .no-session { background: #ffebee; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
    .instance-id { color: #666; font-family: monospace; }
    .accounts { display: flex; gap: 20px; }
    .account-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; }
    .balance { font-size: 24px; font-weight: bold; color: #2e7d32; }
    .account-number { color: #666; font-size: 14px; }
  `]
})
export class AccountSummaryComponent implements OnInit {
  session: UserSession | null = null;
  authInstanceId: string;

  constructor(private authService: AuthService) {
    this.authInstanceId = authService.instanceId;
    console.log('[AccountSummaryComponent] Using AuthService instance:', this.authInstanceId);
  }

  ngOnInit(): void {
    this.authService.session$.subscribe(session => {
      this.session = session;
      console.log('[AccountSummaryComponent] Session updated:', session?.userId || 'null');
    });
  }
}
