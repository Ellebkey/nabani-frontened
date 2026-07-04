import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ExpensesListComponent } from './expenses-list.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { MerchantsService } from '@app/modules/inventory/merchants.service';
import { PaginationService } from '@shared/services/pagination.service';
import { ExpensesCreateModalComponent } from '@app/modules/expenses/expenses-create-modal/expenses-create-modal.component';
import { ReceiptScanModalComponent } from '@app/modules/expenses/receipt-scan/receipt-scan-modal.component';
import { IExpenseDateGroup } from '@shared/interfaces/expense.model';

describe('ExpensesListComponent', () => {
  let fixture: ComponentFixture<ExpensesListComponent>;
  let component: ExpensesListComponent;

  let expensesApi: {
    getExpenses: jest.Mock;
    getExpensesByCategory: jest.Mock;
    getPaymentMethods: jest.Mock;
    getExpenseById: jest.Mock;
  };
  let merchantsApi: { getMerchantsList: jest.Mock };
  let paginationService: { getDefaultPagination: jest.Mock };
  let dialog: { open: jest.Mock };

  const dateGroups: IExpenseDateGroup[] = [
    { dateLabel: '2026-06-09', expenses: [{ id: 1 } as never] }
  ];
  const chartFixture = { series: [{ name: 'Gastos', data: [{ x: 'Hogar', y: 100 }] }] };

  beforeAll(() => {
    // Pin only Date so the "last 30 days" defaults are deterministic;
    // every timer API stays real to avoid clashing with zone.js.
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'setImmediate', 'clearImmediate', 'queueMicrotask',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback',
        'performance', 'hrtime', 'nextTick'
      ],
      now: new Date('2026-06-10T12:00:00')
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    expensesApi = {
      getExpenses: jest.fn().mockReturnValue(of({ rows: dateGroups, count: 1 })),
      getExpensesByCategory: jest.fn().mockReturnValue(of(chartFixture)),
      getPaymentMethods: jest.fn().mockReturnValue(of([{ id: 'pm-1', name: 'BBVA', method: 'credit' }])),
      getExpenseById: jest.fn()
    };
    merchantsApi = {
      getMerchantsList: jest.fn().mockReturnValue(of({ rows: [{ id: 'r-1', name: 'Costco' }], count: 1 }))
    };
    paginationService = {
      getDefaultPagination: jest.fn().mockImplementation(() => ({
        limit: 25, offset: 0, searchText: null, count: 0, showInputSearch: true
      }))
    };
    dialog = { open: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconTestingModule, EmptyStateComponent, ExpensesListComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: ExpensesService, useValue: expensesApi },
        { provide: MerchantsService, useValue: merchantsApi },
        { provide: PaginationService, useValue: paginationService },
        { provide: MatDialog, useValue: dialog }
    ]
});

    fixture = TestBed.createComponent(ExpensesListComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should load expenses and the category chart with default 30-day window', () => {
      component.ngOnInit();

      expect(paginationService.getDefaultPagination).toHaveBeenCalledWith(true);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        searchText: null,
        startDate: null,
        endDate: null,
        paymentId: undefined,
        recipientId: undefined,
        isDraft: false
      });
      expect(expensesApi.getExpensesByCategory).toHaveBeenCalledWith({
        startDate: '2026-05-11',
        endDate: '2026-06-10'
      });
      expect(component.expenses()).toEqual(dateGroups);
      expect(component.pagination().count).toBe(1);
      expect(component.expensesByCategory()).toEqual(chartFixture);
      expect(component.chartDateLabel()).toBe('Últimos 30 días');
      expect(component.isDataLoaded()).toBe(true);
    });

    it('should load the filter catalogs (payment methods + merchants)', () => {
      component.ngOnInit();

      expect(expensesApi.getPaymentMethods).toHaveBeenCalledWith({ isActive: true });
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledWith({ limit: 1000 });
      expect(component.paymentMethodList()).toEqual([{ id: 'pm-1', name: 'BBVA', method: 'credit' }]);
      expect(component.merchantList()).toEqual([{ id: 'r-1', name: 'Costco' }]);
    });

    it('should log and still mark data as loaded when the expense load fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expensesApi.getExpenses.mockReturnValue(throwError(() => new Error('boom')));

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.expenses()).toBeUndefined();
      expect(component.isDataLoaded()).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should log and leave the filter catalogs empty when their load fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expensesApi.getPaymentMethods.mockReturnValue(throwError(() => new Error('boom')));

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.paymentMethodList()).toEqual([]);
      expect(component.merchantList()).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('empty state', () => {
    it('should render the Spanish empty state when there are no expenses and no filters', () => {
      expensesApi.getExpenses.mockReturnValue(of({ rows: [], count: 0 }));

      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('No hay gastos registrados');
      expect(text).toContain('Los gastos aparecerán aquí cuando los registres');
      expect(text).toContain('Crear primer gasto');
    });
  });

  describe('hasActiveFilters', () => {
    it('should reflect date, merchant and payment filters', () => {
      component.ngOnInit();
      expect(component.hasActiveFilters()).toBe(false);

      component.startDate.set('2026-01-01');
      expect(component.hasActiveFilters()).toBe(true);

      component.startDate.set(null);
      component.recipientId.set(7);
      expect(component.hasActiveFilters()).toBe(true);

      component.recipientId.set(null);
      component.paymentId.set(3);
      expect(component.hasActiveFilters()).toBe(true);
    });
  });

  describe('filtering and pagination', () => {
    beforeEach(() => {
      component.ngOnInit();
      expensesApi.getExpenses.mockClear();
      expensesApi.getExpensesByCategory.mockClear();
    });

    it('should update the pagination and reload on page change', () => {
      component.onPageChange({ limit: 50, offset: 25 });

      expect(component.pagination().limit).toBe(50);
      expect(component.pagination().offset).toBe(25);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 25 })
      );
    });

    it('should reset the offset and reload with the debounced search text', fakeAsync(() => {
      component.pagination.update(p => ({ ...p, offset: 75 }));

      component.searchControl.setValue('  tv  ');
      tick(350);

      expect(component.pagination().searchText).toBe('tv');
      expect(component.pagination().offset).toBe(0);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith(
        expect.objectContaining({ searchText: 'tv', offset: 0 })
      );
    }));

    it('should apply a date range, reset the offset and label the chart with it', () => {
      component.pagination.update(p => ({ ...p, offset: 50 }));

      component.onDateRangeChange({ startDate: '2026-01-05', endDate: '2026-02-10' });

      expect(component.startDate()).toBe('2026-01-05');
      expect(component.endDate()).toBe('2026-02-10');
      expect(component.pagination().offset).toBe(0);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: '2026-01-05', endDate: '2026-02-10', offset: 0 })
      );
      expect(expensesApi.getExpensesByCategory).toHaveBeenCalledWith({
        startDate: '2026-01-05',
        endDate: '2026-02-10'
      });
      expect(component.chartDateLabel()).toBe('2026-Jan-05 — 2026-Feb-10');
    });

    it('should clear the date range when it is set to null', () => {
      component.onDateRangeChange({ startDate: '2026-01-05', endDate: '2026-02-10' });

      component.onDateRangeChange(null);

      expect(component.startDate()).toBeNull();
      expect(component.endDate()).toBeNull();
      expect(component.chartDateLabel()).toBe('Últimos 30 días');
    });

    it('should reload with the merchant filter when merchantId changes in the form', () => {
      component.expensesForm.get('merchantId')!.setValue(['r-1']);

      expect(component.recipientId()).toEqual(['r-1']);
      expect(component.pagination().offset).toBe(0);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: ['r-1'] })
      );
    });

    it('should reload with the payment filter when paymentMethodId changes in the form', () => {
      component.expensesForm.get('paymentMethodId')!.setValue(['pm-1']);

      expect(component.paymentId()).toEqual(['pm-1']);
      expect(component.pagination().offset).toBe(0);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: ['pm-1'] })
      );
    });

    it('should reload on demand via onReload', () => {
      component.onReload();

      expect(expensesApi.getExpenses).toHaveBeenCalledTimes(1);
    });
  });

  describe('openCreateExpense', () => {
    beforeEach(() => {
      component.ngOnInit();
      expensesApi.getExpenses.mockClear();
    });

    it('should open the create modal full screen and reload when it returns a result', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of({ id: 99 }) });

      component.openCreateExpense();

      expect(dialog.open).toHaveBeenCalledWith(ExpensesCreateModalComponent, {
        width: '1260px',
        height: '94vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        disableClose: true
      });
      expect(expensesApi.getExpenses).toHaveBeenCalledTimes(1);
    });

    it('should not reload when the create modal is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(null) });

      component.openCreateExpense();

      expect(expensesApi.getExpenses).not.toHaveBeenCalled();
    });
  });

  describe('openReceiptScan', () => {
    beforeEach(() => {
      component.ngOnInit();
      expensesApi.getExpenses.mockClear();
    });

    it('should open the scan modal and just reload for a plain result', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of({ created: true }) });

      component.openReceiptScan();

      expect(dialog.open).toHaveBeenCalledWith(ReceiptScanModalComponent, {
        width: '440px',
        maxWidth: '100vw',
        maxHeight: '100vh',
        disableClose: true
      });
      expect(expensesApi.getExpenses).toHaveBeenCalledTimes(1);
      expect(expensesApi.getExpenseById).not.toHaveBeenCalled();
    });

    it('should do nothing when the scan modal is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

      component.openReceiptScan();

      expect(expensesApi.getExpenses).not.toHaveBeenCalled();
    });

    it('should chain into the edit modal defaulting the draft flag, then always reload', () => {
      const fullExpense = { id: 7, recipientName: 'Costco' };
      expensesApi.getExpenseById.mockReturnValue(of(fullExpense));
      dialog.open
        .mockReturnValueOnce({ afterClosed: () => of({ openEdit: true, expense: { id: 7 } }) })
        .mockReturnValueOnce({ afterClosed: () => of(undefined) });

      component.openReceiptScan();

      expect(expensesApi.getExpenseById).toHaveBeenCalledWith(7);
      expect(dialog.open).toHaveBeenNthCalledWith(2, ExpensesCreateModalComponent, {
        data: { id: 7, recipientName: 'Costco', isDraft: true },
        width: '1260px',
        height: '94vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        disableClose: true
      });
      // the edit dialog reloads even when dismissed without a result
      expect(expensesApi.getExpenses).toHaveBeenCalledTimes(1);
    });

    it('should preserve an explicit isDraft=false on the chained edit', () => {
      expensesApi.getExpenseById.mockReturnValue(of({ id: 7, isDraft: false }));
      dialog.open
        .mockReturnValueOnce({ afterClosed: () => of({ openEdit: true, expense: { id: 7 } }) })
        .mockReturnValueOnce({ afterClosed: () => of(true) });

      component.openReceiptScan();

      expect(dialog.open.mock.calls[1][1].data.isDraft).toBe(false);
    });

    it('should log and skip the edit modal when the expense fetch fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expensesApi.getExpenseById.mockReturnValue(throwError(() => new Error('boom')));
      dialog.open.mockReturnValueOnce({ afterClosed: () => of({ openEdit: true, expense: { id: 7 } }) });

      component.openReceiptScan();

      expect(consoleSpy).toHaveBeenCalled();
      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(expensesApi.getExpenses).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
