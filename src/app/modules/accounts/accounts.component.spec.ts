import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { AccountsComponent } from './accounts.component';
import { ThemeService } from 'app/core/theme/theme.service';
import { AccountsService } from './accounts.service';
import { AccountSectionModalComponent } from './account-section-modal/account-section-modal.component';
import { AccountTransferModalComponent } from './account-transfer-modal/account-transfer-modal.component';
import { ChartService } from '@shared/services/chart.service';
import { CommonService } from '@shared/services/common.service';
import { PaginationService } from '@shared/services/pagination.service';
import { IAccount, MonthlyTrendDto } from '@shared/interfaces/account.model';

const makeAccount = (overrides: Partial<IAccount> = {}): IAccount => ({
  id: 'a-1',
  name: 'BBVA',
  currentAmount: 1000,
  value: 1000,
  showSection: true,
  colorPalette: '#3570B4',
  isPrimary: true,
  disable: false,
  ownerId: 'u-1',
  ...overrides
});

describe('AccountsComponent', () => {
  let fixture: ComponentFixture<AccountsComponent>;
  const schemeSignal = signal<'light' | 'dark' | 'auto'>('light');
  let component: AccountsComponent;

  let accountsApi: {
    getAccountsWithGraphics: jest.Mock;
    getMonthlyTrend: jest.Mock;
    getAccountLedger: jest.Mock;
  };
  let chart: { mapPieChartGraphicData: jest.Mock };
  let paginationService: { getDefaultPagination: jest.Mock };
  let dialog: { open: jest.Mock };
  let dialogResult: unknown;

  const accounts: IAccount[] = [
    makeAccount(),
    makeAccount({ id: 'a-2', name: 'Nu', currentAmount: 500, colorPalette: '#6200a3' })
  ];
  const graphicsFixture = { series: [{ name: 'BBVA', data: [1000] }] };
  const trendFixture: MonthlyTrendDto = {
    months: ['Ene', 'Feb'],
    incomes: [100, 200],
    expenses: [50, 75]
  };
  const ledgerRows = [
    { transactionDate: '2026-06-01T10:00:00', description: 'Súper', debitAmount: 200, creditAmount: 0, balance: 800 },
    { transactionDate: '2026-06-02T09:00:00', description: 'Nómina', debitAmount: 0, creditAmount: 500, balance: 1300 }
  ];
  const PIE_CHART = { chart: { type: 'pie' }, labels: ['BBVA'] };

  function setup(): void {
    dialogResult = undefined;
    accountsApi = {
      getAccountsWithGraphics: jest.fn().mockReturnValue(of({ rows: accounts, graphics: graphicsFixture })),
      getMonthlyTrend: jest.fn().mockReturnValue(of(trendFixture)),
      getAccountLedger: jest.fn().mockReturnValue(of({ rows: ledgerRows, count: 2 }))
    };
    chart = { mapPieChartGraphicData: jest.fn().mockReturnValue(PIE_CHART) };
    paginationService = {
      getDefaultPagination: jest.fn(() => ({ limit: 25, offset: 0, searchText: null, count: 0, showInputSearch: false }))
    };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };

    TestBed.configureTestingModule({
    imports: [AccountsComponent],
    providers: [
        { provide: ThemeService, useValue: { scheme: schemeSignal, setScheme: jest.fn(), resolvedScheme: () => 'light', init: jest.fn(), toggle: jest.fn() } },
        { provide: AccountsService, useValue: accountsApi },
        { provide: ChartService, useValue: chart },
        { provide: CommonService, useValue: {} },
        { provide: PaginationService, useValue: paginationService },
        { provide: MatDialog, useValue: dialog }
    ]
});

    // The component declares its own providers (AccountsService, CommonService,
    // ChartService) which would shadow the TestBed mocks, and its template hosts
    // apexcharts + a matMenu exportAs reference that jsdom cannot render.
    // Strip both and test the class logic only.
    TestBed.overrideComponent(AccountsComponent, { set: { template: '', providers: [] } });

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
  }

  function init(): void {
    setup();
    component.ngOnInit();
  }

  describe('initial load', () => {
    it('should load accounts, build both charts and fetch the first account ledger', () => {
      init();

      expect(accountsApi.getAccountsWithGraphics).toHaveBeenCalledTimes(1);
      expect(accountsApi.getMonthlyTrend).toHaveBeenCalledWith(6);

      expect(component.accounts()).toEqual(accounts);
      expect(chart.mapPieChartGraphicData).toHaveBeenCalledWith(graphicsFixture);
      expect(component.accountChart()).toBe(PIE_CHART);

      expect(component.selectedAccountId()).toBe('a-1');
      expect(accountsApi.getAccountLedger).toHaveBeenCalledWith('a-1', {
        limit: 25,
        offset: 0,
        startDate: '',
        endDate: ''
      });
      expect(component.ledgerEntries()).toEqual(ledgerRows);
      expect(component.pagination().count).toBe(2);
      expect(component.isDataLoaded()).toBe(true);
    });

    it('should build the monthly trend chart from the trend DTO', () => {
      init();

      expect(component.monthlyTrendChart().series).toEqual([
        { name: 'Ingresos', data: [100, 200] },
        { name: 'Gastos', data: [50, 75] }
      ]);
      expect(component.monthlyTrendChart().xaxis.categories).toEqual(['Ene', 'Feb']);
      expect(component.monthlyTrendChart().colors).toEqual(['#4E8A6A', '#A64F4F']);
      expect(component.monthlyTrendChart().yaxis.labels.formatter(1000)).toBe('$ 1,000');
      expect(component.monthlyTrendChart().tooltip.y.formatter(1234.5)).toBe('$ 1,234.50');
    });

    it('should keep the current selection when the account still exists', () => {
      init();
      component.selectedAccountId.set('a-2');

      component.loadData();

      expect(component.selectedAccountId()).toBe('a-2');
      expect(accountsApi.getAccountLedger).toHaveBeenLastCalledWith('a-2', expect.any(Object));
    });

    it('should fall back to the first account when the selection no longer exists', () => {
      init();
      component.selectedAccountId.set('gone');

      component.loadData();

      expect(component.selectedAccountId()).toBe('a-1');
      expect(accountsApi.getAccountLedger).toHaveBeenLastCalledWith('a-1', expect.any(Object));
    });

    it('should not fetch a ledger when there are no accounts', () => {
      setup();
      accountsApi.getAccountsWithGraphics.mockReturnValue(of({ rows: [], graphics: { series: [] } }));

      component.ngOnInit();

      expect(component.accounts()).toEqual([]);
      expect(component.selectedAccountId()).toBe('');
      expect(accountsApi.getAccountLedger).not.toHaveBeenCalled();
      expect(component.isDataLoaded()).toBe(true);
    });

    it('should log the failure and still flag the data as loaded', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      setup();
      accountsApi.getAccountsWithGraphics.mockReturnValue(throwError(() => new Error('boom')));

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load account data:', expect.any(Error));
      expect(component.accounts()).toEqual([]);
      expect(component.isDataLoaded()).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('ledger', () => {
    it('should not call the API without a selected account', () => {
      setup();

      component.loadAccountLedger();

      expect(accountsApi.getAccountLedger).not.toHaveBeenCalled();
    });

    it('should log when the ledger fetch fails and keep the previous rows', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init();
      accountsApi.getAccountLedger.mockReturnValue(throwError(() => new Error('boom')));

      component.loadAccountLedger();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load ledger data:', expect.any(Error));
      expect(component.ledgerEntries()).toEqual(ledgerRows);
      consoleSpy.mockRestore();
    });

    it('should reset pagination and refetch with the new date range', () => {
      init();
      component.pagination.update(p => ({ ...p, offset: 50 }));

      component.onDateRangeChange({ startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(paginationService.getDefaultPagination).toHaveBeenCalledTimes(2); // field initializer + reset
      expect(component.startDate).toBe('2026-01-01');
      expect(component.endDate).toBe('2026-01-31');
      expect(accountsApi.getAccountLedger).toHaveBeenLastCalledWith('a-1', {
        limit: 25,
        offset: 0,
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });
    });

    it('should clear the dates when the range filter is removed', () => {
      init();
      component.onDateRangeChange({ startDate: '2026-01-01', endDate: '2026-01-31' });

      component.onDateRangeChange(null);

      expect(component.startDate).toBe('');
      expect(component.endDate).toBe('');
      expect(accountsApi.getAccountLedger).toHaveBeenLastCalledWith('a-1', expect.objectContaining({
        startDate: '',
        endDate: ''
      }));
    });

    it('should switch accounts with a fresh pagination', () => {
      init();
      component.pagination.update(p => ({ ...p, offset: 75 }));

      component.onAccountSelectionChange('a-2');

      expect(component.selectedAccountId()).toBe('a-2');
      expect(accountsApi.getAccountLedger).toHaveBeenLastCalledWith('a-2', expect.objectContaining({
        limit: 25,
        offset: 0
      }));
    });

    it('should apply pagination events to the ledger query', () => {
      init();

      component.onPageChange({ limit: 50, offset: 25 });

      expect(component.pagination().limit).toBe(50);
      expect(component.pagination().offset).toBe(25);
      expect(accountsApi.getAccountLedger).toHaveBeenLastCalledWith('a-1', {
        limit: 50,
        offset: 25,
        startDate: '',
        endDate: ''
      });
    });
  });

  describe('quick action modals', () => {
    it('should open the sections modal for the account and reload after a result', () => {
      init();
      dialogResult = { id: 's-1' };

      component.openSectionWithAccount('a-2');

      expect(dialog.open).toHaveBeenCalledWith(AccountSectionModalComponent, {
        width: '600px',
        maxWidth: '100vw',
        maxHeight: '100vh',
        data: { accounts, preSelectedAccountId: 'a-2' },
        disableClose: true
      });
      expect(accountsApi.getAccountsWithGraphics).toHaveBeenCalledTimes(2);
    });

    it('should not reload when the sections modal is dismissed', () => {
      init();
      dialogResult = undefined;

      component.openSectionWithAccount('a-1');

      expect(accountsApi.getAccountsWithGraphics).toHaveBeenCalledTimes(1);
    });

    it('should open the transfer modal for the account and reload after a result', () => {
      init();
      dialogResult = { ok: true };

      component.openTransferWithAccount('a-1');

      expect(dialog.open).toHaveBeenCalledWith(AccountTransferModalComponent, {
        width: '480px',
        maxWidth: '100vw',
        maxHeight: '100vh',
        data: { accounts, preSelectedAccountId: 'a-1' },
        disableClose: true
      });
      expect(accountsApi.getAccountsWithGraphics).toHaveBeenCalledTimes(2);
    });

    it('should not reload when the transfer modal is dismissed', () => {
      init();
      dialogResult = null;

      component.openTransferWithAccount('a-1');

      expect(accountsApi.getAccountsWithGraphics).toHaveBeenCalledTimes(1);
    });
  });

  describe('ledger presentation helpers', () => {
    it('builds transfer and section titles from origin/destination, falling back to the description', () => {
      init();

      expect(component.ledgerTitle({
        description: 'raw', linkedEntityType: 'Transfer',
        originAccount: { name: 'BBVA' }, destinationAccount: { name: 'Efectivo' },
      })).toBe('Transferencia: BBVA → Efectivo');

      expect(component.ledgerTitle({
        description: 'raw', linkedEntityType: 'AccountSection',
        originAccount: { name: 'BBVA' }, destinationAccount: { name: 'Vacaciones' },
      })).toBe('Apartado: BBVA → Vacaciones');

      expect(component.ledgerTitle({ description: 'Gasto en Costco', linkedEntityType: 'Expense' }))
        .toBe('Gasto en Costco');
      expect(component.ledgerTitle({ description: 'raw', linkedEntityType: 'Transfer' })).toBe('raw');
    });

    it('applies the ledger date-range form and clears it back to full history', () => {
      init();
      accountsApi.getAccountLedger.mockClear();

      component.ledgerRangeForm.setValue({ start: new Date(2026, 4, 1), end: new Date(2026, 4, 31) });
      component.onLedgerRangeChange();
      expect(component.startDate).toBe('2026-05-01');
      expect(component.endDate).toBe('2026-05-31');

      component.clearLedgerRange();
      expect(component.startDate).toBe('');
      expect(component.ledgerRangeForm.value.start).toBeNull();
    });

    it('ignores a half-filled ledger range', () => {
      init();
      accountsApi.getAccountLedger.mockClear();

      component.ledgerRangeForm.setValue({ start: new Date(2026, 4, 1), end: null });
      component.onLedgerRangeChange();

      expect(accountsApi.getAccountLedger).not.toHaveBeenCalled();
    });
  });

  describe('theme-aware charts', () => {
    it('rebuilds both charts when the scheme changes', fakeAsync(() => {
      schemeSignal.set('light');
      init();
      const trendBefore = component.monthlyTrendChart();
      chart.mapPieChartGraphicData.mockClear();

      schemeSignal.set('dark');
      fixture.detectChanges(); // flush the effect
      tick();

      expect(component.monthlyTrendChart()).not.toBe(trendBefore);
      // the pie mock returns a fixed object; assert the rebuild happened via the call
      expect(chart.mapPieChartGraphicData).toHaveBeenCalled();
    }));
  });


  describe('dashboard presentation getters', () => {
    it('derives totals, options and the selected account name/color', () => {
      init();

      expect(component.totalBalance()).toBeGreaterThan(0);
      expect(component.accountOptions()[0]).toEqual(
        expect.objectContaining({ value: expect.anything(), label: expect.any(String) }),
      );
      expect(component.selectedAccountName()).not.toBe('');
      expect(component.selectedAccountColor()).toMatch(/^#/);

      component.selectedAccountId.set('nope');
      expect(component.selectedAccountName()).toBe('');
      expect(component.selectedAccountColor()).toBe('#5F7386');
    });

    it('picks account icons by name heuristics', () => {
      init();

      expect(component.accountIcon({ name: 'Efectivo' } as never)).toBe('heroicons_outline:banknotes');
      expect(component.accountIcon({ name: 'Vales de Despensa' } as never)).toBe('heroicons_outline:credit-card');
      expect(component.accountIcon({ name: 'BBVA' } as never)).toBe('heroicons_outline:building-library');
      expect(component.accountIcon({ name: undefined } as never)).toBe('heroicons_outline:building-library');
    });

    it('signs ledger amounts by debit/credit', () => {
      init();

      expect(component.ledgerAmount({ debitAmount: 900, creditAmount: 0 })).toBe('−$900.00');
      expect(component.ledgerAmount({ debitAmount: 0, creditAmount: 122 })).toBe('+$122.00');
    });
  });

});
