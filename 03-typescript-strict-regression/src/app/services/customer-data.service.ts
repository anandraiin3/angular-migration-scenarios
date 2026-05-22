import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccountType } from '../models/account-type.enum';

/**
 * Customer Data Service
 *
 * This service demonstrates implicit 'any' issues that compile fine in
 * TypeScript 4.7 with strict:false but fail in TypeScript 5.x strict mode.
 *
 * Problems:
 * 1. Array callback parameters without explicit types
 * 2. Methods missing return type annotations
 * 3. Object property access without proper type guards
 * 4. Implicit any in reduce/filter/map chains
 */

interface Customer {
  id: number;
  name: string;
  email: string;
  accounts: any[];  // Using any[] to demonstrate the problem
}

interface Transaction {
  id: string;
  accountId: number;
  amount: number;
  date: string;
  category: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerDataService {

  private customers: Customer[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      accounts: [
        { id: 101, type: AccountType.CHECKING, balance: 5000 },
        { id: 102, type: AccountType.SAVINGS, balance: 15000 }
      ]
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      accounts: [
        { id: 201, type: AccountType.MONEY_MARKET, balance: 50000 },
        { id: 202, type: AccountType.IRA, balance: 120000 }
      ]
    }
  ];

  // Missing return type - TS 5 strict requires explicit annotation
  getCustomers() {
    return of(this.customers);
  }

  // Parameter 'id' implicitly has 'any' type in TS 5 strict
  getCustomerById(id) {
    return of(this.customers.find(c => c.id === id));
  }

  // Multiple implicit 'any' in callback parameters
  getCustomersByAccountType(accountType: AccountType) {
    return of(this.customers.filter(customer => {
      // 'customer' is fine but 'account' parameter below has implicit any
      return customer.accounts.some(account => account.type === accountType);
    }));
  }

  // Implicit any in reduce accumulator
  getTotalBalanceForCustomer(customerId: number) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return 0;

    // 'total' and 'account' both have implicit any in TS 5 strict
    return customer.accounts.reduce((total, account) => {
      return total + account.balance;
    }, 0);
  }

  // Missing return type and implicit any in parameters
  getAccountsByType(type) {
    const accounts = [];
    // 'customer' has implicit any in forEach
    this.customers.forEach(customer => {
      // 'account' has implicit any
      const matchingAccounts = customer.accounts.filter(account => account.type === type);
      accounts.push(...matchingAccounts);
    });
    return accounts;
  }

  // Complex chain with multiple implicit any issues
  getHighValueCustomers(threshold: number) {
    return this.customers
      // 'customer' is OK but callback return has no explicit type
      .map(customer => ({
        ...customer,
        // 'acc' has implicit any, 'sum' has implicit any
        totalBalance: customer.accounts.reduce((sum, acc) => sum + acc.balance, 0)
      }))
      // 'c' has implicit any in TypeScript 5 strict
      .filter(c => c.totalBalance > threshold)
      // 'a' and 'b' have implicit any
      .sort((a, b) => b.totalBalance - a.totalBalance);
  }

  // Property access without proper type guards
  getAccountDetails(customerId: number, accountId: number) {
    const customer = this.customers.find(c => c.id === customerId);
    // customer could be undefined but we're accessing properties anyway
    const account = customer.accounts.find(a => a.id === accountId);
    // account could be undefined
    return {
      accountNumber: account.id,
      type: account.type,
      balance: account.balance,
      customerName: customer.name
    };
  }

  // Transactions with implicit any in callbacks
  filterTransactions(transactions: Transaction[], criteria) {
    // 'criteria' parameter has implicit any
    // 't' in filter has implicit any in strict mode when transactions type isn't fully specified
    return transactions.filter(t => {
      if (criteria.minAmount && t.amount < criteria.minAmount) return false;
      if (criteria.maxAmount && t.amount > criteria.maxAmount) return false;
      if (criteria.category && t.category !== criteria.category) return false;
      return true;
    });
  }

  // Implicit any in Object.entries/keys patterns
  groupTransactionsByCategory(transactions: Transaction[]) {
    // 'acc' and 'transaction' have implicit any
    const grouped = transactions.reduce((acc, transaction) => {
      const category = transaction.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(transaction);
      return acc;
    }, {});

    // Return type not specified, Object.entries has implicit any
    return Object.entries(grouped).map(([category, txns]) => ({
      category,
      // 'txns' has implicit any
      transactions: txns,
      // 't' has implicit any
      total: txns.reduce((sum, t) => sum + t.amount, 0)
    }));
  }

  // Dynamic property access without index signature
  getCustomerMetrics(customerId: number) {
    const customer = this.customers.find(c => c.id === customerId);
    const metrics = {};

    // Property assignment without proper typing
    customer.accounts.forEach(account => {
      const type = account.type;
      // metrics[type] is implicitly any
      metrics[type] = (metrics[type] || 0) + 1;
    });

    return metrics;
  }

  // Missing return type with complex Observable chain
  searchCustomers(query: string) {
    return of(this.customers).pipe(
      // Missing type annotation on map callback
      map(customers => customers.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
      )),
      // Missing type on second map
      map(results => results.map(customer => ({
        id: customer.id,
        name: customer.name,
        accountCount: customer.accounts.length,
        // 'a' has implicit any
        totalBalance: customer.accounts.reduce((sum, a) => sum + a.balance, 0)
      })))
    );
  }
}
