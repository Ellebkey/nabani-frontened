import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { es } from 'date-fns/locale';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of, throwError } from 'rxjs';

import { IncomesComponent } from './incomes.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CreateIncomeComponent } from './create-income/create-income.component';
import { IncomesService } from './incomes.service';
import { AccountsService } from '@app/modules/accounts/accounts.service';
import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { IIncome } from '@shared/interfaces/income.model';

describe('IncomesComponent', () => {
  let fixture: ComponentFixture<IncomesComponent>;
  let component: IncomesComponent;

  let incomesApi: { getIncomes: jest.Mock; getIncomeStats: jest.Mock; getIncomeDetails: jest.Mock; deleteIncome: jest.Mock };
  let accountsApi: { getAccounts: jest.Mock };
  let paginationService: { getDefaultPagination: jest.Mock };
  let common: { getDefaultDeleteConfirmation: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let dialog: { open: jest.Mock };
  let toast: { info: jest.Mock };
  let dialogResult: unknown;
  let confirmResult: unknown;

  const deleteConfig = { title: 'Remove income' };

  const incomeFixture: IIncome = {
    id: 7,
    totalAmount: 1500,
    incomeDate: '2026-06-08T18:45:00',
    comment: 'Quincena',
    concept: 'Nomina',
    accountId: 'acc-1',
    accountName: 'BBVA',
    accountColor: '#3570B4'
  };

  const baseParams = { limit: 25, offset: 0, searchText: null };

  beforeEach(() => {
    dialogResult = undefined;
    confirmResult = undefined;

    incomesApi = {
      getIncomes: jest.fn().mockReturnValue(of({ rows: [incomeFixture], count: 1 })),
      getIncomeStats: jest.fn().mockReturnValue(of({ currentMonth: 100, monthlyAverage: 200, currentYear: 300 })),
      getIncomeDetails: jest.fn().mockReturnValue(of({ ...incomeFixture })),
      deleteIncome: jest.fn().mockReturnValue(of(void 0))
    };
    accountsApi = {
      getAccounts: jest.fn().mockReturnValue(of({
        rows: [{ id: 'acc-1', name: 'BBVA', colorPalette: '#3570B4' }]
      }))
    };
    paginationService = {
      getDefaultPagination: jest.fn((showInput = false) => ({
        limit: 25,
        offset: 0,
        searchText: null,
        count: 0,
        showInputSearch: showInput
      }))
    };
    common = { getDefaultDeleteConfirmation: jest.fn(() => deleteConfig) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    toast = { info: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, MatMenuModule, MatIconTestingModule, EmptyStateComponent, IncomesComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        provideRouter([]), provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: es },
        provideNoopAnimations(),
        { provide: IncomesService, useValue: incomesApi },
        { provide: AccountsService, useValue: accountsApi },
        { provide: PaginationService, useValue: paginationService },
        { provide: CommonService, useValue: common },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: MatDialog, useValue: dialog },
        { provide: HotToastService, useValue: toast }
    ]
});
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(IncomesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('initial load', () => {
    it('should load accounts and the first page of incomes with default pagination', () => {
      createComponent();

      expect(paginationService.getDefaultPagination).toHaveBeenCalledWith();
      expect(accountsApi.getAccounts).toHaveBeenCalledTimes(1);
      expect(incomesApi.getIncomes).toHaveBeenCalledWith(baseParams);
      expect(component.accounts()).toEqual([{ id: 'acc-1', name: 'BBVA', colorPalette: '#3570B4' }]);
      expect(component.incomes()).toEqual([incomeFixture]);
      expect(component.pagination().count).toBe(1);
      expect(component.isDataLoaded()).toBe(true);
    });

    it('should show the Spanish empty state when there are no incomes and no filters', () => {
      incomesApi.getIncomes.mockReturnValue(of({ rows: [], count: 0 }));

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay ingresos registrados');
      expect(text).toContain('Crear primer ingreso');
      expect(text).not.toContain('Ingresos recientes');
    });

    it('should show the table section instead of the empty state when incomes exist', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Ingresos recientes');
      expect(text).not.toContain('No hay ingresos registrados');
      expect(fixture.nativeElement.querySelector('mg-pager')).not.toBeNull();
    });
  });

  describe('account filter', () => {
    it('should reset the offset and reload with the accountId param', () => {
      createComponent();
      component.pagination.update(p => ({ ...p, offset: 50 }));

      component.onAccountSelectionChange('acc-1');

      expect(component.selectedAccountId()).toBe('acc-1');
      expect(component.pagination().offset).toBe(0);
      expect(incomesApi.getIncomes).toHaveBeenLastCalledWith({ ...baseParams, accountId: 'acc-1' });
    });

    it('should drop the accountId param when "all accounts" (null) is selected', () => {
      createComponent();
      component.onAccountSelectionChange('acc-1');

      component.onAccountSelectionChange(null);

      expect(component.selectedAccountId()).toBeNull();
      expect(incomesApi.getIncomes).toHaveBeenLastCalledWith(baseParams);
    });
  });

  describe('date range filter', () => {
    it('should reset the offset and reload with startDate and endDate', () => {
      createComponent();
      component.pagination.update(p => ({ ...p, offset: 25 }));

      component.onDateRangeChange({ startDate: '2026-06-01', endDate: '2026-06-30' });

      expect(component.pagination().offset).toBe(0);
      expect(incomesApi.getIncomes).toHaveBeenLastCalledWith({
        ...baseParams,
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      });
    });

    it('should clear the date params when the range is removed', () => {
      createComponent();
      component.onDateRangeChange({ startDate: '2026-06-01', endDate: '2026-06-30' });

      component.onDateRangeChange(null);

      expect(component.startDate()).toBe('');
      expect(component.endDate()).toBe('');
      expect(incomesApi.getIncomes).toHaveBeenLastCalledWith(baseParams);
    });
  });

  describe('pagination', () => {
    it('should reload with the new limit, offset and search text', () => {
      createComponent();

      component.onPageChange({ limit: 50, offset: 25 });

      expect(component.pagination().limit).toBe(50);
      expect(component.pagination().offset).toBe(25);
      expect(incomesApi.getIncomes).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 50, offset: 25 })
      );
    });
  });

  describe('create income modal', () => {
    it('should open the create modal and reload when it closes with a result', () => {
      dialogResult = { id: 99 };

      createComponent();
      component.openCreateIncome();

      expect(dialog.open).toHaveBeenCalledWith(CreateIncomeComponent, {
        width: '460px',
        maxWidth: '100vw',
        disableClose: true
      });
      expect(incomesApi.getIncomes).toHaveBeenCalledTimes(3);
    });

    it('should not reload when the modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component.openCreateIncome();

      expect(incomesApi.getIncomes).toHaveBeenCalledTimes(2);
    });
  });

  describe('clone from template', () => {
    it('should fetch the income details and open the modal with them as data', () => {
      dialogResult = { id: 100 };

      createComponent();
      component.createIncomeFromTemplate(7);

      expect(incomesApi.getIncomeDetails).toHaveBeenCalledWith(7);
      expect(dialog.open).toHaveBeenCalledWith(CreateIncomeComponent, {
        width: '460px',
        maxWidth: '100vw',
        disableClose: true,
        data: { ...incomeFixture }
      });
      expect(incomesApi.getIncomes).toHaveBeenCalledTimes(3);
    });

    it('should do nothing without an income id', () => {
      createComponent();

      component.createIncomeFromTemplate(0);

      expect(incomesApi.getIncomeDetails).not.toHaveBeenCalled();
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('edit income', () => {
    it('should open the modal with the details flagged as edit mode', () => {
      dialogResult = { id: 7 };

      createComponent();
      component.editIncome(incomeFixture);

      expect(incomesApi.getIncomeDetails).toHaveBeenCalledWith(7);
      expect(dialog.open).toHaveBeenCalledWith(CreateIncomeComponent, {
        width: '460px',
        maxWidth: '100vw',
        disableClose: true,
        data: { ...incomeFixture, isEditMode: true }
      });
      expect(incomesApi.getIncomes).toHaveBeenCalledTimes(3);
    });

    it('should do nothing when the income has no id', () => {
      createComponent();

      component.editIncome({ ...incomeFixture, id: null });

      expect(incomesApi.getIncomeDetails).not.toHaveBeenCalled();
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('delete income', () => {
    it('should delete after confirmation, reload and toast in Spanish', () => {
      confirmResult = 'confirmed';

      createComponent();
      component.deleteIncome(incomeFixture);

      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'income' });
      expect(magueyConfirmation.open).toHaveBeenCalledWith(deleteConfig);
      expect(incomesApi.deleteIncome).toHaveBeenCalledWith(7);
      expect(incomesApi.getIncomes).toHaveBeenCalledTimes(3);
      expect(toast.info).toHaveBeenCalledWith('El registro fue eliminado correctamente.');
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component.deleteIncome(incomeFixture);

      expect(incomesApi.deleteIncome).not.toHaveBeenCalled();
    });

    it('should log the error and skip the toast when the delete fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      confirmResult = 'confirmed';
      const failure = new Error('boom');
      incomesApi.deleteIncome.mockReturnValue(throwError(() => failure));

      createComponent();
      component.deleteIncome(incomeFixture);

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(toast.info).not.toHaveBeenCalled();
      expect(incomesApi.getIncomes).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });
});
