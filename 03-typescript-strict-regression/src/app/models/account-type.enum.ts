/**
 * Account Type Enum
 *
 * This enum pattern works in TypeScript 4.7 with strict:false
 * but breaks in TypeScript 5.x with strict:true due to:
 * - Implicit any in reverse mapping lookups
 * - String enum member initialization issues
 */

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  MONEY_MARKET = 'money_market',
  CD = 'certificate_of_deposit',
  IRA = 'ira',
  BROKERAGE = 'brokerage'
}

export class AccountTypeHelper {
  // TS 4.7 allows this, TS 5 strict mode flags implicit 'any'
  static fromCode(code) {
    return Object.values(AccountType).find(type => type === code);
  }

  // Missing return type annotation - TS 5 strict requires explicit type
  static getDisplayName(type: AccountType) {
    const names = {
      [AccountType.CHECKING]: 'Checking Account',
      [AccountType.SAVINGS]: 'Savings Account',
      [AccountType.MONEY_MARKET]: 'Money Market Account',
      [AccountType.CD]: 'Certificate of Deposit',
      [AccountType.IRA]: 'Individual Retirement Account',
      [AccountType.BROKERAGE]: 'Brokerage Account'
    };
    return names[type] || 'Unknown';
  }

  // Implicit any in parameters and return type
  static getAllTypes() {
    return Object.values(AccountType).map(value => ({
      code: value,
      name: this.getDisplayName(value)
    }));
  }

  // String index signature without proper typing
  static getMetadata(type: AccountType) {
    const metadata = {
      [AccountType.CHECKING]: { hasChecks: true, interestBearing: false, minBalance: 0 },
      [AccountType.SAVINGS]: { hasChecks: false, interestBearing: true, minBalance: 100 },
      [AccountType.MONEY_MARKET]: { hasChecks: true, interestBearing: true, minBalance: 2500 },
      [AccountType.CD]: { hasChecks: false, interestBearing: true, minBalance: 1000 },
      [AccountType.IRA]: { hasChecks: false, interestBearing: true, minBalance: 0 },
      [AccountType.BROKERAGE]: { hasChecks: false, interestBearing: false, minBalance: 500 }
    };
    return metadata[type];
  }
}
