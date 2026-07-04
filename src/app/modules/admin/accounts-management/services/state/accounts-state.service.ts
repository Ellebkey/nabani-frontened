import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import {
  IAccount,
  IAccountCreate,
  IAccountUpdate
} from '@shared/interfaces/account.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { AccountsApiService } from '../api/accounts-api.service';

/**
 * State Service Layer - Manages application state using signals
 *
 * Responsibilities:
 * - State management with signals
 * - Orchestrates API calls through AccountsApiService
 * - Provides computed signals for derived state
 * - Handles loading and error states
 * - Emits action streams for side effects
 */
@Injectable({ providedIn: 'root' })
export class AccountsStateService {
  private readonly accountsApi = inject(AccountsApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  // Private writable signals for internal state management
  private readonly accountsSignal = signal<IAccount[]>([]);
  private readonly selectedAccountSignal = signal<IAccount | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly searchQuerySignal = signal('');
  private readonly paginationSignal = signal<PaginationSetting>({
    limit: 25,
    offset: 0,
    searchText: null,
    count: 0,
    showInputSearch: false
  });

  // Public readonly signals for component consumption
  readonly accounts = this.accountsSignal.asReadonly();
  readonly selectedAccount = this.selectedAccountSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly searchQuery = this.searchQuerySignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();

  // Computed signals for derived state
  readonly accountCount = computed(() => this.accountsSignal().length);

  readonly filteredAccounts = computed(() => {
    const query = this.searchQuerySignal().toLowerCase();
    const accounts = this.accountsSignal();

    if (!query) return accounts;

    return accounts.filter(account =>
      account.name.toLowerCase().includes(query)
    );
  });

  readonly hasAccounts = computed(() => this.accountCount() > 0);

  readonly isEmpty = computed(() =>
    !this.loadingSignal() && this.accountCount() === 0
  );

  readonly isSuccess = computed(() =>
    !this.loadingSignal() && !this.errorSignal() && this.hasAccounts()
  );

  readonly isAccountSelected = computed(() => this.selectedAccountSignal() !== null);

  readonly totalBalance = computed(() =>
    this.accountsSignal().reduce((sum, account) => sum + account.currentAmount, 0)
  );

  readonly activeAccountsCount = computed(() =>
    this.accountsSignal().filter(account => !account.disable).length
  );

  // Action streams for side effects
  private readonly accountCreated$ = new Subject<IAccount>();
  private readonly accountUpdated$ = new Subject<IAccount>();
  private readonly accountDeleted$ = new Subject<string>();

  // Public observables for components to react to events
  readonly accountCreated = this.accountCreated$.asObservable();
  readonly accountUpdated = this.accountUpdated$.asObservable();
  readonly accountDeleted = this.accountDeleted$.asObservable();

  /**
   * Load all accounts from the API with current pagination settings
   */
  loadAccounts(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const currentPagination = this.paginationSignal();

    this.accountsApi.getAccounts({
      limit: currentPagination.limit,
      offset: currentPagination.offset,
      includeDisabled: true
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.accountsSignal.set(response.rows);
          this.paginationSignal.update(p => ({ ...p, count: response.count }));
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Failed to load accounts:', error);
          this.errorSignal.set('Error al cargar las cuentas');
          this.toast.error('Error al cargar las cuentas');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Load a single account and set as selected
   */
  loadAccount(id: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.accountsApi.getAccount(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account) => {
          this.selectedAccountSignal.set(account);
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Failed to load account:', error);
          this.errorSignal.set('Error al cargar la cuenta');
          this.toast.error('Error al cargar la cuenta');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Create a new account
   */
  createAccount(accountData: IAccountCreate): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.accountsApi.createAccount(accountData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newAccount) => {
          this.accountsSignal.update(accounts => [...accounts, newAccount]);
          this.accountCreated$.next(newAccount);
          this.toast.success('Cuenta creada exitosamente');
          this.loadingSignal.set(false);
          // Refresh to get updated count
          this.loadAccounts();
        },
        error: (error) => {
          console.error('Create account error:', error);
          this.errorSignal.set('Error al crear la cuenta');
          this.toast.error('Error al crear la cuenta');
          this.loadingSignal.set(false);
        }
      });
  }

  /**
   * Update an existing account
   */
  updateAccount(id: string, accountData: IAccountUpdate): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.accountsApi.updateAccount(id, accountData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedAccount) => {
          this.accountsSignal.update(accounts =>
            accounts.map(a => a.id === id ? updatedAccount : a)
          );

          if (this.selectedAccountSignal()?.id === id) {
            this.selectedAccountSignal.set(updatedAccount);
          }

          this.accountUpdated$.next(updatedAccount);
          this.toast.success('Cuenta actualizada exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Update account error:', error);
          this.errorSignal.set('Error al actualizar la cuenta');
          this.toast.error('Error al actualizar la cuenta');
          this.loadingSignal.set(false);
        }
      });
  }

  toggleAccountStatus(id: string): void {
    const account = this.accountsSignal().find(a => a.id === id);
    if (!account) return;

    const newStatus = !account.disable;

    this.accountsApi.toggleAccountStatus(id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedAccount) => {
          this.accountsSignal.update(accounts =>
            accounts.map(a => a.id === id ? updatedAccount : a)
          );
          this.toast.success(
            `Cuenta ${newStatus ? 'desactivada' : 'activada'} exitosamente`
          );
        },
        error: () => {
          this.toast.error('Error al cambiar el estado de la cuenta');
        }
      });
  }

  /**
   * Update pagination settings and reload accounts
   */
  updatePagination(paginationUpdate: Partial<PaginationSetting>): void {
    this.paginationSignal.update(current => ({ ...current, ...paginationUpdate }));
    this.loadAccounts();
  }

  /**
   * Set the search query for filtering
   */
  setSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
  }

  /**
   * Select an account
   */
  selectAccount(account: IAccount | null): void {
    this.selectedAccountSignal.set(account);
  }

  /**
   * Clear any errors
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Reset the state
   */
  resetState(): void {
    this.accountsSignal.set([]);
    this.selectedAccountSignal.set(null);
    this.searchQuerySignal.set('');
    this.paginationSignal.set({
      limit: 25,
      offset: 0,
      searchText: null,
      count: 0,
      showInputSearch: true
    });
    this.errorSignal.set(null);
    this.loadingSignal.set(false);
  }

}
