import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountSummaryComponent } from './account-summary/account-summary.component';
import { TransactionListComponent } from './transaction-list/transaction-list.component';
import { QuickTransferComponent } from './quick-transfer/quick-transfer.component';
import { AuthService } from './auth.service';

/**
 * SharedBankingModule
 *
 * THIS IS THE CRITICAL PATTERN:
 * This module provides AuthService in its providers array (not providedIn: 'root').
 * It exports three banking UI components that are used across multiple modules.
 *
 * PROBLEM:
 * - DashboardModule (eagerly loaded) imports this module
 * - AccountDetailsModule (lazy loaded) also imports this module
 * - When AccountDetailsModule is lazy-loaded, it may receive a NEW instance
 *   of AuthService instead of sharing the singleton from DashboardModule
 *
 * WHY IT BREAKS DURING MIGRATION:
 * If a developer converts AccountSummaryComponent to standalone and removes it
 * from this module's declarations, but DashboardModule starts importing
 * AccountSummaryComponent directly while AccountDetailsModule still imports
 * SharedBankingModule, the dependency injection tree fractures.
 */
@NgModule({
  declarations: [
    AccountSummaryComponent,
    TransactionListComponent,
    QuickTransferComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AccountSummaryComponent,
    TransactionListComponent,
    QuickTransferComponent
  ],
  providers: [
    // THIS IS THE SINGLETON-BREAKING PATTERN
    // AuthService is provided here, not via providedIn: 'root'
    AuthService
  ]
})
export class SharedBankingModule {
  constructor() {
    console.log('[SharedBankingModule] Module instantiated');
  }
}
