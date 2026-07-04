import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { AccountsStateService } from './accounts-state.service';
import { AccountsApiService } from '../api/accounts-api.service';
import { IAccount, AccountsResponse } from '@shared/interfaces/account.model';

describe('AccountsStateService', () => {
  let service: AccountsStateService;
  let api: {
    getAccounts: jest.Mock;
    getAccount: jest.Mock;
    createAccount: jest.Mock;
    updateAccount: jest.Mock;
    toggleAccountStatus: jest.Mock;
  };
  let toast: { success: jest.Mock; error: jest.Mock };

  const makeAccount = (overrides: Partial<IAccount> = {}): IAccount => ({
    id: 'acc-1',
    name: 'BBVA Nómina',
    currentAmount: 1500,
    value: 1500,
    showSection: false,
    colorPalette: '#3570B4',
    isPrimary: true,
    disable: false,
    ownerId: 'u-1',
    ...overrides
  });

  const seedAccounts = (accounts: IAccount[], count = accounts.length): void => {
    api.getAccounts.mockReturnValue(of({ rows: accounts, count }));
    service.loadAccounts();
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    api = {
      getAccounts: jest.fn(),
      getAccount: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      toggleAccountStatus: jest.fn()
    };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AccountsStateService,
        { provide: AccountsApiService, useValue: api },
        { provide: HotToastService, useValue: toast }
      ]
    });

    service = TestBed.inject(AccountsStateService);
  });

  describe('loadAccounts', () => {
    it('should request with current pagination plus includeDisabled and set rows + count', () => {
      const accounts = [makeAccount(), makeAccount({ id: 'acc-2', name: 'Efectivo', currentAmount: 300 })];
      seedAccounts(accounts, 7);

      expect(api.getAccounts).toHaveBeenCalledWith({ limit: 25, offset: 0, includeDisabled: true });
      expect(service.accounts()).toEqual(accounts);
      expect(service.pagination().count).toBe(7);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should only update signals AFTER the api resolves (signal golden rule)', () => {
      const response$ = new Subject<AccountsResponse>();
      api.getAccounts.mockReturnValue(response$.asObservable());

      service.loadAccounts();

      // server has not responded yet: state untouched, loading on
      expect(service.loading()).toBe(true);
      expect(service.accounts()).toEqual([]);
      expect(service.pagination().count).toBe(0);

      response$.next({ rows: [makeAccount()], count: 1 });
      response$.complete();

      expect(service.accounts()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
      expect(service.loading()).toBe(false);
    });

    it('should toast in Spanish, set error and leave rows intact on failure', () => {
      api.getAccounts.mockReturnValue(throwError(() => new Error('boom')));

      service.loadAccounts();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las cuentas');
      expect(service.error()).toBe('Error al cargar las cuentas');
      expect(service.accounts()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadAccount', () => {
    it('should set the selected account on success', () => {
      const account = makeAccount();
      api.getAccount.mockReturnValue(of(account));

      service.loadAccount('acc-1');

      expect(api.getAccount).toHaveBeenCalledWith('acc-1');
      expect(service.selectedAccount()).toEqual(account);
      expect(service.isAccountSelected()).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should toast and keep selection empty on failure', () => {
      api.getAccount.mockReturnValue(throwError(() => new Error('boom')));

      service.loadAccount('acc-1');

      expect(toast.error).toHaveBeenCalledWith('Error al cargar la cuenta');
      expect(service.error()).toBe('Error al cargar la cuenta');
      expect(service.selectedAccount()).toBeNull();
    });
  });

  describe('createAccount', () => {
    it('should append the created account, emit, toast and refresh the list', () => {
      const existing = makeAccount();
      seedAccounts([existing], 1);

      const created = makeAccount({ id: 'acc-9', name: 'Efectivo', currentAmount: 200 });
      const emitted: IAccount[] = [];
      service.accountCreated.subscribe(a => emitted.push(a));

      const refresh$ = new Subject<AccountsResponse>();
      api.createAccount.mockReturnValue(of(created));
      api.getAccounts.mockReturnValue(refresh$.asObservable());

      service.createAccount({ name: 'Efectivo', currentAmount: 200, colorPalette: '#ffcc00' });

      // appended after the create call resolved, before the refresh resolves
      expect(service.accounts()).toEqual([existing, created]);
      expect(emitted).toEqual([created]);
      expect(toast.success).toHaveBeenCalledWith('Cuenta creada exitosamente');

      refresh$.next({ rows: [existing, created], count: 2 });
      refresh$.complete();

      expect(service.pagination().count).toBe(2);
      expect(service.loading()).toBe(false);
    });

    it('should toast, set error and skip the refresh on failure', () => {
      seedAccounts([makeAccount()], 1);
      api.createAccount.mockReturnValue(throwError(() => new Error('boom')));

      service.createAccount({ name: 'Efectivo', currentAmount: 200, colorPalette: '#ffcc00' });

      expect(toast.error).toHaveBeenCalledWith('Error al crear la cuenta');
      expect(service.error()).toBe('Error al crear la cuenta');
      expect(service.accounts()).toHaveLength(1);
      expect(api.getAccounts).toHaveBeenCalledTimes(1); // only the seed load, no refresh
    });
  });

  describe('updateAccount', () => {
    it('should replace the account in the list after the server responds', () => {
      const a1 = makeAccount();
      const a2 = makeAccount({ id: 'acc-2', name: 'Efectivo' });
      seedAccounts([a1, a2]);

      const updated = makeAccount({ name: 'BBVA Oro' });
      const emitted: IAccount[] = [];
      service.accountUpdated.subscribe(a => emitted.push(a));
      api.updateAccount.mockReturnValue(of(updated));

      service.updateAccount('acc-1', { name: 'BBVA Oro' });

      expect(api.updateAccount).toHaveBeenCalledWith('acc-1', { name: 'BBVA Oro' });
      expect(service.accounts()).toEqual([updated, a2]);
      expect(emitted).toEqual([updated]);
      expect(toast.success).toHaveBeenCalledWith('Cuenta actualizada exitosamente');
    });

    it('should sync the selected account only when it matches the updated id', () => {
      const a1 = makeAccount();
      const a2 = makeAccount({ id: 'acc-2', name: 'Efectivo' });
      seedAccounts([a1, a2]);
      service.selectAccount(a2);

      api.updateAccount.mockReturnValue(of(makeAccount({ name: 'BBVA Oro' })));
      service.updateAccount('acc-1', { name: 'BBVA Oro' });

      expect(service.selectedAccount()).toEqual(a2);

      const updatedA2 = makeAccount({ id: 'acc-2', name: 'Cartera' });
      api.updateAccount.mockReturnValue(of(updatedA2));
      service.updateAccount('acc-2', { name: 'Cartera' });

      expect(service.selectedAccount()).toEqual(updatedA2);
    });

    it('should toast and leave the list intact on failure', () => {
      const a1 = makeAccount();
      seedAccounts([a1]);
      api.updateAccount.mockReturnValue(throwError(() => new Error('boom')));

      service.updateAccount('acc-1', { name: 'X' });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar la cuenta');
      expect(service.error()).toBe('Error al actualizar la cuenta');
      expect(service.accounts()).toEqual([a1]);
    });
  });

  describe('toggleAccountStatus', () => {
    it('should do nothing when the account is not in state', () => {
      service.toggleAccountStatus('missing');

      expect(api.toggleAccountStatus).not.toHaveBeenCalled();
    });

    it('should disable an active account and toast "desactivada"', () => {
      seedAccounts([makeAccount({ disable: false })]);
      const disabled = makeAccount({ disable: true });
      api.toggleAccountStatus.mockReturnValue(of(disabled));

      service.toggleAccountStatus('acc-1');

      expect(api.toggleAccountStatus).toHaveBeenCalledWith('acc-1', true);
      expect(service.accounts()[0].disable).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Cuenta desactivada exitosamente');
    });

    it('should re-enable a disabled account and toast "activada"', () => {
      seedAccounts([makeAccount({ disable: true })]);
      api.toggleAccountStatus.mockReturnValue(of(makeAccount({ disable: false })));

      service.toggleAccountStatus('acc-1');

      expect(api.toggleAccountStatus).toHaveBeenCalledWith('acc-1', false);
      expect(toast.success).toHaveBeenCalledWith('Cuenta activada exitosamente');
    });

    it('should toast and keep the previous status on failure', () => {
      seedAccounts([makeAccount({ disable: false })]);
      api.toggleAccountStatus.mockReturnValue(throwError(() => new Error('boom')));

      service.toggleAccountStatus('acc-1');

      expect(toast.error).toHaveBeenCalledWith('Error al cambiar el estado de la cuenta');
      expect(service.accounts()[0].disable).toBe(false);
    });
  });

  describe('updatePagination', () => {
    it('should merge the partial pagination and reload with it', () => {
      api.getAccounts.mockReturnValue(of({ rows: [], count: 0 }));

      service.updatePagination({ offset: 25, limit: 50 });

      expect(service.pagination().offset).toBe(25);
      expect(api.getAccounts).toHaveBeenCalledWith({ limit: 50, offset: 25, includeDisabled: true });
    });
  });

  describe('computed signals', () => {
    it('should derive count, totals and active accounts', () => {
      seedAccounts([
        makeAccount({ currentAmount: 1500 }),
        makeAccount({ id: 'acc-2', name: 'Efectivo', currentAmount: 250.5, disable: true })
      ]);

      expect(service.accountCount()).toBe(2);
      expect(service.hasAccounts()).toBe(true);
      expect(service.isEmpty()).toBe(false);
      expect(service.isSuccess()).toBe(true);
      expect(service.totalBalance()).toBe(1750.5);
      expect(service.activeAccountsCount()).toBe(1);
    });

    it('should filter accounts by the search query (case-insensitive)', () => {
      seedAccounts([
        makeAccount({ name: 'BBVA Nómina' }),
        makeAccount({ id: 'acc-2', name: 'Efectivo' })
      ]);

      service.setSearchQuery('bbva');

      expect(service.searchQuery()).toBe('bbva');
      expect(service.filteredAccounts()).toHaveLength(1);
      expect(service.filteredAccounts()[0].name).toBe('BBVA Nómina');

      service.setSearchQuery('');
      expect(service.filteredAccounts()).toHaveLength(2);
    });

    it('should be empty (not success) before anything loads', () => {
      expect(service.isEmpty()).toBe(true);
      expect(service.isSuccess()).toBe(false);
      expect(service.hasAccounts()).toBe(false);
    });
  });

  describe('state helpers', () => {
    it('should clear errors', () => {
      api.getAccounts.mockReturnValue(throwError(() => new Error('boom')));
      service.loadAccounts();
      expect(service.error()).not.toBeNull();

      service.clearError();

      expect(service.error()).toBeNull();
    });

    it('should reset every signal to its initial value', () => {
      seedAccounts([makeAccount()], 5);
      service.selectAccount(makeAccount());
      service.setSearchQuery('bbva');

      service.resetState();

      expect(service.accounts()).toEqual([]);
      expect(service.selectedAccount()).toBeNull();
      expect(service.searchQuery()).toBe('');
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(service.pagination()).toEqual({
        limit: 25,
        offset: 0,
        searchText: null,
        count: 0,
        showInputSearch: true
      });
    });
  });
});
