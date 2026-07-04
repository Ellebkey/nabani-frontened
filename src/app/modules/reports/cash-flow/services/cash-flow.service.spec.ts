import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { CashFlowService } from './cash-flow.service';
import {
  SankeyData,
  SubCategoryData,
  ExpenseItemsByCategoryResponse,
  UpdateExpenseItemCategoryPayload
} from '../../interfaces/cash-flow.model';
import { environment } from '@root/environments/environment';

const API_URL = environment.url;

describe('CashFlowService', () => {
  let service: CashFlowService;
  let httpMock: HttpTestingController;

  const sankey: SankeyData = {
    nodes: [
      { id: 'income', label: 'Ingresos', value: 1000 },
      { id: 'cat-1', label: 'Hogar', value: 400, color: '#3570B4', categoryId: 1 }
    ],
    links: [{ source: 'income', target: 'cat-1', value: 400 }],
    totalIncome: 1000,
    totalExpenses: 400,
    netCashFlow: 600
  };

  // Lo que el servicio entrega: colores de nodos (no fuente) llevados a la paleta muted
  const mutedSankey: SankeyData = {
    ...sankey,
    nodes: [
      { id: 'income', label: 'Ingresos', value: 1000, color: '#5F7386' },
      { id: 'cat-1', label: 'Hogar', value: 400, color: '#3B5F82', categoryId: 1 }
    ],
  };

  const subCategories: SubCategoryData = {
    data: [
      { x: 'Renta', y: 250, subcategoryId: 11 },
      { x: 'Luz', y: 150, subcategoryId: 12 }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(CashFlowService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getCashFlowSankey', () => {
    it('should GET the sankey with the date-range params', () => {
      let result: SankeyData | undefined;

      service
        .getCashFlowSankey({ startDate: '2026-01-01', endDate: '2026-01-31' })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/cash-flow-sankey`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2026-01-01');
      expect(req.request.params.get('endDate')).toBe('2026-01-31');
      expect(req.request.params.keys().sort()).toEqual(['endDate', 'startDate']);
      req.flush(sankey);

      expect(result).toEqual(mutedSankey);
      expect(result?.netCashFlow).toBe(600);
    });

    it('should include tagIds when provided', () => {
      service
        .getCashFlowSankey({ startDate: '2026-01-01', endDate: '2026-01-31', tagIds: '1,2' })
        .subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/cash-flow-sankey`);
      expect(req.request.params.get('tagIds')).toBe('1,2');
      req.flush(sankey);
    });

    it('should omit undefined optional params', () => {
      service
        .getCashFlowSankey({ startDate: '2026-01-01', endDate: '2026-01-31', tagIds: undefined })
        .subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/cash-flow-sankey`);
      expect(req.request.params.has('tagIds')).toBe(false);
      req.flush(sankey);
    });

    it('should propagate a server error to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getCashFlowSankey({ startDate: '2026-01-01', endDate: '2026-01-31' }).subscribe({
        error: (err: HttpErrorResponse) => (error = err)
      });

      httpMock
        .expectOne(r => r.url === `${API_URL}/accounts/cash-flow-sankey`)
        .flush({ message: 'falló' }, { status: 500, statusText: 'Internal Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('getCashFlowSankeyByTags', () => {
    it('should GET the sankey by tags with the tagIds param', () => {
      let result: SankeyData | undefined;

      service.getCashFlowSankeyByTags('3,7').subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/cash-flow-sankey-by-tags`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('tagIds')).toBe('3,7');
      req.flush(sankey);

      expect(result).toEqual(mutedSankey);
    });
  });

  describe('getSubCategoriesByCategory', () => {
    it('should GET subcategories with date range and categoryId', () => {
      let result: SubCategoryData | undefined;

      service
        .getSubCategoriesByCategory({ startDate: '2026-02-01', endDate: '2026-02-28', categoryId: 1 })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/total-expenses-by-subcategory`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2026-02-01');
      expect(req.request.params.get('endDate')).toBe('2026-02-28');
      expect(req.request.params.get('categoryId')).toBe('1');
      req.flush(subCategories);

      expect(result).toEqual(subCategories);
    });
  });

  describe('getSubCategoriesByCategoryWithTags', () => {
    it('should GET subcategories filtered by category and tags', () => {
      let result: SubCategoryData | undefined;

      service.getSubCategoriesByCategoryWithTags(1, '3,7').subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/expenses-by-subcategory-with-tags`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('categoryId')).toBe('1');
      expect(req.request.params.get('tagIds')).toBe('3,7');
      req.flush(subCategories);

      expect(result).toEqual(subCategories);
    });
  });

  describe('getExpenseItemsByCategory', () => {
    const response: ExpenseItemsByCategoryResponse = {
      rows: [
        {
          expenseId: 10,
          articleId: 3,
          expenseDate: '2026-03-05',
          recipientName: 'Soriana',
          concept: 'Leche entera',
          categoryId: 1,
          subcategoryId: 11,
          categoryName: 'Súper',
          subcategoryName: 'Despensa',
          subtotal: 56,
          quantity: 2,
          units: 'pz',
          price: 28
        }
      ],
      count: 1,
      total: 56
    };

    it('should GET expense items with date range, category and pagination params', () => {
      let result: ExpenseItemsByCategoryResponse | undefined;

      service
        .getExpenseItemsByCategory({
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          categoryId: 1,
          subcategoryId: 11,
          tagIds: '3',
          limit: 20,
          offset: 40
        })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/expense-items-by-category`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('startDate')).toBe('2026-03-01');
      expect(req.request.params.get('endDate')).toBe('2026-03-31');
      expect(req.request.params.get('categoryId')).toBe('1');
      expect(req.request.params.get('subcategoryId')).toBe('11');
      expect(req.request.params.get('tagIds')).toBe('3');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('offset')).toBe('40');
      req.flush(response);

      expect(result).toEqual(response);
      expect(result?.total).toBe(56);
    });

    it('should omit optional params that are not provided', () => {
      service
        .getExpenseItemsByCategory({ startDate: '2026-03-01', endDate: '2026-03-31', categoryId: 1 })
        .subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/expense-items-by-category`);
      expect(req.request.params.keys().sort()).toEqual(['categoryId', 'endDate', 'startDate']);
      req.flush(response);
    });
  });

  describe('updateExpenseItemCategory', () => {
    it('should PATCH the recategorization payload', () => {
      const payload: UpdateExpenseItemCategoryPayload = {
        expenseId: 10,
        articleId: 3,
        categoryId: 2,
        subcategoryId: 21
      };
      let completed = false;

      service.updateExpenseItemCategory(payload).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${API_URL}/expense-items/category`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(null);

      expect(completed).toBe(true);
    });

    it('should surface a permission error', () => {
      let error: HttpErrorResponse | undefined;

      service
        .updateExpenseItemCategory({ expenseId: 10, articleId: 3, categoryId: 2, subcategoryId: 21 })
        .subscribe({ error: (err: HttpErrorResponse) => (error = err) });

      httpMock
        .expectOne(`${API_URL}/expense-items/category`)
        .flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

      expect(error?.status).toBe(403);
    });
  });

  describe('getCategoryComparison', () => {
    it('sends only the provided params and drops empty ones', () => {
      let result: unknown;
      service.getCategoryComparison({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        categoryIds: '2,3',
        subcategoryIds: '',
      } as never).subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/expenses/category-comparison`);
      expect(req.request.params.get('categoryIds')).toBe('2,3');
      expect(req.request.params.has('subcategoryIds')).toBe(false);
      req.flush({ total: 100, expenseCount: 1, average: 100, bySubcategory: [], expenses: [] });

      expect(result).toEqual(expect.objectContaining({ total: 100 }));
    });
  });

});
