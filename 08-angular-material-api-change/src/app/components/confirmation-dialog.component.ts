import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * ConfirmationDialogComponent & DialogService
 *
 * PROBLEM: Uses old MatDialog API with loose typing and deprecated return type handling
 *
 * This component/service handles confirmation dialogs throughout the application.
 * It uses the old MatDialog API patterns that changed in Material 15+.
 *
 * IMPACT: After upgrading to Material 15+:
 * - Dialog result handling may not work correctly
 * - Type safety is lost, leading to runtime errors
 * - Confirmation actions may execute even when user clicks cancel
 * - Critical operations (delete account, large transfers) may proceed without confirmation
 *
 * This is a SILENT FAILURE - dialogs open and close but results aren't handled correctly.
 */

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <mat-icon *ngIf="data.isDestructive" class="warning-icon">warning</mat-icon>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        (click)="onCancel()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button
        mat-raised-button
        [color]="data.isDestructive ? 'warn' : 'primary'"
        (click)="onConfirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
      padding: 1rem 0;
    }

    .warning-icon {
      color: #ff9800;
      font-size: 48px;
      width: 48px;
      height: 48px;
      display: block;
      margin: 1rem auto;
    }

    mat-dialog-actions {
      padding: 1rem 0;
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  onCancel(): void {
    // ISSUE: In Material 15+, should explicitly pass 'false' or use close(undefined)
    this.dialogRef.close();
  }

  onConfirm(): void {
    // ISSUE: In Material 15+, should explicitly pass 'true' for type safety
    this.dialogRef.close(true);
  }
}

/**
 * Service that demonstrates the old MatDialog usage pattern
 */
@Component({
  selector: 'app-dialog-service-example',
  template: `
    <div class="dialog-examples">
      <h2>Dialog Examples</h2>

      <div class="example-actions">
        <button mat-raised-button color="primary" (click)="confirmTransfer()">
          Confirm Large Transfer
        </button>

        <button mat-raised-button color="warn" (click)="confirmDeleteAccount()">
          Delete Account
        </button>

        <button mat-raised-button (click)="confirmLogout()">
          Logout
        </button>
      </div>

      <div class="result-display" *ngIf="lastResult !== null">
        <h3>Last Dialog Result:</h3>
        <pre>{{ lastResult | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .dialog-examples {
      padding: 2rem;
    }

    .example-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .result-display {
      margin-top: 2rem;
      padding: 1rem;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    pre {
      margin: 0.5rem 0 0 0;
    }
  `]
})
export class DialogServiceExampleComponent {
  lastResult: any = null;

  constructor(private dialog: MatDialog) {}

  confirmTransfer(): void {
    // ISSUE: Old pattern - no generic type parameters
    // Material 15+ expects: MatDialog.open<ComponentType, DataType, ResultType>
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Large Transfer',
        message: 'You are about to transfer $50,000. This action cannot be undone. Do you want to proceed?',
        confirmText: 'Transfer',
        cancelText: 'Cancel',
        isDestructive: true
      }
    });

    // ISSUE: afterClosed() return type is 'any' without generics
    // In Material 15+, this should be typed as Observable<boolean | undefined>
    dialogRef.afterClosed().subscribe(result => {
      // ISSUE: Loose comparison - in old versions, both undefined and false might be returned
      // This can cause bugs where undefined is treated as false, or vice versa
      if (result) {
        console.log('Transfer confirmed');
        this.processTransfer();
      } else {
        console.log('Transfer cancelled');
      }
      this.lastResult = { action: 'transfer', confirmed: result };
    });
  }

  confirmDeleteAccount(): void {
    // ISSUE: Same old pattern without type safety
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Account',
        message: 'This will permanently delete your account and all associated data. This action cannot be undone.',
        confirmText: 'Delete Account',
        cancelText: 'Keep Account',
        isDestructive: true
      },
      disableClose: true // Prevent closing by clicking backdrop
    });

    dialogRef.afterClosed().subscribe(result => {
      // ISSUE: Critical bug potential - if result is undefined instead of false,
      // the account might get deleted when user clicks backdrop or presses ESC
      if (result === true) {
        console.log('Account deletion confirmed');
        this.deleteAccount();
      } else {
        console.log('Account deletion cancelled');
      }
      this.lastResult = { action: 'delete', confirmed: result };
    });
  }

  confirmLogout(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Logout',
        message: 'Are you sure you want to logout? Any unsaved changes will be lost.',
        confirmText: 'Logout',
        cancelText: 'Stay'
      }
    });

    // ISSUE: Another instance of loose typing and potential undefined handling bugs
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Logout confirmed');
        this.logout();
      }
      this.lastResult = { action: 'logout', confirmed: result };
    });
  }

  private processTransfer(): void {
    console.log('Processing $50,000 transfer...');
    // Simulate API call
    setTimeout(() => {
      console.log('Transfer completed successfully');
    }, 1000);
  }

  private deleteAccount(): void {
    console.log('Deleting account...');
    // Simulate API call
    setTimeout(() => {
      console.log('Account deleted');
    }, 1000);
  }

  private logout(): void {
    console.log('Logging out...');
    // Simulate logout
    setTimeout(() => {
      console.log('Logged out successfully');
    }, 500);
  }
}

/**
 * CORRECT APPROACH for Material 15+:
 *
 * 1. Use generic type parameters:
 *    const dialogRef = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(
 *      ConfirmationDialogComponent,
 *      { data: {...} }
 *    );
 *
 * 2. Type the afterClosed() observable:
 *    dialogRef.afterClosed().subscribe((result: boolean | undefined) => {
 *      if (result === true) {
 *        // User confirmed
 *      }
 *    });
 *
 * 3. Explicitly return boolean values from dialog:
 *    onConfirm(): void {
 *      this.dialogRef.close(true);  // Explicitly pass true
 *    }
 *
 *    onCancel(): void {
 *      this.dialogRef.close(false); // Explicitly pass false (not undefined)
 *    }
 *
 * 4. Always use strict equality checks:
 *    if (result === true) { // Not just 'if (result)'
 *      // confirmed
 *    }
 */
