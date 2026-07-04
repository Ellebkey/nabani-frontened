import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { ExpensesCreditCardStatementComponent } from './expenses-credit-card-statement.component';
import { ExpensesCreateModalComponent } from '../expenses-create-modal/expenses-create-modal.component';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { AccountsService } from '@app/modules/accounts/accounts.service';
import { CommonService } from '@shared/services/common.service';
import { CreditCardDetails, CreditExpense, RegularExpense, StatementResponse } from '@shared/interfaces/expense.model';
import { IAccount } from '@shared/interfaces/account.model';

describe('ExpensesCreditCardStatementComponent', () => {
  let fixture: ComponentFixture<ExpensesCreditCardStatementComponent>;
  let component: ExpensesCreditCardStatementComponent;

  let expensesApi: {
    getCreditCards: jest.Mock;
    getCreditCardStatement: jest.Mock;
    getCreditDebt: jest.Mock;
    createCreditCardStatement: jest.Mock;
    updatePaymentMethod: jest.Mock;
    getExpenseById: jest.Mock;
  };
  let accountsApi: { getAccounts: jest.Mock };
  let common: { combineDateAndTime: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock; observe: jest.Mock };
  let dialog: { open: jest.Mock };

  const account1 = { id: 'acc-1', name: 'BBVA Cuenta', colorPalette: '#111' } as IAccount;
  const account2 = { id: 'acc-2', name: 'Santander', colorPalette: '#222' } as IAccount;

  const cardsFixture = [
    { id: 'pm-1', shortName: 'BBVA Oro', accountId: 'acc-1', backgroundColor: '#004481' }
  ];

  const creditCardDetails: CreditCardDetails = {
    id: 'pm-1',
    totalAprox: '450.15',
    totalAmount: '1550.10',
    name: 'BBVA Oro',
    cardType: 'visa',
    method: 'credit',
    backgroundColor: '#004481',
    cardIcon: 'icon.png',
    cardNumber: '1234',
    account: account1
  };

  const regularExpense: RegularExpense = {
    id: 1,
    expenseDate: '2026-05-20T10:00:00',
    totalAmount: '350.10',
    recipientName: 'Costco'
  };

  const buildCreditExpense = (overrides: Partial<CreditExpense> = {}): CreditExpense => ({
    id: 2,
    expenseDate: '2026-05-22T10:00:00',
    totalAmount: '1200',
    recipientName: 'Liverpool',
    isMonths: true,
    isPayout: false,
    calculateAmount: 100.05,
    remainingMonths: 12,
    totalMonths: 12,
    debtAmount: 1200,
    ...overrides
  });

  beforeEach(() => {
    expensesApi = {
      getCreditCards: jest.fn().mockReturnValue(of(cardsFixture)),
      getCreditCardStatement: jest.fn(),
      getCreditDebt: jest.fn(),
      createCreditCardStatement: jest.fn(),
      updatePaymentMethod: jest.fn(),
      getExpenseById: jest.fn()
    };
    accountsApi = { getAccounts: jest.fn().mockReturnValue(of({ rows: [account1, account2] })) };
    common = { combineDateAndTime: jest.fn().mockReturnValue('2026-06-10T14:30:00.000Z') };
    toast = {
      success: jest.fn(),
      error: jest.fn(),
      observe: jest.fn(() => (source: unknown) => source)
    };
    dialog = { open: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ExpensesCreditCardStatementComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: ExpensesService, useValue: expensesApi },
        { provide: AccountsService, useValue: accountsApi },
        { provide: CommonService, useValue: common },
        { provide: HotToastService, useValue: toast },
        { provide: MatDialog, useValue: dialog }
    ]
});

    fixture = TestBed.createComponent(ExpensesCreditCardStatementComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  /** Sets a valid search form and stubs the statement endpoints (onSearch re-runs after payments). */
  const primeSearch = (
    statement: StatementResponse = { regularExpenses: [], creditExpenses: [] },
    debt: CreditCardDetails = creditCardDetails
  ): Date => {
    const cutoff = new Date('2026-06-01T00:00:00');
    component.searchForm.setValue({ creditCard: 'pm-1', dateLimit: cutoff });
    expensesApi.getCreditCardStatement.mockReturnValue(of(statement));
    expensesApi.getCreditDebt.mockReturnValue(of(debt));
    return cutoff;
  };

  describe('ngOnInit', () => {
    it('should build a required search form that starts invalid', () => {
      expect(component.searchForm.value).toEqual({ creditCard: null, dateLimit: null });
      expect(component.searchForm.invalid).toBe(true);

      component.searchForm.get('creditCard')!.setValue('pm-1');
      expect(component.searchForm.invalid).toBe(true);

      component.searchForm.get('dateLimit')!.setValue(new Date('2026-06-01'));
      expect(component.searchForm.valid).toBe(true);
    });

    it('should load the credit cards and accounts', () => {
      expect(expensesApi.getCreditCards).toHaveBeenCalled();
      expect(accountsApi.getAccounts).toHaveBeenCalled();
      expect(component.creditCardsList()).toEqual(cardsFixture);
      expect(component.accounts()).toEqual([account1, account2]);
      expect(component.isInitialDataLoaded()).toBe(true);
    });

    it('should default the payment date and time to now', () => {
      expect(component.paymentDate()).toBeInstanceOf(Date);
      expect(component.maxPaymentDate).toBeInstanceOf(Date);
      expect(component.paymentTime()).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('onSearch', () => {
    it('should query the statement and debt, then publish them after the delay', fakeAsync(() => {
      const credit = buildCreditExpense();
      const cutoff = primeSearch({ regularExpenses: [regularExpense], creditExpenses: [credit] });

      component.onSearch();

      expect(component.isDataLoading()).toBe(true);
      expect(component.statementRecords()).toEqual([]);
      expect(expensesApi.getCreditCardStatement).toHaveBeenCalledWith({
        expenseDate: cutoff,
        paymentMethodId: 'pm-1'
      });
      expect(expensesApi.getCreditDebt).toHaveBeenCalledWith('pm-1');

      tick(1000);

      expect(component.statementRecords()).toEqual([regularExpense, credit]);
      expect(component.creditCard()).toEqual(creditCardDetails);
      expect(component.isDataLoading()).toBe(false);
    }));

    it('should reset the previous statement state before searching', fakeAsync(() => {
      primeSearch();
      component.reviewedStatementRecords.set([regularExpense]);
      component.totalReviewedAmount.set(350.1);
      component.creditCard.set(creditCardDetails);

      component.onSearch();

      expect(component.statementRecords()).toEqual([]);
      expect(component.reviewedStatementRecords()).toEqual([]);
      expect(component.totalReviewedAmount()).toBe(0);
      expect(component.creditCard()).toBeNull();

      tick(1000);
    }));

    it('should log when the search fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      primeSearch();
      expensesApi.getCreditDebt.mockReturnValue(throwError(() => new Error('boom')));

      component.onSearch();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.statementRecords()).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('review moves and totals (currency.js)', () => {
    let credit: CreditExpense;

    beforeEach(() => {
      credit = buildCreditExpense();
      component.statementRecords.set([regularExpense, credit]);
    });

    it('should move a record to reviewed and total its plain amount', () => {
      component.moveToReviewed(regularExpense);

      expect(component.statementRecords()).toEqual([credit]);
      expect(component.reviewedStatementRecords()).toEqual([regularExpense]);
      expect(component.totalReviewedAmount()).toBe(350.1);
    });

    it('should use calculateAmount for credit (months) records and add without float drift', () => {
      component.moveToReviewed(regularExpense);
      component.moveToReviewed(credit);

      // 350.10 + 100.05 would float-drift with plain numbers; currency.js keeps it exact
      expect(component.totalReviewedAmount()).toBe(450.15);
    });

    it('should move a record back to the statement and recalculate', () => {
      component.moveToReviewed(regularExpense);
      component.moveToReviewed(credit);

      component.moveBackToStatement(credit);

      expect(component.reviewedStatementRecords()).toEqual([regularExpense]);
      expect(component.statementRecords()).toEqual([credit]);
      expect(component.totalReviewedAmount()).toBe(350.1);
    });

    it('should move every record to reviewed at once', () => {
      component.moveAllToReviewed();

      expect(component.statementRecords()).toEqual([]);
      expect(component.reviewedStatementRecords()).toEqual([regularExpense, credit]);
      expect(component.totalReviewedAmount()).toBe(450.15);
    });

    it('should move every record back for review and zero the total', () => {
      component.moveAllToReviewed();

      component.moveAllForReview();

      expect(component.reviewedStatementRecords()).toEqual([]);
      expect(component.statementRecords()).toEqual([regularExpense, credit]);
      expect(component.totalReviewedAmount()).toBe(0);
    });

    it('should keep cent precision for amounts like 0.1 + 0.2', () => {
      component.statementRecords.set([]);
      component.reviewedStatementRecords.set([
        { ...regularExpense, totalAmount: '0.10' },
        buildCreditExpense({ calculateAmount: 0.2 })
      ]);

      component.calculateTotals();

      expect(component.totalReviewedAmount()).toBe(0.3);
    });
  });

  describe('processSelectedPayments', () => {
    it('should do nothing when there is nothing reviewed', () => {
      component.processSelectedPayments();

      expect(expensesApi.createCreditCardStatement).not.toHaveBeenCalled();
    });

    it('should build the payment payload, toast in Spanish and re-search on success', fakeAsync(() => {
      primeSearch();
      const lastMonth = buildCreditExpense({ remainingMonths: 1, debtAmount: 100.05 });
      component.creditCard.set({ ...creditCardDetails });
      component.reviewedStatementRecords.set([regularExpense, lastMonth]);
      component.calculateTotals();
      component.paymentDate.set(new Date('2026-06-10T00:00:00'));
      component.paymentTime.set('14:30');
      expensesApi.createCreditCardStatement.mockReturnValue(of({ ok: true }));

      component.processSelectedPayments();

      expect(common.combineDateAndTime).toHaveBeenCalledWith(component.paymentDate(), '14:30');
      expect(expensesApi.createCreditCardStatement).toHaveBeenCalledWith({
        paymentMethodName: 'BBVA Oro',
        paymentMethodId: 'pm-1',
        accountId: 'acc-1',
        totalAmount: 450.15,
        regularExpenses: [1],
        creditExpenses: [
          {
            ...lastMonth,
            isPayout: true,
            remainingMonths: 0,
            debtAmount: 0
          }
        ],
        paymentDate: '2026-06-10T14:30:00.000Z'
      });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Procesando...',
        success: 'Estado de cuenta guardado exitosamente',
        error: 'Error al guardar el estado de cuenta'
      });
      expect(component.reviewedStatementRecords()).toEqual([]);
      expect(component.totalReviewedAmount()).toBe(0);
      // success triggers a fresh search
      expect(expensesApi.getCreditCardStatement).toHaveBeenCalledTimes(1);
      tick(1000);
    }));

    it('should decrement the months and debt for ongoing credit records', fakeAsync(() => {
      primeSearch();
      const ongoing = buildCreditExpense({ remainingMonths: 12, debtAmount: 1200, calculateAmount: 100.05 });
      component.creditCard.set({ ...creditCardDetails });
      component.reviewedStatementRecords.set([ongoing]);
      component.calculateTotals();
      expensesApi.createCreditCardStatement.mockReturnValue(of({ ok: true }));

      component.processSelectedPayments();

      const payload = expensesApi.createCreditCardStatement.mock.calls[0][0];
      expect(payload.creditExpenses[0]).toEqual({
        ...ongoing,
        isPayout: false,
        remainingMonths: 11,
        debtAmount: 1099.95
      });
      expect(payload.regularExpenses).toEqual([]);
      tick(1000);
    }));

    it('should omit the payment date when no time is set', fakeAsync(() => {
      primeSearch();
      component.creditCard.set({ ...creditCardDetails });
      component.reviewedStatementRecords.set([regularExpense]);
      component.calculateTotals();
      component.paymentTime.set('');
      expensesApi.createCreditCardStatement.mockReturnValue(of({ ok: true }));

      component.processSelectedPayments();

      expect(common.combineDateAndTime).not.toHaveBeenCalled();
      expect(expensesApi.createCreditCardStatement.mock.calls[0][0].paymentDate).toBeUndefined();
      tick(1000);
    }));

    it('should swallow API errors via catchError and still clear and re-search', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      primeSearch();
      component.creditCard.set({ ...creditCardDetails });
      component.reviewedStatementRecords.set([regularExpense]);
      component.calculateTotals();
      expensesApi.createCreditCardStatement.mockReturnValue(throwError(() => new Error('offline')));

      component.processSelectedPayments();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.reviewedStatementRecords()).toEqual([]);
      expect(expensesApi.getCreditCardStatement).toHaveBeenCalledTimes(1);
      tick(1000);
      consoleSpy.mockRestore();
    }));
  });

  describe('editExpense', () => {
    const updatedExpense = {
      id: 1,
      expenseDate: '2026-05-21T09:00:00',
      totalAmount: 999,
      recipientName: 'Costco MX',
      isMonths: false,
      isPayout: true
    };

    it('should ignore records without id', () => {
      component.editExpense({ ...regularExpense, id: undefined as never });

      expect(expensesApi.getExpenseById).not.toHaveBeenCalled();
    });

    it('should open the edit modal, refetch and patch the statement row on success', () => {
      component.statementRecords.set([regularExpense]);
      const fullExpense = { id: 1, recipientName: 'Costco', articles: [] };
      expensesApi.getExpenseById
        .mockReturnValueOnce(of(fullExpense))
        .mockReturnValueOnce(of(updatedExpense));
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });

      component.editExpense(regularExpense);

      expect(dialog.open).toHaveBeenCalledWith(ExpensesCreateModalComponent, {
        disableClose: true,
        data: { ...fullExpense, isEditMode: true }
      });
      expect(expensesApi.getExpenseById).toHaveBeenCalledTimes(2);
      expect(component.statementRecords()[0]).toEqual({
        id: 1,
        expenseDate: '2026-05-21T09:00:00',
        totalAmount: '999',
        recipientName: 'Costco MX',
        isMonths: false,
        isPayout: true,
        calculateAmount: 0,
        remainingMonths: 0,
        totalMonths: 0,
        debtAmount: 0
      });
      expect(toast.success).toHaveBeenCalledWith('Gasto actualizado exitosamente');
    });

    it('should patch a reviewed row and recalculate the total', () => {
      const credit = buildCreditExpense({ id: 2, calculateAmount: 100.05 });
      component.reviewedStatementRecords.set([credit]);
      component.calculateTotals();
      expensesApi.getExpenseById
        .mockReturnValueOnce(of({ id: 2 }))
        .mockReturnValueOnce(of({
          id: 2,
          expenseDate: credit.expenseDate,
          totalAmount: 1200,
          recipientName: 'Liverpool',
          isMonths: true,
          isPayout: false,
          calculateAmount: 200,
          remainingMonths: 11,
          totalMonths: 12,
          debtAmount: 1000
        }));
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });

      component.editExpense(credit);

      expect(component.reviewedStatementRecords()[0]).toEqual(
        expect.objectContaining({ calculateAmount: 200, remainingMonths: 11, totalAmount: '1200' })
      );
      expect(component.totalReviewedAmount()).toBe(200);
    });

    it('should not refetch when the edit modal is dismissed', () => {
      expensesApi.getExpenseById.mockReturnValue(of({ id: 1 }));
      dialog.open.mockReturnValue({ afterClosed: () => of(null) });

      component.editExpense(regularExpense);

      expect(expensesApi.getExpenseById).toHaveBeenCalledTimes(1);
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should toast in Spanish when the refresh after editing fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expensesApi.getExpenseById
        .mockReturnValueOnce(of({ id: 1 }))
        .mockReturnValueOnce(throwError(() => new Error('boom')));
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });

      component.editExpense(regularExpense);

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar los datos');
      consoleSpy.mockRestore();
    });

    it('should toast in Spanish and skip the modal when the detail fetch fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expensesApi.getExpenseById.mockReturnValue(throwError(() => new Error('boom')));

      component.editExpense(regularExpense);

      expect(dialog.open).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Error al cargar los detalles del gasto');
      consoleSpy.mockRestore();
    });
  });

  describe('updateCreditCardAccount', () => {
    it('should do nothing without a loaded credit card', () => {
      component.updateCreditCardAccount('acc-2');

      expect(expensesApi.updatePaymentMethod).not.toHaveBeenCalled();
    });

    it('should do nothing when the account did not change', () => {
      component.creditCard.set({ ...creditCardDetails, account: account1 });

      component.updateCreditCardAccount('acc-1');

      expect(expensesApi.updatePaymentMethod).not.toHaveBeenCalled();
    });

    it('should update the payment method and swap the linked account on success', () => {
      component.creditCard.set({ ...creditCardDetails, account: account1 });
      component.searchForm.get('creditCard')!.setValue('pm-1');
      expensesApi.updatePaymentMethod.mockReturnValue(of({ id: 'pm-1' }));

      component.updateCreditCardAccount('acc-2');

      expect(expensesApi.updatePaymentMethod).toHaveBeenCalledWith('pm-1', { accountId: 'acc-2' });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Actualizando cuenta de tarjeta...',
        success: 'Cuenta actualizada exitosamente',
        error: 'Error al actualizar la cuenta'
      });
      expect(component.creditCard()!.account).toBe(account2);
      expect(component.isUpdatingAccount()).toBe(false);
    });

    it('should keep the current account when the update fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      component.creditCard.set({ ...creditCardDetails, account: account1 });
      component.searchForm.get('creditCard')!.setValue('pm-1');
      expensesApi.updatePaymentMethod.mockReturnValue(throwError(() => ({ error: 'boom' })));

      component.updateCreditCardAccount('acc-2');

      expect(component.creditCard()!.account).toBe(account1);
      expect(component.isUpdatingAccount()).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should keep the current account when the new id is unknown', () => {
      component.creditCard.set({ ...creditCardDetails, account: account1 });
      component.searchForm.get('creditCard')!.setValue('pm-1');
      expensesApi.updatePaymentMethod.mockReturnValue(of({ id: 'pm-1' }));

      component.updateCreditCardAccount('acc-unknown');

      expect(component.creditCard()!.account).toBe(account1);
      expect(component.isUpdatingAccount()).toBe(false);
    });
  });
});
