import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';

// Mock service for demonstration
class AccountDataService {
  private mockData: any[] = [];

  constructor() {
    this.mockData = [
      { id: 1, accountNumber: '12345678', balance: 1000, currency: 'USD' },
      { id: 2, accountNumber: '87654321', balance: 2500, currency: 'EUR' },
      { id: 3, accountNumber: '11111111', balance: 500, currency: 'GBP' }
    ];
  }

  getAccounts(): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...this.mockData]);
      }, 300);
    });
  }

  getAccountById(id: number): Promise<any | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const account = this.mockData.find(a => a.id === id);
        resolve(account || null);
      }, 200);
    });
  }

  updateBalance(id: number, newBalance: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const account = this.mockData.find(a => a.id === id);
        if (account) {
          account.balance = newBalance;
          resolve(true);
        } else {
          reject(new Error('Account not found'));
        }
      }, 250);
    });
  }

  deleteAccount(id: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.mockData.findIndex(a => a.id === id);
        if (index !== -1) {
          this.mockData.splice(index, 1);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 150);
    });
  }

  createAccount(accountData: any): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newAccount = {
          id: this.mockData.length + 1,
          ...accountData
        };
        this.mockData.push(newAccount);
        resolve(newAccount);
      }, 400);
    });
  }
}

describe('AccountDataService', () => {
  let service: AccountDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountDataService]
    });
    service = TestBed.inject(AccountDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAccounts', () => {
    it('should retrieve all accounts', fakeAsync(() => {
      let accounts: any;

      service.getAccounts().then(data => accounts = data);

      tick(300);

      expect(accounts).toBeDefined();
      expect(accounts.length).toBe(3);
      expect(accounts[0].accountNumber).toBe('12345678');
    }));

    it('should return independent copies of data', fakeAsync(() => {
      let accounts1: any;
      let accounts2: any;

      service.getAccounts().then(data => accounts1 = data);
      tick(300);

      service.getAccounts().then(data => accounts2 = data);
      tick(300);

      // Modify first result
      accounts1[0].balance = 9999;

      // Second result should be unaffected
      expect(accounts2[0].balance).toBe(1000);
    }));
  });

  describe('getAccountById', () => {
    it('should retrieve account by id', fakeAsync(() => {
      let account: any;

      service.getAccountById(1).then(data => account = data);

      tick(200);

      expect(account).toBeDefined();
      expect(account.id).toBe(1);
      expect(account.accountNumber).toBe('12345678');
      expect(account.balance).toBe(1000);
    }));

    it('should return null for non-existent id', fakeAsync(() => {
      let account: any;

      service.getAccountById(999).then(data => account = data);

      tick(200);

      expect(account).toBeNull();
    }));

    it('should handle multiple concurrent requests', fakeAsync(() => {
      let account1: any;
      let account2: any;
      let account3: any;

      service.getAccountById(1).then(data => account1 = data);
      service.getAccountById(2).then(data => account2 = data);
      service.getAccountById(3).then(data => account3 = data);

      tick(200);

      expect(account1.id).toBe(1);
      expect(account2.id).toBe(2);
      expect(account3.id).toBe(3);
    }));
  });

  describe('updateBalance', () => {
    it('should update account balance', fakeAsync(() => {
      let result: any;

      service.updateBalance(1, 1500).then(data => result = data);

      tick(250);

      expect(result).toBe(true);

      // Verify the balance was updated
      let account: any;
      service.getAccountById(1).then(data => account = data);
      tick(200);

      expect(account.balance).toBe(1500);
    }));

    it('should reject update for non-existent account', fakeAsync(() => {
      let error: any;

      service.updateBalance(999, 1500).catch(err => error = err);

      tick(250);

      expect(error).toBeDefined();
      expect(error.message).toContain('Account not found');
    }));

    it('should handle multiple balance updates', fakeAsync(() => {
      let result1: any;
      let result2: any;

      service.updateBalance(1, 1500).then(data => result1 = data);
      tick(250);

      service.updateBalance(1, 2000).then(data => result2 = data);
      tick(250);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      let account: any;
      service.getAccountById(1).then(data => account = data);
      tick(200);

      expect(account.balance).toBe(2000);
    }));
  });

  describe('deleteAccount', () => {
    it('should delete existing account', fakeAsync(() => {
      let result: any;

      service.deleteAccount(2).then(data => result = data);

      tick(150);

      expect(result).toBe(true);

      // Verify account was deleted
      let accounts: any;
      service.getAccounts().then(data => accounts = data);
      tick(300);

      expect(accounts.length).toBe(2);
      expect(accounts.find((a: any) => a.id === 2)).toBeUndefined();
    }));

    it('should return false for non-existent account', fakeAsync(() => {
      let result: any;

      service.deleteAccount(999).then(data => result = data);

      tick(150);

      expect(result).toBe(false);
    }));

    it('should maintain data integrity after deletion', fakeAsync(() => {
      service.deleteAccount(2).then(() => {});
      tick(150);

      let accounts: any;
      service.getAccounts().then(data => accounts = data);
      tick(300);

      expect(accounts.length).toBe(2);
      expect(accounts[0].id).toBe(1);
      expect(accounts[1].id).toBe(3);
    }));
  });

  describe('createAccount', () => {
    it('should create new account', fakeAsync(() => {
      const newAccountData = {
        accountNumber: '99999999',
        balance: 750,
        currency: 'USD'
      };

      let newAccount: any;

      service.createAccount(newAccountData).then(data => newAccount = data);

      tick(400);

      expect(newAccount).toBeDefined();
      expect(newAccount.id).toBe(4);
      expect(newAccount.accountNumber).toBe('99999999');
      expect(newAccount.balance).toBe(750);
      expect(newAccount.currency).toBe('USD');
    }));

    it('should add account to the list', fakeAsync(() => {
      const newAccountData = {
        accountNumber: '99999999',
        balance: 750,
        currency: 'USD'
      };

      service.createAccount(newAccountData).then(() => {});
      tick(400);

      let accounts: any;
      service.getAccounts().then(data => accounts = data);
      tick(300);

      expect(accounts.length).toBe(4);
      expect(accounts[3].accountNumber).toBe('99999999');
    }));

    it('should assign incremental ids', fakeAsync(() => {
      const accountData1 = {
        accountNumber: '11111111',
        balance: 100,
        currency: 'USD'
      };

      const accountData2 = {
        accountNumber: '22222222',
        balance: 200,
        currency: 'EUR'
      };

      let account1: any;
      let account2: any;

      service.createAccount(accountData1).then(data => account1 = data);
      tick(400);

      service.createAccount(accountData2).then(data => account2 = data);
      tick(400);

      expect(account1.id).toBe(4);
      expect(account2.id).toBe(5);
    }));
  });

  describe('Complex async scenarios', () => {
    it('should handle create followed by retrieve', fakeAsync(() => {
      const newAccountData = {
        accountNumber: '88888888',
        balance: 1200,
        currency: 'GBP'
      };

      let createdAccount: any;
      let retrievedAccount: any;

      service.createAccount(newAccountData).then(data => {
        createdAccount = data;
        return service.getAccountById(data.id);
      }).then(data => {
        retrievedAccount = data;
      });

      flush();

      expect(createdAccount).toBeDefined();
      expect(retrievedAccount).toBeDefined();
      expect(retrievedAccount.id).toBe(createdAccount.id);
      expect(retrievedAccount.balance).toBe(1200);
    }));

    it('should handle update followed by delete', fakeAsync(() => {
      let updateResult: any;
      let deleteResult: any;

      service.updateBalance(1, 5000).then(result => {
        updateResult = result;
        return service.deleteAccount(1);
      }).then(result => {
        deleteResult = result;
      });

      flush();

      expect(updateResult).toBe(true);
      expect(deleteResult).toBe(true);

      let account: any;
      service.getAccountById(1).then(data => account = data);
      tick(200);

      expect(account).toBeNull();
    }));

    it('should handle parallel operations', fakeAsync(() => {
      let results: any = {};

      Promise.all([
        service.getAccountById(1),
        service.getAccountById(2),
        service.updateBalance(3, 1000),
        service.createAccount({ accountNumber: '77777777', balance: 800, currency: 'USD' })
      ]).then(([account1, account2, updateResult, newAccount]) => {
        results = { account1, account2, updateResult, newAccount };
      });

      flush();

      expect(results.account1.id).toBe(1);
      expect(results.account2.id).toBe(2);
      expect(results.updateResult).toBe(true);
      expect(results.newAccount.accountNumber).toBe('77777777');
    }));

    it('should use flush() to complete all pending operations', fakeAsync(() => {
      let completed = false;

      service.createAccount({ accountNumber: '66666666', balance: 600, currency: 'EUR' })
        .then(() => service.getAccounts())
        .then(() => service.updateBalance(1, 3000))
        .then(() => service.deleteAccount(2))
        .then(() => {
          completed = true;
        });

      // Instead of calculating exact ticks, use flush()
      flush();

      expect(completed).toBe(true);
    }));
  });
});
