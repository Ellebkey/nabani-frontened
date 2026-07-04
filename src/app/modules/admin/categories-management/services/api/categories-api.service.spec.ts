import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import {
  CategoriesApiService,
  SubcategoryExpenseItem,
  ReassignSubcategoryDto
} from './categories-api.service';
import { environment } from '@root/environments/environment';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';

describe('CategoriesApiService', () => {
  let service: CategoriesApiService;
  let httpMock: HttpTestingController;

  const API = environment.url;

  const subcategory: ISubcategory = {
    id: 11,
    name: 'Luz',
    categoryId: 1,
    enabledTiers: ['admin', 'premium']
  };

  const category: ICategory = {
    id: 1,
    name: 'Hogar',
    colorPalette: '#3570B4',
    enabledTiers: ['admin', 'premium', 'free'],
    subcategories: [subcategory]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategoriesApiService]
    });

    service = TestBed.inject(CategoriesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('category endpoints', () => {
    it('should GET /categories', () => {
      let result: ICategory[] | undefined;

      service.getCategories().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/categories`);
      expect(req.request.method).toBe('GET');
      req.flush([category]);

      expect(result).toEqual([category]);
    });

    it('should propagate HTTP errors to the subscriber', () => {
      let status: number | undefined;

      service.getCategories().subscribe({ error: (err) => (status = err.status) });

      httpMock.expectOne(`${API}/categories`).flush({}, { status: 500, statusText: 'Server Error' });

      expect(status).toBe(500);
    });

    it('should POST /categories with the create dto as body', () => {
      const dto = { name: 'Mascotas', colorPalette: '#10b981', enabledTiers: ['admin'] };
      let result: ICategory | undefined;

      service.createCategory(dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/categories`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...category, id: 9, name: 'Mascotas' });

      expect(result?.id).toBe(9);
    });

    it('should PUT /categories/:id with the update dto', () => {
      const dto = { name: 'Casa', colorPalette: '#ef4444' };

      service.updateCategory(1, dto).subscribe();

      const req = httpMock.expectOne(`${API}/categories/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...category, name: 'Casa' });
    });

    it('should DELETE /categories/:id', () => {
      let completed = false;

      service.deleteCategory(1).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/categories/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });

    it('should PUT /categories/:id with only enabledTiers when updating tiers', () => {
      service.updateCategoryTiers(1, ['admin', 'premium']).subscribe();

      const req = httpMock.expectOne(`${API}/categories/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ enabledTiers: ['admin', 'premium'] });
      req.flush({ ...category, enabledTiers: ['admin', 'premium'] });
    });

    it('should GET /categories/:id/subcategories', () => {
      let result: ISubcategory[] | undefined;

      service.getSubcategoriesByCategory(1).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/categories/1/subcategories`);
      expect(req.request.method).toBe('GET');
      req.flush([subcategory]);

      expect(result).toEqual([subcategory]);
    });
  });

  describe('subcategory endpoints', () => {
    it('should POST /subcategories with the create dto', () => {
      const dto = { name: 'Internet', categoryId: 1, enabledTiers: ['admin'] };
      let result: ISubcategory | undefined;

      service.createSubcategory(dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/subcategories`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...subcategory, id: 12, name: 'Internet' });

      expect(result?.id).toBe(12);
    });

    it('should PUT /subcategories/:id with the update dto', () => {
      const dto = { name: 'Electricidad', enabledTiers: ['admin', 'premium'] };

      service.updateSubcategory(11, dto).subscribe();

      const req = httpMock.expectOne(`${API}/subcategories/11`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ ...subcategory, name: 'Electricidad' });
    });

    it('should DELETE /subcategories/:id', () => {
      let completed = false;

      service.deleteSubcategory(11).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/subcategories/11`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });

    it('should PUT /subcategories/:id with only enabledTiers when updating tiers', () => {
      service.updateSubcategoryTiers(11, ['admin']).subscribe();

      const req = httpMock.expectOne(`${API}/subcategories/11`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ enabledTiers: ['admin'] });
      req.flush({ ...subcategory, enabledTiers: ['admin'] });
    });

    it('should GET /subcategories/:id/expense-items', () => {
      const items: SubcategoryExpenseItem[] = [{
        expenseId: 100,
        articleId: 7,
        concept: 'Recibo CFE',
        subtotal: 450.5,
        expenseDate: '2026-06-01',
        recipientName: 'CFE'
      }];
      let result: SubcategoryExpenseItem[] | undefined;

      service.getSubcategoryExpenseItems(11).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/subcategories/11/expense-items`);
      expect(req.request.method).toBe('GET');
      req.flush(items);

      expect(result).toEqual(items);
    });

    it('should PUT /subcategories/:id/reassign with the reassign dto and return the count', () => {
      const dto: ReassignSubcategoryDto = {
        targetCategoryId: 2,
        targetSubcategoryId: 21,
        items: [{ expenseId: 100, articleId: 7 }, { expenseId: 101, articleId: 8 }]
      };
      let result: { reassigned: number } | undefined;

      service.reassignSubcategoryItems(11, dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/subcategories/11/reassign`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({ reassigned: 2 });

      expect(result).toEqual({ reassigned: 2 });
    });
  });
});
