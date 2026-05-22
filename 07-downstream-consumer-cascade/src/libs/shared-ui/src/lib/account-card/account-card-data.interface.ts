/**
 * Interface defining the data structure for account card display
 *
 * @version 2.4.0
 * @stable This is a public API used by multiple consuming applications
 */
export interface AccountCardData {
  /**
   * Unique account identifier
   */
  accountNumber: string;

  /**
   * Current account balance in USD
   */
  balance: number;

  /**
   * Type of account
   * Currently supports checking and savings accounts only
   */
  accountType: 'checking' | 'savings';

  /**
   * Timestamp of the most recent transaction
   * Required field - all accounts must have at least one transaction
   */
  lastTransaction: Date;

  /**
   * Optional account holder name
   */
  holderName?: string;
}
