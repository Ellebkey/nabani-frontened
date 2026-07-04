import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { CategoriesStateService } from './categories-state.service';
import { CategoriesApiService } from '../api/categories-api.service';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';

describe('CategoriesStateService', () => {
  let service: CategoriesStateService;
  let api: {
    getCategories: jest.Mock;
    createCategory: jest.Mock;
    updateCategory: jest.Mock;
    deleteCategory: jest.Mock;
    updateCategoryTiers: jest.Mock;
    createSubcategory: jest.Mock;
    updateSubcategory: jest.Mock;
    deleteSubcategory: jest.Mock;
    updateSubcategoryTiers: jest.Mock;
  };
  let toast: { success: jest.Mock; error: jest.Mock };

  const makeSub = (overrides: Partial<ISubcategory> = {}): ISubcategory => ({
    id: 11,
    name: 'Luz',
    categoryId: 1,
    enabledTiers: ['admin', 'premium'],
    ...overrides
  });

  const makeCategories = (): ICategory[] => [
    {
      id: 1,
      name: 'Hogar',
      colorPalette: '#3570B4',
      enabledTiers: ['admin', 'premium', 'free'],
      subcategories: [makeSub(), makeSub({ id: 12, name: 'Agua' })]
    },
    {
      id: 2,
      name: 'Súper',
      colorPalette: '#10b981',
      enabledTiers: ['admin'],
      subcategories: [makeSub({ id: 21, name: 'Despensa', categoryId: 2 })]
    }
  ];

  const seedCategories = (): void => {
    api.getCategories.mockReturnValue(of(makeCategories()));
    service.loadCategories();
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    api = {
      getCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      updateCategoryTiers: jest.fn(),
      createSubcategory: jest.fn(),
      updateSubcategory: jest.fn(),
      deleteSubcategory: jest.fn(),
      updateSubcategoryTiers: jest.fn()
    };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        CategoriesStateService,
        { provide: CategoriesApiService, useValue: api },
        { provide: HotToastService, useValue: toast }
      ]
    });

    service = TestBed.inject(CategoriesStateService);
  });

  describe('loadCategories', () => {
    it('should set the categories and clear loading on success', () => {
      seedCategories();

      expect(service.categories()).toHaveLength(2);
      expect(service.categoryCount()).toBe(2);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should toast in Spanish, set error and keep state intact on failure', () => {
      api.getCategories.mockReturnValue(throwError(() => new Error('boom')));

      service.loadCategories();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las categorías');
      expect(service.error()).toBe('Error al cargar las categorías');
      expect(service.categories()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('createCategory', () => {
    it('should only append AFTER the api resolves, with empty subcategories (signal golden rule)', () => {
      seedCategories();
      const response$ = new Subject<ICategory>();
      api.createCategory.mockReturnValue(response$.asObservable());

      service.createCategory({ name: 'Mascotas' });

      // server has not responded yet
      expect(service.categories()).toHaveLength(2);
      expect(service.loading()).toBe(true);

      response$.next({ id: 9, name: 'Mascotas', colorPalette: null, enabledTiers: ['admin'] } as ICategory);
      response$.complete();

      expect(service.categories()).toHaveLength(3);
      expect(service.categories()[2]).toEqual({
        id: 9,
        name: 'Mascotas',
        colorPalette: null,
        enabledTiers: ['admin'],
        subcategories: []
      });
      expect(toast.success).toHaveBeenCalledWith('Categoría creada exitosamente');
      expect(service.loading()).toBe(false);
    });

    it('should surface the nested backend message on failure', () => {
      seedCategories();
      api.createCategory.mockReturnValue(
        throwError(() => ({ error: { error: { message: 'La categoría ya existe' } } }))
      );

      service.createCategory({ name: 'Hogar' });

      expect(toast.error).toHaveBeenCalledWith('La categoría ya existe');
      expect(service.categories()).toHaveLength(2);
    });

    it('should fall back to the generic Spanish message when the error has no body', () => {
      api.createCategory.mockReturnValue(throwError(() => ({ status: 500 })));

      service.createCategory({ name: 'X' });

      expect(toast.error).toHaveBeenCalledWith('Error al crear la categoría');
    });
  });

  describe('updateCategory', () => {
    it('should replace the category but preserve its existing subcategories', () => {
      seedCategories();
      api.updateCategory.mockReturnValue(of({
        id: 1,
        name: 'Casa',
        colorPalette: '#ef4444',
        enabledTiers: ['admin'],
        subcategories: [] // server response without subs must not wipe local ones
      }));

      service.updateCategory(1, { name: 'Casa', colorPalette: '#ef4444' });

      const updated = service.categories().find(c => c.id === 1);
      expect(updated?.name).toBe('Casa');
      expect(updated?.subcategories).toHaveLength(2);
      expect(service.categories().find(c => c.id === 2)?.name).toBe('Súper');
      expect(toast.success).toHaveBeenCalledWith('Categoría actualizada exitosamente');
    });

    it('should surface the flat backend message on failure and leave state intact', () => {
      seedCategories();
      api.updateCategory.mockReturnValue(
        throwError(() => ({ error: { message: 'Nombre inválido' } }))
      );

      service.updateCategory(1, { name: '' });

      expect(toast.error).toHaveBeenCalledWith('Nombre inválido');
      expect(service.categories().find(c => c.id === 1)?.name).toBe('Hogar');
    });
  });

  describe('updateCategoryTiers', () => {
    it('should only patch enabledTiers on the matching category', () => {
      seedCategories();
      api.updateCategoryTiers.mockReturnValue(of({
        id: 1,
        name: 'IGNORED-NAME',
        colorPalette: null,
        enabledTiers: ['admin'],
        subcategories: []
      }));

      service.updateCategoryTiers(1, ['admin']);

      expect(api.updateCategoryTiers).toHaveBeenCalledWith(1, ['admin']);
      const cat = service.categories().find(c => c.id === 1);
      expect(cat?.enabledTiers).toEqual(['admin']);
      expect(cat?.name).toBe('Hogar'); // everything but tiers untouched
      expect(cat?.subcategories).toHaveLength(2);
      expect(toast.success).toHaveBeenCalledWith('Visibilidad actualizada');
    });

    it('should toast the fallback visibility error', () => {
      seedCategories();
      api.updateCategoryTiers.mockReturnValue(throwError(() => ({})));

      service.updateCategoryTiers(1, ['admin']);

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar visibilidad');
      expect(service.categories().find(c => c.id === 1)?.enabledTiers).toEqual(['admin', 'premium', 'free']);
    });
  });

  describe('updateSubcategoryTiers', () => {
    it('should patch only the matching subcategory of the matching category', () => {
      seedCategories();
      api.updateSubcategoryTiers.mockReturnValue(of(makeSub({ enabledTiers: ['admin'] })));

      service.updateSubcategoryTiers(11, 1, ['admin']);

      expect(api.updateSubcategoryTiers).toHaveBeenCalledWith(11, ['admin']);
      const cat1 = service.categories().find(c => c.id === 1);
      expect(cat1?.subcategories.find(s => s.id === 11)?.enabledTiers).toEqual(['admin']);
      expect(cat1?.subcategories.find(s => s.id === 12)?.enabledTiers).toEqual(['admin', 'premium']);
      expect(service.categories().find(c => c.id === 2)?.subcategories[0].enabledTiers).toEqual(['admin', 'premium']);
      expect(toast.success).toHaveBeenCalledWith('Visibilidad actualizada');
    });
  });

  describe('deleteCategory', () => {
    it('should remove the category after the server confirms', () => {
      seedCategories();
      const response$ = new Subject<void>();
      api.deleteCategory.mockReturnValue(response$.asObservable());

      service.deleteCategory(1);

      expect(service.categories()).toHaveLength(2); // not yet confirmed

      response$.next();
      response$.complete();

      expect(service.categories()).toHaveLength(1);
      expect(service.categories()[0].id).toBe(2);
      expect(toast.success).toHaveBeenCalledWith('Categoría eliminada exitosamente');
    });

    it('should surface the backend message and keep the category on failure', () => {
      seedCategories();
      api.deleteCategory.mockReturnValue(
        throwError(() => ({ error: { error: { message: 'Categoría con gastos asociados' } } }))
      );

      service.deleteCategory(1);

      expect(toast.error).toHaveBeenCalledWith('Categoría con gastos asociados');
      expect(service.categories()).toHaveLength(2);
    });
  });

  describe('createSubcategory', () => {
    it('should append the subcategory to its parent category only', () => {
      seedCategories();
      const newSub = makeSub({ id: 13, name: 'Internet' });
      api.createSubcategory.mockReturnValue(of(newSub));

      service.createSubcategory({ name: 'Internet', categoryId: 1 });

      expect(service.categories().find(c => c.id === 1)?.subcategories).toHaveLength(3);
      expect(service.categories().find(c => c.id === 2)?.subcategories).toHaveLength(1);
      expect(toast.success).toHaveBeenCalledWith('Subcategoría creada exitosamente');
    });

    it('should toast the generic Spanish message on failure', () => {
      seedCategories();
      api.createSubcategory.mockReturnValue(throwError(() => ({})));

      service.createSubcategory({ name: 'Internet', categoryId: 1 });

      expect(toast.error).toHaveBeenCalledWith('Error al crear la subcategoría');
      expect(service.categories().find(c => c.id === 1)?.subcategories).toHaveLength(2);
    });
  });

  describe('updateSubcategory', () => {
    it('should replace the subcategory inside the right category', () => {
      seedCategories();
      const updated = makeSub({ name: 'Electricidad' });
      api.updateSubcategory.mockReturnValue(of(updated));

      service.updateSubcategory(11, 1, { name: 'Electricidad' });

      expect(api.updateSubcategory).toHaveBeenCalledWith(11, { name: 'Electricidad' });
      const cat1 = service.categories().find(c => c.id === 1);
      expect(cat1?.subcategories.find(s => s.id === 11)?.name).toBe('Electricidad');
      expect(cat1?.subcategories.find(s => s.id === 12)?.name).toBe('Agua');
      expect(toast.success).toHaveBeenCalledWith('Subcategoría actualizada exitosamente');
    });

    it('should toast and leave the subcategory intact on failure', () => {
      seedCategories();
      api.updateSubcategory.mockReturnValue(throwError(() => ({})));

      service.updateSubcategory(11, 1, { name: 'X' });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar la subcategoría');
      expect(service.categories().find(c => c.id === 1)?.subcategories.find(s => s.id === 11)?.name).toBe('Luz');
    });
  });

  describe('deleteSubcategory', () => {
    it('should remove the subcategory from its category after the server confirms', () => {
      seedCategories();
      api.deleteSubcategory.mockReturnValue(of(void 0));

      service.deleteSubcategory(11, 1);

      expect(api.deleteSubcategory).toHaveBeenCalledWith(11);
      expect(service.categories().find(c => c.id === 1)?.subcategories.map(s => s.id)).toEqual([12]);
      expect(toast.success).toHaveBeenCalledWith('Subcategoría eliminada exitosamente');
    });

    it('should toast and keep the subcategory on failure', () => {
      seedCategories();
      api.deleteSubcategory.mockReturnValue(throwError(() => ({})));

      service.deleteSubcategory(11, 1);

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar la subcategoría');
      expect(service.categories().find(c => c.id === 1)?.subcategories).toHaveLength(2);
    });
  });

  describe('removeSubcategory (local only)', () => {
    it('should drop the subcategory from state without any API call', () => {
      seedCategories();

      service.removeSubcategory(12, 1);

      expect(service.categories().find(c => c.id === 1)?.subcategories.map(s => s.id)).toEqual([11]);
      expect(api.deleteSubcategory).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('toggleExpanded', () => {
    it('should expand, collapse and switch categories', () => {
      expect(service.expandedCategoryId()).toBeNull();

      service.toggleExpanded(1);
      expect(service.expandedCategoryId()).toBe(1);

      service.toggleExpanded(1);
      expect(service.expandedCategoryId()).toBeNull();

      service.toggleExpanded(1);
      service.toggleExpanded(2);
      expect(service.expandedCategoryId()).toBe(2);
    });
  });

  describe('computed signals', () => {
    it('should derive isEmpty and totalSubcategories', () => {
      expect(service.isEmpty()).toBe(true);

      seedCategories();

      expect(service.isEmpty()).toBe(false);
      expect(service.totalSubcategories()).toBe(3);
    });
  });

  describe('clearError', () => {
    it('should reset the error signal', () => {
      api.getCategories.mockReturnValue(throwError(() => new Error('boom')));
      service.loadCategories();
      expect(service.error()).not.toBeNull();

      service.clearError();

      expect(service.error()).toBeNull();
    });
  });
});
