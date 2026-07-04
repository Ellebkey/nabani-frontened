import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { es } from 'date-fns/locale';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { ExpensesCreateModalComponent } from './expenses-create-modal.component';
import { ExpensesService } from '../expenses.service';
import { ArticlesService } from '@app/modules/inventory/articles.service';
import { MerchantsService } from '@app/modules/inventory/merchants.service';
import { CommonService } from '@shared/services/common.service';
import { TagService } from '@shared/services/tag.service';
import { PaymentMethodsApiService } from '@app/modules/admin/payment-methods/services/api/payment-methods-api.service';
import { IExpenseArticles as IExpenseArticle } from '@shared/interfaces/expense.model';

describe('ExpensesCreateModalComponent', () => {
  let fixture: ComponentFixture<ExpensesCreateModalComponent>;
  let component: ExpensesCreateModalComponent;

  let expensesApi: {
    getCategoriesForUser: jest.Mock;
    getPaymentMethods: jest.Mock;
    saveExpense: jest.Mock;
    updateExpense: jest.Mock;
  };
  let articlesApi: { getArticleList: jest.Mock };
  let merchantsApi: { getMerchantsList: jest.Mock; createMerchant: jest.Mock };
  let tagsApi: { getTags: jest.Mock; createTagWithRandomColor: jest.Mock };
  let common: { combineDateAndTime: jest.Mock };
  let paymentMethodsApi: { createPaymentMethod: jest.Mock };
  let dialog: { open: jest.Mock };
  let dialogRef: { close: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock; observe: jest.Mock };

  const article: IExpenseArticle = {
    articleId: 10,
    articleName: 'Televisor',
    quantity: 1,
    units: 'pz',
    price: 450,
    onDiscount: false,
    categoryId: 2,
    subcategoryId: 21,
    categoryName: 'Hogar',
    subcategoryName: 'Electrónica',
    subtotal: 450
  } as IExpenseArticle;

  const editData = () => ({
    id: 5,
    recipientId: 'r-1',
    paymentMethodId: 'pm-1',
    expenseDate: '2026-06-08T18:45:00',
    isMonths: true,
    isPayout: false,
    totalMonths: 12,
    remainingMonths: 7,
    debtAmount: 1200,
    totalAmount: 2400,
    comment: 'TV a meses',
    tags: [{ id: 3, name: 'Casa', color: '#fff' }],
    articles: [
      {
        articleId: 10,
        articleName: 'Televisor',
        quantity: '1',
        units: 'pz',
        price: '2400',
        onDiscount: false,
        categoryId: 2,
        subcategoryId: 21,
        categoryName: 'Hogar',
        subcategoryName: 'Electrónica',
        subtotal: '2400'
      }
    ]
  });

  function setup(data: unknown = null): void {
    expensesApi = {
      getCategoriesForUser: jest.fn().mockReturnValue(of([])),
      getPaymentMethods: jest.fn().mockReturnValue(of([])),
      saveExpense: jest.fn(),
      updateExpense: jest.fn()
    };
    articlesApi = { getArticleList: jest.fn().mockReturnValue(of({ rows: [], count: 0 })) };
    merchantsApi = {
      getMerchantsList: jest.fn().mockReturnValue(of({ rows: [], count: 0 })),
      createMerchant: jest.fn()
    };
    tagsApi = {
      getTags: jest.fn().mockReturnValue(of({ rows: [], count: 0 })),
      createTagWithRandomColor: jest.fn()
    };
    common = { combineDateAndTime: jest.fn().mockReturnValue('2026-06-10T14:30:00') };
    paymentMethodsApi = { createPaymentMethod: jest.fn() };
    dialog = { open: jest.fn() };
    dialogRef = { close: jest.fn() };
    toast = {
      success: jest.fn(),
      error: jest.fn(),
      observe: jest.fn(() => (source: unknown) => source)
    };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ExpensesCreateModalComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: es },
        { provide: ExpensesService, useValue: expensesApi },
        { provide: ArticlesService, useValue: articlesApi },
        { provide: MerchantsService, useValue: merchantsApi },
        { provide: CommonService, useValue: common },
        { provide: TagService, useValue: tagsApi },
        { provide: PaymentMethodsApiService, useValue: paymentMethodsApi },
        { provide: MatDialog, useValue: dialog },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: data }
    ]
});

    fixture = TestBed.createComponent(ExpensesCreateModalComponent);
    component = fixture.componentInstance;
  }

  function init(data: unknown = null): void {
    setup(data);
    component.ngOnInit();
  }

  describe('create mode (no dialog data)', () => {
    it('should initialize the form with defaults and no shareScope control', () => {
      init(null);

      expect(component.isEditMode()).toBe(false);
      expect(component.title()).toBe('Registrar gasto');
      expect(component.expenseForm.value).toEqual({
        recipientId: null,
        paymentMethodId: null,
        expenseDate: null,
        expenseTime: expect.stringMatching(/^\d{2}:\d{2}$/),
        isMonths: false,
        totalMonths: null,
        comment: null,
        tagIds: []
      });
      expect(component.expenseForm.get('shareScope')).toBeNull();
      expect(component.expenseForm.invalid).toBe(true);
    });

    it('should load all catalogs and assign them', () => {
      setup(null);
      const categories = [{ id: 1, name: 'Hogar', colorPalette: null, enabledTiers: ['free'], subcategories: [] }];
      expensesApi.getCategoriesForUser.mockReturnValue(of(categories));
      expensesApi.getPaymentMethods.mockReturnValue(of([{ id: 'pm-1', method: 'credit', name: 'BBVA' }]));
      articlesApi.getArticleList.mockReturnValue(of({ rows: [{ id: 10, concept: 'Televisor' }], count: 1 }));
      merchantsApi.getMerchantsList.mockReturnValue(of({ rows: [{ id: 'r-1', name: 'Costco' }], count: 1 }));
      tagsApi.getTags.mockReturnValue(of({ rows: [{ id: 3, name: 'Casa' }], count: 1 }));

      component.ngOnInit();

      expect(articlesApi.getArticleList).toHaveBeenCalledWith({ limit: 10000, fetchAll: 'false' });
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledWith({ limit: 10000, fetchAll: 'false' });
      expect(expensesApi.getPaymentMethods).toHaveBeenCalledWith({ isActive: true });
      expect(tagsApi.getTags).toHaveBeenCalledWith({ fetchAll: true });
      expect(component.categories()).toEqual(categories);
      expect(component.payments()).toEqual([{ id: 'pm-1', method: 'credit', name: 'BBVA' }]);
      expect(component.articles()).toEqual([{ id: 10, concept: 'Televisor' }]);
      expect(component.merchants()).toEqual([{ id: 'r-1', name: 'Costco' }]);
      expect(component.tags()).toEqual([{ id: 3, name: 'Casa' }]);
    });

    it('should leave catalogs empty and log when the initial load fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      setup(null);
      expensesApi.getCategoriesForUser.mockReturnValue(throwError(() => new Error('boom')));

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.categories()).toEqual([]);
      expect(component.payments()).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should require totalMonths only while isMonths is on', () => {
      init(null);
      const totalMonths = component.expenseForm.get('totalMonths')!;

      component.expenseForm.get('isMonths')!.setValue(true);
      expect(totalMonths.invalid).toBe(true);

      totalMonths.setValue(6);
      expect(totalMonths.valid).toBe(true);

      component.expenseForm.get('isMonths')!.setValue(false);
      totalMonths.setValue(null);
      expect(totalMonths.valid).toBe(true);
    });
  });

  describe('edit mode', () => {
    it('should patch the form from the expense', () => {
      init(editData());

      expect(component.isEditMode()).toBe(true);
      expect(component.title()).toBe('Actualizar gasto');
      expect(component.expenseForm.value).toEqual(
        expect.objectContaining({
          recipientId: 'r-1',
          paymentMethodId: 'pm-1',
          expenseDate: new Date('2026-06-08T18:45:00'),
          expenseTime: '18:45',
          isMonths: true,
          totalMonths: 12,
          comment: 'TV a meses',
          tagIds: [3]
        })
      );
      expect(component.expense().remainingMonths).toBe(7);
      expect(component.expense().debtAmount).toBe(1200);
      expect(component.expense().articles).toEqual([
        expect.objectContaining({ articleId: 10, quantity: 1, price: 2400, subtotal: 2400 })
      ]);
    });

    it('should leave recipient, payment, date and comment empty for drafts', () => {
      init({ ...editData(), isDraft: true });

      expect(component.title()).toBe('Completar gasto');
      expect(component.expenseForm.value).toEqual(
        expect.objectContaining({
          recipientId: null,
          paymentMethodId: null,
          expenseDate: null,
          expenseTime: null,
          comment: null
        })
      );
      expect(component.expense().recipientId).toBe('');
      expect(component.expense().expenseDate).toBe('');
    });

    it('should treat template data as a clone, not an edit', () => {
      init({ ...editData(), isTemplate: true });

      expect(component.isEditMode()).toBe(false);
      expect(component.title()).toBe('Registrar gasto');
      expect(component.expenseForm.value.recipientId).toBe('r-1');
      expect(component.expenseForm.value.expenseDate).toBe('');
      expect(component.expense().isPayout).toBeNull();
      expect(component.expense().totalAmount).toBe(2400);
      expect(component.expense().articles).toHaveLength(1);
    });
  });

  describe('save', () => {
    function fillValidCreateForm(): void {
      component.expenseForm.patchValue({
        recipientId: 'r-1',
        paymentMethodId: 'pm-1',
        expenseDate: new Date('2026-06-10T00:00:00'),
        expenseTime: '14:30'
      });
      component.onArticlesChange([article]);
      component.onTotalAmountChange(450);
    }

    it('should not call the API when the form is invalid', () => {
      init(null);
      component.onArticlesChange([article]);

      component.save();

      expect(expensesApi.saveExpense).not.toHaveBeenCalled();
      expect(expensesApi.updateExpense).not.toHaveBeenCalled();
    });

    it('should not call the API when there are no articles', () => {
      init(null);
      fillValidCreateForm();
      component.onArticlesChange([]);

      component.save();

      expect(expensesApi.saveExpense).not.toHaveBeenCalled();
    });

    it('should save a new expense with combined date and credit defaults, without a shareScope key', fakeAsync(() => {
      init(null);
      fillValidCreateForm();
      component.expenseForm.patchValue({ isMonths: true, totalMonths: 6 });
      expensesApi.saveExpense.mockReturnValue(of({ id: 99 }));

      component.save();

      expect(common.combineDateAndTime).toHaveBeenCalledWith(new Date('2026-06-10T00:00:00'), '14:30');
      expect(expensesApi.saveExpense).toHaveBeenCalledTimes(1);
      const payload = expensesApi.saveExpense.mock.calls[0][0];
      expect(payload).toEqual(
        expect.objectContaining({
          recipientId: 'r-1',
          paymentMethodId: 'pm-1',
          expenseDate: '2026-06-10T14:30:00',
          isMonths: true,
          totalMonths: 6,
          remainingMonths: 6,
          debtAmount: 450,
          totalAmount: 450
        })
      );
      expect(payload.isDraft).toBeUndefined();
      // Family Mode v2: sharing is category-driven; the expense payload carries no shareScope
      expect(payload).not.toHaveProperty('shareScope');
      // The group's own `disabled` flag is clobbered back to VALID by the isMonths
      // valueChanges listener running mid-disable (see findings); the controls
      // themselves do end up disabled.
      expect(component.expenseForm.get('recipientId')!.disabled).toBe(true);
      expect(component.expenseForm.get('paymentMethodId')!.disabled).toBe(true);

      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 99 });
    }));

    it('should not default credit fields when the expense is not in months', fakeAsync(() => {
      init(null);
      fillValidCreateForm();
      expensesApi.saveExpense.mockReturnValue(of({ id: 100 }));

      component.save();

      const payload = expensesApi.saveExpense.mock.calls[0][0];
      expect(payload.isMonths).toBe(false);
      expect(payload.remainingMonths).toBe(0);
      expect(payload.debtAmount).toBe(0);
      tick(500);
    }));

    it('should update an existing expense with isDraft false and preserved credit fields', fakeAsync(() => {
      init(editData());
      expensesApi.updateExpense.mockReturnValue(of({ id: 5 }));

      component.save();

      expect(expensesApi.updateExpense).toHaveBeenCalledTimes(1);
      const [id, payload] = expensesApi.updateExpense.mock.calls[0];
      expect(id).toBe(5);
      expect(payload.isDraft).toBe(false);
      expect(payload.expenseDate).toBe('2026-06-10T14:30:00');
      // edit keeps the running credit state instead of resetting it
      expect(payload.remainingMonths).toBe(7);
      expect(payload.debtAmount).toBe(1200);
      expect(payload.totalMonths).toBe(12);
      expect(expensesApi.saveExpense).not.toHaveBeenCalled();

      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 5 });
    }));

    it('should log the failure and still close the dialog with the error', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init(null);
      fillValidCreateForm();
      const failure = new Error('offline');
      expensesApi.saveExpense.mockReturnValue(throwError(() => failure));

      component.save();
      tick(500);

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(dialogRef.close).toHaveBeenCalledWith(failure);
      consoleSpy.mockRestore();
    }));
  });

  describe('payment selection', () => {
    it('should mark credit payments as non-payout', () => {
      init(null);

      component.onPaymentSelect({ id: 'pm-1', method: 'credit', name: 'BBVA' });
      expect(component.expense().isPayout).toBe(false);

      component.onPaymentSelect({ id: 'pm-2', method: 'debit', name: 'Nómina' });
      expect(component.expense().isPayout).toBe(true);
    });
  });

  describe('openCreatePaymentMethod', () => {
    beforeEach(() => {
      init(null);
      // viewChild() signals are read-only — stub the query result
      (component as any).paymentMethodSelect = jest.fn().mockReturnValue({ close: jest.fn() });
    });

    it('should create the payment method, select it and toast success', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of({ shortName: 'BBVA Oro', method: 'credit' }) });
      paymentMethodsApi.createPaymentMethod.mockReturnValue(
        of({ id: 'pm-9', method: 'credit', shortName: 'BBVA Oro' })
      );

      component.openCreatePaymentMethod();

      expect(paymentMethodsApi.createPaymentMethod).toHaveBeenCalledWith({ shortName: 'BBVA Oro', method: 'credit' });
      expect(component.payments()).toEqual([{ id: 'pm-9', method: 'credit', name: 'BBVA Oro' }]);
      expect(component.expenseForm.value.paymentMethodId).toBe('pm-9');
      expect(component.expense().isPayout).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Método de pago creado exitosamente');
    });

    it('should toast an error when creation fails', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of({ shortName: 'BBVA Oro', method: 'credit' }) });
      paymentMethodsApi.createPaymentMethod.mockReturnValue(throwError(() => new Error('boom')));

      component.openCreatePaymentMethod();

      expect(toast.error).toHaveBeenCalledWith('Error al crear el método de pago');
      expect(component.payments()).toEqual([]);
    });

    it('should do nothing when the dialog is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(null) });

      component.openCreatePaymentMethod();

      expect(paymentMethodsApi.createPaymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('on-the-fly creation', () => {
    it('should create a merchant with the trimmed name and append it', async () => {
      init(null);
      merchantsApi.createMerchant.mockReturnValue(of({ id: 'r-9', name: 'Soriana' }));

      const result = await component.addMerchantOnTheFly(' Soriana ');

      expect(merchantsApi.createMerchant).toHaveBeenCalledWith({ name: 'Soriana' });
      expect(result).toEqual({ id: 'r-9', name: 'Soriana' });
      expect(component.merchants()).toEqual([{ id: 'r-9', name: 'Soriana' }]);
      expect(toast.success).toHaveBeenCalledWith('Beneficiario " Soriana " creado');
    });

    it('should resolve null and toast when merchant creation fails', async () => {
      init(null);
      merchantsApi.createMerchant.mockReturnValue(throwError(() => new Error('boom')));

      const result = await component.addMerchantOnTheFly('Soriana');

      expect(result).toBeNull();
      expect(component.merchants()).toEqual([]);
      expect(toast.error).toHaveBeenCalledWith('Error al crear el beneficiario');
    });

    it('should create a tag with a random color and append it', async () => {
      init(null);
      tagsApi.createTagWithRandomColor.mockReturnValue(of({ id: 7, name: 'Vacaciones', color: '#abc' }));

      const result = await component.addTagOnTheFly('Vacaciones');

      expect(tagsApi.createTagWithRandomColor).toHaveBeenCalledWith('Vacaciones');
      expect(result).toEqual({ id: 7, name: 'Vacaciones', color: '#abc' });
      expect(component.tags()).toEqual([{ id: 7, name: 'Vacaciones', color: '#abc' }]);
      expect(toast.success).toHaveBeenCalledWith('Etiqueta "Vacaciones" creada');
    });

    it('should resolve null and toast when tag creation fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init(null);
      tagsApi.createTagWithRandomColor.mockReturnValue(throwError(() => new Error('boom')));

      const result = await component.addTagOnTheFly('Vacaciones');

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Error al crear la etiqueta');
      consoleSpy.mockRestore();
    });
  });

  describe('misc interactions', () => {
    it('should close the dialog without a result', () => {
      init(null);

      component.closeDialog();

      expect(dialogRef.close).toHaveBeenCalledWith();
    });

    it('should flag articles missing a category', () => {
      init(null);

      component.onArticlesChange([{ ...article, categoryId: null } as unknown as IExpenseArticle]);
      expect(component.hasArticlesWithoutCategory()).toBe(true);

      component.onArticlesChange([article]);
      expect(component.hasArticlesWithoutCategory()).toBe(false);
    });

  });
});
