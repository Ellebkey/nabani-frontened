import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of, throwError } from 'rxjs';

import { ExpensesItemDetailComponent } from './expenses-item-detail.component';
import { TransactionRowComponent } from '@shared/components/transaction-row/transaction-row.component';
import { DotComponent } from '@shared/components/dot/dot.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { CommonService } from '@shared/services/common.service';
import { MagueyConfirmationService } from '@root/@maguey/services/confirmation';
import { ExpensesCreateModalComponent } from '@app/modules/expenses/expenses-create-modal/expenses-create-modal.component';
import { IExpense } from '@shared/interfaces/expense.model';

describe('ExpensesItemDetailComponent', () => {
  let fixture: ComponentFixture<ExpensesItemDetailComponent>;
  let component: ExpensesItemDetailComponent;

  let expensesApi: { getExpenseById: jest.Mock; deleteExpense: jest.Mock };
  let common: { getDefaultDeleteConfirmation: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let dialog: { open: jest.Mock };
  let reloadSpy: jest.Mock;

  const confirmationConfig = { title: 'Remove expense' };

  const buildExpense = (overrides: Partial<IExpense> = {}): IExpense => ({
    id: 12,
    expenseDate: '2026-06-08T10:30:00',
    totalAmount: 350,
    isMonths: false,
    isPayout: true,
    remainingMonths: 0,
    totalMonths: 0,
    debtAmount: 0,
    paymentMethodId: 'pm-1',
    cardType: 'visa',
    cardIcon: 'icon.png',
    method: 'credit',
    backgroundColor: '#004481',
    recipientName: 'Costco',
    showDetail: false,
    articles: [],
    firstArticleName: 'Leche',
    shortName: 'BBVA Oro',
    cardNumber: '1234',
    ...overrides
  });

  const articlesFixture = [
    {
      articleId: 1, quantity: 2, units: 'pz', articleName: 'Leche', price: 25,
      subtotal: 50, onDiscount: false, categoryId: 1, subcategoryId: 11,
      categoryName: 'Súper', subcategoryName: 'Lácteos'
    }
  ];
  const tagsFixture = [{ id: 3, name: 'Casa', color: '#fff' }];

  beforeEach(() => {
    expensesApi = { getExpenseById: jest.fn(), deleteExpense: jest.fn() };
    common = { getDefaultDeleteConfirmation: jest.fn().mockReturnValue(confirmationConfig) };
    magueyConfirmation = { open: jest.fn() };
    dialog = { open: jest.fn() };

    TestBed.configureTestingModule({
    imports: [
        CommonModule,
        MatIconTestingModule,
        TransactionRowComponent,
        DotComponent,
        PillComponent,
        SkeletonComponent,
        ExpensesItemDetailComponent,
    ],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: ExpensesService, useValue: expensesApi },
        { provide: CommonService, useValue: common },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: MatDialog, useValue: dialog }
    ]
});

    fixture = TestBed.createComponent(ExpensesItemDetailComponent);
    component = fixture.componentInstance;
    component.expense = buildExpense();
    reloadSpy = jest.fn();
    component.reload.subscribe(reloadSpy);
  });

  describe('payment getters', () => {
    it.each<[string, string]>([
      ['credit', 'heroicons_outline:credit-card'],
      ['debit', 'heroicons_outline:credit-card'],
      ['transfer', 'heroicons_outline:arrows-right-left'],
      ['cash', 'heroicons_outline:banknotes'],
      ['wallet', 'heroicons_outline:wallet'],
      ['unknown', 'heroicons_outline:credit-card']
    ])('should map method %s to its icon', (method, icon) => {
      component.expense = buildExpense({ method });

      expect(component.paymentIcon).toBe(icon);
    });

    it('should join the short name and card number with a middle dot', () => {
      expect(component.paymentLabel).toBe('BBVA Oro · 1234');
    });

    it('should fall back to the short name alone when there is no card number', () => {
      component.expense = buildExpense({ cardNumber: null });

      expect(component.paymentLabel).toBe('BBVA Oro');
    });

    it('should be empty when the expense has no short name nor card number', () => {
      component.expense = buildExpense({ shortName: undefined as never, cardNumber: null });

      expect(component.paymentLabel).toBe('');
    });
  });

  describe('onDetailsClick', () => {
    it('should expand and load the articles and tags', () => {
      expensesApi.getExpenseById.mockReturnValue(of({ articles: articlesFixture, tags: tagsFixture }));

      component.onDetailsClick();

      expect(component.showDetails()).toBe(true);
      expect(expensesApi.getExpenseById).toHaveBeenCalledWith(12);
      expect(component.expense.articles).toEqual(articlesFixture);
      expect(component.expense.tags).toEqual(tagsFixture);
      expect(component.isLoadingDetails()).toBe(false);
    });

    it('should not refetch when the articles are already loaded', () => {
      component.expense = buildExpense({ articles: articlesFixture });

      component.onDetailsClick();

      expect(component.showDetails()).toBe(true);
      expect(expensesApi.getExpenseById).not.toHaveBeenCalled();
    });

    it('should stop the loading indicator when the detail fetch fails', () => {
      expensesApi.getExpenseById.mockReturnValue(throwError(() => new Error('boom')));

      component.onDetailsClick();

      expect(component.showDetails()).toBe(true);
      expect(component.isLoadingDetails()).toBe(false);
    });

    it('should collapse without refetching on the second click', () => {
      expensesApi.getExpenseById.mockReturnValue(of({ articles: [], tags: [] }));
      component.onDetailsClick();

      component.onDetailsClick();

      expect(component.showDetails()).toBe(false);
      expect(expensesApi.getExpenseById).toHaveBeenCalledTimes(1);
    });

    it('should build the category pill label and color for an article', () => {
      component.categoryColors = { 'Súper': '#C9A45C' };

      expect(component.articlePillLabel(articlesFixture[0] as never)).toBe('Súper · Lácteos');
      expect(component.articleColor(articlesFixture[0] as never)).toBe('#C9A45C');
      expect(component.articleColor({ categoryName: 'Otra' } as never)).toBe('#5F7386');
    });
  });

  describe('deleteExpense', () => {
    it('should delete and emit reload after the confirmation', async () => {
      magueyConfirmation.open.mockReturnValue({ afterClosed: () => of('confirmed') });
      expensesApi.deleteExpense.mockReturnValue(of({ deleted: true }));

      await component.deleteExpense();

      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'expense' });
      expect(magueyConfirmation.open).toHaveBeenCalledWith(confirmationConfig);
      expect(expensesApi.deleteExpense).toHaveBeenCalledWith(12);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should not delete when the confirmation is cancelled', async () => {
      magueyConfirmation.open.mockReturnValue({ afterClosed: () => of('cancelled') });

      await component.deleteExpense();

      expect(expensesApi.deleteExpense).not.toHaveBeenCalled();
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('should log and not emit when the deletion fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      magueyConfirmation.open.mockReturnValue({ afterClosed: () => of('confirmed') });
      expensesApi.deleteExpense.mockReturnValue(throwError(() => new Error('boom')));

      await component.deleteExpense();

      expect(consoleSpy).toHaveBeenCalled();
      expect(reloadSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('createExpenseFromTemplate', () => {
    it('should open the create modal flagged as a template and reload on success', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of({ id: 99 }) });

      component.createExpenseFromTemplate();

      expect(dialog.open).toHaveBeenCalledWith(ExpensesCreateModalComponent, {
        data: { ...component.expense, isTemplate: true },
        width: '1260px',
        height: '94vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        disableClose: true
      });
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should not reload when the clone modal is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(null) });

      component.createExpenseFromTemplate();

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('editExpense', () => {
    it('should fetch the full expense, open the edit modal and reload on success', () => {
      const fullExpense = { id: 12, articles: articlesFixture };
      expensesApi.getExpenseById.mockReturnValue(of(fullExpense));
      dialog.open.mockReturnValue({ afterClosed: () => of({ id: 12 }) });

      component.editExpense();

      expect(expensesApi.getExpenseById).toHaveBeenCalledWith(12);
      expect(dialog.open).toHaveBeenCalledWith(ExpensesCreateModalComponent, {
        data: fullExpense,
        width: '1260px',
        height: '94vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        disableClose: true
      });
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should not reload when the edit modal is dismissed', () => {
      expensesApi.getExpenseById.mockReturnValue(of({ id: 12 }));
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

      component.editExpense();

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('should log and skip the modal when the expense fetch fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expensesApi.getExpenseById.mockReturnValue(throwError(() => new Error('boom')));

      component.editExpense();

      expect(consoleSpy).toHaveBeenCalled();
      expect(dialog.open).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('template', () => {
    it('should render the invoice id, recipient and payment badge in the collapsed row', () => {
      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('INV-12');
      expect(text).toContain('Costco');
      expect(text).toContain('Leche'); // uppercasing is CSS-only, textContent keeps the raw value
      expect(text).toContain('BBVA Oro · 1234');
    });

    it('should show the row actions and the articles expando when expanded', () => {
      expensesApi.getExpenseById.mockReturnValue(of({ articles: articlesFixture, tags: tagsFixture }));
      component.onDetailsClick();

      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button[title="Editar"]')).toBeTruthy();
      expect(el.querySelector('button[title="Clonar"]')).toBeTruthy();
      expect(el.querySelector('button[title="Eliminar"]')).toBeTruthy();
      expect(el.textContent).toContain('Súper · Lácteos');
      expect(el.textContent).toContain('1 artículos');
    });
  });
});
