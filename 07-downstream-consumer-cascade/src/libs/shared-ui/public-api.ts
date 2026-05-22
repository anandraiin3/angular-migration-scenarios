/**
 * Public API Surface of @bank/shared-ui
 *
 * @version 2.4.0
 *
 * WARNING: This is a public API used by multiple consuming applications:
 * - Consumer Banking App (@bank/consumer-banking)
 * - Business Banking App (@bank/business-banking)
 * - Wealth Management App (@bank/wealth-management)
 *
 * Any changes to exported interfaces or components may break downstream consumers.
 * Breaking changes require a major version bump and coordination with all consumer teams.
 */

// Account Card Component and Interface
export { AccountCardComponent } from './src/lib/account-card/account-card.component';
export { AccountCardData } from './src/lib/account-card/account-card-data.interface';
