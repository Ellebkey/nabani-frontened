import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';

import { ExpensesService } from './expenses.service';
import { AuthService } from '@app/core/auth/auth.service';
import { IExpense, Category, IExpenseDateGroup } from '@shared/interfaces/expense.model';
import { RecordsList } from '@shared/interfaces/shared.model';

const API = 'http://localhost:4040/api';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let httpMock: HttpTestingController;
  let auth: { isAdmin: jest.Mock; getUserRoles: jest.Mock };

  const matchUrl = (method: string, url: string) =>
    (req: HttpRequest<unknown>) => req.method === method && req.url === url;

  beforeEach(() => {
    auth = {
      isAdmin: jest.fn().mockReturnValue(false),
      getUserRoles: jest.fn().mockReturnValue(['free'])
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });

    service = TestBed.inject(ExpensesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getExpenses', () => {
    it('should GET /expenses with the query as params and return the grouped list', () => {
      const response: RecordsList<IExpenseDateGroup> = {
        rows: [{ dateLabel: 'Hoy', expenses: [] }],
        count: 1
      };
      let result: RecordsList<IExpenseDateGroup> | undefined;

      service.getExpenses({ limit: 25, offset: 0, periodMonth: '2026-06' }).subscribe(r => (result = r));

      const req = httpMock.expectOne(matchUrl('GET', `${API}/expenses`));
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('0');
      expect(req.request.params.get('periodMonth')).toBe('2026-06');
      req.flush(response);

      expect(result).toEqual(response);
    });

    it('should skip empty-string params but keep zero/false values', () => {
      service.getExpenses({ offset: 0, fetchAll: false, searchText: '' }).subscribe();

      const req = httpMock.expectOne(matchUrl('GET', `${API}/expenses`));
      expect(req.request.params.get('offset')).toBe('0');
      expect(req.request.params.get('fetchAll')).toBe('false');
      expect(req.request.params.has('searchText')).toBe(false);
      req.flush({ rows: [], count: 0 });
    });

    it('should propagate server errors to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getExpenses({}).subscribe({
        next: () => fail('should not emit'),
        error: (err: HttpErrorResponse) => (error = err)
      });

      const req = httpMock.expectOne(matchUrl('GET', `${API}/expenses`));
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('saveExpense', () => {
    it('should POST a copy of the expense to /expenses', () => {
      const expense = {
        recipientId: 'r-1',
        paymentMethodId: 'pm-1',
        totalAmount: 350,
        isMonths: false,
        articles: [{ articleId: 1, quantity: 2, price: 175, subtotal: 350 }]
      } as unknown as IExpense;
      let result: unknown;

      service.saveExpense(expense).subscribe(r => (result = r));

      const req = httpMock.expectOne(matchUrl('POST', `${API}/expenses`));
      expect(req.request.body).toEqual(expense);
      expect(req.request.body).not.toBe(expense);
      req.flush({ id: 99 });

      expect(result).toEqual({ id: 99 });
    });
  });

  describe('updateExpense', () => {
    it('should PUT the expense to /expenses/:id', () => {
      const expense = { totalAmount: 120, isDraft: false } as unknown as IExpense;

      service.updateExpense(7, expense).subscribe();

      const req = httpMock.expectOne(matchUrl('PUT', `${API}/expenses/7`));
      expect(req.request.body).toEqual(expense);
      req.flush({ id: 7 });
    });
  });

  describe('deleteExpense', () => {
    it('should DELETE /expenses/:id', () => {
      service.deleteExpense(4).subscribe();

      const req = httpMock.expectOne(matchUrl('DELETE', `${API}/expenses/4`));
      expect(req.request.body).toBeNull();
      req.flush({});
    });
  });

  describe('getExpenseById', () => {
    it('should GET /expenses/:id and return the expense', () => {
      let result: IExpense | undefined;

      service.getExpenseById(3).subscribe(r => (result = r));

      const req = httpMock.expectOne(matchUrl('GET', `${API}/expenses/3`));
      req.flush({ id: 3, totalAmount: 80 });

      expect(result).toEqual(expect.objectContaining({ id: 3, totalAmount: 80 }));
    });
  });

  describe('getExpensesByCategory', () => {
    it('should GET /total-expenses-by-category with the query params', () => {
      service.getExpensesByCategory({ periodMonth: '2026-05', categoryId: 2 }).subscribe();

      const req = httpMock.expectOne(matchUrl('GET', `${API}/total-expenses-by-category`));
      expect(req.request.params.get('periodMonth')).toBe('2026-05');
      expect(req.request.params.get('categoryId')).toBe('2');
      req.flush([]);
    });
  });

  describe('getExpenseItems', () => {
    it('should GET /purchased-items with the query params', () => {
      service.getExpenseItems({ limit: 10, searchText: 'leche' }).subscribe();

      const req = httpMock.expectOne(matchUrl('GET', `${API}/purchased-items`));
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('searchText')).toBe('leche');
      req.flush({ rows: [], count: 0 });
    });
  });

  describe('getCategories', () => {
    it('should GET /categories without params', () => {
      let result: unknown;

      service.getCategories().subscribe(r => (result = r));

      const req = httpMock.expectOne(matchUrl('GET', `${API}/categories`));
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush([{ id: 1, name: 'Hogar', colorPalette: null, enabledTiers: ['free'], subcategories: [] }]);

      expect(result).toEqual([
        { id: 1, name: 'Hogar', colorPalette: null, enabledTiers: ['free'], subcategories: [] }
      ]);
    });
  });

  describe('getCategoriesForUser', () => {
    const categories = [
      {
        id: 1,
        name: 'Hogar',
        colorPalette: null,
        enabledTiers: ['free', 'premium'],
        subcategories: [
          { id: 11, name: 'Limpieza', categoryId: 1, enabledTiers: ['free'] },
          { id: 12, name: 'Spa', categoryId: 1, enabledTiers: ['premium'] }
        ]
      },
      { id: 2, name: 'Inversiones', colorPalette: null, enabledTiers: ['premium'], subcategories: [] },
      {
        id: 3,
        name: 'Legacy',
        colorPalette: null,
        enabledTiers: undefined,
        subcategories: [{ id: 31, name: 'Old', categoryId: 3, enabledTiers: undefined }]
      }
    ] as unknown as Category[];

    it('should pass categories through untouched for admins', () => {
      auth.isAdmin.mockReturnValue(true);
      let result: Category[] | undefined;

      service.getCategoriesForUser().subscribe(r => (result = r));
      httpMock.expectOne(matchUrl('GET', `${API}/categories`)).flush(categories);

      expect(result).toEqual(categories);
    });

    it('should filter categories and subcategories by the user tier', () => {
      auth.getUserRoles.mockReturnValue(['free']);
      let result: Category[] | undefined;

      service.getCategoriesForUser().subscribe(r => (result = r));
      httpMock.expectOne(matchUrl('GET', `${API}/categories`)).flush(categories);

      expect(result!.map(c => c.name)).toEqual(['Hogar', 'Legacy']);
      expect(result![0].subcategories.map(s => s.name)).toEqual(['Limpieza']);
      expect(result![1].subcategories.map(s => s.name)).toEqual(['Old']);
    });

    it('should keep only tier-less categories when the user has no roles', () => {
      auth.getUserRoles.mockReturnValue(null);
      let result: Category[] | undefined;

      service.getCategoriesForUser().subscribe(r => (result = r));
      httpMock.expectOne(matchUrl('GET', `${API}/categories`)).flush(categories);

      expect(result!.map(c => c.name)).toEqual(['Legacy']);
    });
  });

  describe('payment methods', () => {
    it('should GET /payment-methods with the query params', () => {
      let result: unknown;

      service.getPaymentMethods({ isActive: true }).subscribe(r => (result = r));

      const req = httpMock.expectOne(matchUrl('GET', `${API}/payment-methods`));
      expect(req.request.params.get('isActive')).toBe('true');
      req.flush([{ id: 'pm-1', method: 'credit', name: 'BBVA' }]);

      expect(result).toEqual([{ id: 'pm-1', method: 'credit', name: 'BBVA', backgroundColor: '#5F7386' }]);
    });

    it('should PUT the payment method to /payment-methods/:id', () => {
      const body = { shortName: 'Nómina', isActive: false };

      service.updatePaymentMethod('pm-9', body).subscribe();

      const req = httpMock.expectOne(matchUrl('PUT', `${API}/payment-methods/pm-9`));
      expect(req.request.body).toEqual(body);
      req.flush({});
    });
  });

  describe('credit cards', () => {
    it('should GET the debt summary for a payment method', () => {
      service.getCreditDebt('pm-3').subscribe();

      const req = httpMock.expectOne(matchUrl('GET', `${API}/credit-cards/pm-3/debt-summary`));
      req.flush({ totalDebt: 1200 });
    });

    it('should GET /credit-cards', () => {
      service.getCreditCards().subscribe();

      const req = httpMock.expectOne(matchUrl('GET', `${API}/credit-cards`));
      req.flush([]);
    });

    it('should GET /credit-cards/statement with the query params', () => {
      service.getCreditCardStatement({ paymentMethodId: 'pm-3', periodMonth: '2026-06' }).subscribe();

      const req = httpMock.expectOne(matchUrl('GET', `${API}/credit-cards/statement`));
      expect(req.request.params.get('paymentMethodId')).toBe('pm-3');
      expect(req.request.params.get('periodMonth')).toBe('2026-06');
      req.flush({ regularExpenses: [], creditExpenses: [] });
    });

    it('should POST a copy of the statement payment', () => {
      const payment = { paymentMethodId: 'pm-3', totalAmount: 999, regularExpenses: [1, 2] };

      service.createCreditCardStatement(payment).subscribe();

      const req = httpMock.expectOne(matchUrl('POST', `${API}/credit-cards/statement/payment`));
      expect(req.request.body).toEqual(payment);
      req.flush({ id: 1 });
    });
  });
});
