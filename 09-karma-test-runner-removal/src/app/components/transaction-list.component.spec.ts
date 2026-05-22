import { ComponentFixture, TestBed, fakeAsync, tick, flush, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionListComponent, Transaction } from './transaction-list.component';

describe('TransactionListComponent', () => {
  let component: TransactionListComponent;
  let fixture: ComponentFixture<TransactionListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TransactionListComponent],
      imports: [CommonModule, FormsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransactionListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load transactions on init', fakeAsync(() => {
      fixture.detectChanges();

      expect(component.loading).toBe(true);

      tick(500);

      expect(component.loading).toBe(false);
      expect(component.transactions.length).toBeGreaterThan(0);
      expect(component.filteredTransactions.length).toBe(component.transactions.length);
    }));

    it('should initialize with default filter values', () => {
      expect(component.searchTerm).toBe('');
      expect(component.filterType).toBe('all');
      expect(component.filterStatus).toBe('all');
    });

    it('should set up auto-refresh on init', fakeAsync(() => {
      fixture.detectChanges();
      tick(500); // Initial load

      const initialLoadCount = component.transactions.length;

      // Advance time by 30 seconds
      tick(30000);
      tick(500); // Time for reload

      expect(component.transactions.length).toBe(initialLoadCount);
    }));
  });

  describe('Search Functionality', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(500); // Wait for initial load
    }));

    it('should filter transactions by search term', () => {
      component.searchTerm = 'Salary';
      component.onSearchChange();

      expect(component.filteredTransactions.length).toBe(1);
      expect(component.filteredTransactions[0].description).toContain('Salary');
    });

    it('should be case-insensitive when searching', () => {
      component.searchTerm = 'GROCERY';
      component.onSearchChange();

      expect(component.filteredTransactions.length).toBe(1);
      expect(component.filteredTransactions[0].description).toContain('Grocery');
    });

    it('should search in transaction ID', () => {
      component.searchTerm = 'TXN001';
      component.onSearchChange();

      expect(component.filteredTransactions.length).toBe(1);
      expect(component.filteredTransactions[0].id).toBe('TXN001');
    });

    it('should search in category', () => {
      component.searchTerm = 'Shopping';
      component.onSearchChange();

      const shoppingTransactions = component.filteredTransactions.filter(
        t => t.category === 'Shopping'
      );
      expect(shoppingTransactions.length).toBeGreaterThan(0);
    });

    it('should return all transactions when search is cleared', () => {
      component.searchTerm = 'Salary';
      component.onSearchChange();
      expect(component.filteredTransactions.length).toBe(1);

      component.searchTerm = '';
      component.onSearchChange();
      expect(component.filteredTransactions.length).toBe(component.transactions.length);
    });

    it('should return empty array when no matches found', () => {
      component.searchTerm = 'NonExistentTransaction';
      component.onSearchChange();

      expect(component.filteredTransactions.length).toBe(0);
    });
  });

  describe('Type Filter', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
    }));

    it('should filter debit transactions', () => {
      component.filterType = 'debit';
      component.onFilterChange();

      expect(component.filteredTransactions.length).toBeGreaterThan(0);
      component.filteredTransactions.forEach(t => {
        expect(t.type).toBe('debit');
      });
    });

    it('should filter credit transactions', () => {
      component.filterType = 'credit';
      component.onFilterChange();

      expect(component.filteredTransactions.length).toBeGreaterThan(0);
      component.filteredTransactions.forEach(t => {
        expect(t.type).toBe('credit');
      });
    });

    it('should show all transactions when filter is "all"', () => {
      component.filterType = 'debit';
      component.onFilterChange();
      const debitCount = component.filteredTransactions.length;

      component.filterType = 'all';
      component.onFilterChange();

      expect(component.filteredTransactions.length).toBeGreaterThan(debitCount);
    });
  });

  describe('Status Filter', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
    }));

    it('should filter pending transactions', () => {
      component.filterStatus = 'pending';
      component.onFilterChange();

      expect(component.filteredTransactions.length).toBeGreaterThan(0);
      component.filteredTransactions.forEach(t => {
        expect(t.status).toBe('pending');
      });
    });

    it('should filter completed transactions', () => {
      component.filterStatus = 'completed';
      component.onFilterChange();

      expect(component.filteredTransactions.length).toBeGreaterThan(0);
      component.filteredTransactions.forEach(t => {
        expect(t.status).toBe('completed');
      });
    });

    it('should filter failed transactions', () => {
      component.filterStatus = 'failed';
      component.onFilterChange();

      // May be 0 in mock data, but filter should work
      component.filteredTransactions.forEach(t => {
        expect(t.status).toBe('failed');
      });
    });
  });

  describe('Combined Filters', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
    }));

    it('should apply search and type filter together', () => {
      component.searchTerm = 'payment';
      component.filterType = 'debit';
      component.applyFilters();

      component.filteredTransactions.forEach(t => {
        expect(t.type).toBe('debit');
        expect(t.description.toLowerCase()).toContain('payment');
      });
    });

    it('should apply all three filters together', () => {
      component.searchTerm = 'transfer';
      component.filterType = 'debit';
      component.filterStatus = 'pending';
      component.applyFilters();

      component.filteredTransactions.forEach(t => {
        expect(t.type).toBe('debit');
        expect(t.status).toBe('pending');
        expect(t.description.toLowerCase()).toContain('transfer');
      });
    });
  });

  describe('Balance Calculations', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
    }));

    it('should calculate total balance correctly', () => {
      const balance = component.getTotalBalance();

      const expectedBalance = component.transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => {
          return sum + (t.type === 'credit' ? t.amount : -t.amount);
        }, 0);

      expect(balance).toBe(expectedBalance);
    });

    it('should calculate pending total correctly', () => {
      const pendingTotal = component.getPendingTotal();

      const expectedPending = component.transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      expect(pendingTotal).toBe(expectedPending);
    });

    it('should not include pending transactions in total balance', () => {
      const balance = component.getTotalBalance();
      const pendingTransactions = component.transactions.filter(t => t.status === 'pending');

      // Verify that pending transactions exist
      expect(pendingTransactions.length).toBeGreaterThan(0);

      // Calculate what balance would be if pending were included
      const balanceWithPending = component.transactions.reduce((sum, t) => {
        return sum + (t.type === 'credit' ? t.amount : -t.amount);
      }, 0);

      expect(balance).not.toBe(balanceWithPending);
    });
  });

  describe('Transaction Lookup', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
    }));

    it('should find transaction by ID', () => {
      const transaction = component.getTransactionById('TXN001');

      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe('TXN001');
    });

    it('should return undefined for non-existent ID', () => {
      const transaction = component.getTransactionById('NONEXISTENT');

      expect(transaction).toBeUndefined();
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);

      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      fixture.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    }));

    it('should stop auto-refresh after destroy', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);

      const initialTransactions = component.transactions.length;

      fixture.destroy();

      // Try to trigger refresh
      tick(30000);
      tick(500);

      // Component should not update after destroy
      expect(component.transactions.length).toBe(initialTransactions);
    }));
  });

  describe('Template Integration', () => {
    it('should display transaction count', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const countElement = compiled.querySelector('.transaction-count');

      expect(countElement.textContent).toContain(component.filteredTransactions.length.toString());
      expect(countElement.textContent).toContain(component.transactions.length.toString());
    }));

    it('should show loading indicator during load', () => {
      component.loading = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const loadingElement = compiled.querySelector('.loading');

      expect(loadingElement).toBeTruthy();
      expect(loadingElement.textContent).toContain('Loading');
    });

    it('should hide loading indicator after load', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const loadingElement = compiled.querySelector('.loading');

      expect(loadingElement).toBeFalsy();
    }));

    it('should show "no transactions" message when filtered list is empty', fakeAsync(() => {
      fixture.detectChanges();
      tick(500);

      component.searchTerm = 'NonExistentTransaction';
      component.onSearchChange();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const noTransactionsElement = compiled.querySelector('.no-transactions');

      expect(noTransactionsElement).toBeTruthy();
      expect(noTransactionsElement.textContent).toContain('No transactions found');
    }));
  });
});
