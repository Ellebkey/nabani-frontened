import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { Observable, of, throwError } from 'rxjs';

import { SubcategoryDeleteModalComponent, SubcategoryDeleteData } from './subcategory-delete-modal.component';
import { CategoriesApiService, SubcategoryExpenseItem } from '../../services/api/categories-api.service';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';

const subLimpieza: ISubcategory = { id: 11, name: 'Limpieza', categoryId: 1, enabledTiers: ['free'] };
const subSpa: ISubcategory = { id: 12, name: 'Spa', categoryId: 1, enabledTiers: ['premium'] };
const subDespensa: ISubcategory = { id: 21, name: 'Despensa', categoryId: 2, enabledTiers: ['free'] };

const hogar: ICategory = {
  id: 1, name: 'Hogar', colorPalette: '#EF4444', enabledTiers: ['free'], subcategories: [subLimpieza, subSpa]
};
const comida: ICategory = {
  id: 2, name: 'Comida', colorPalette: null, enabledTiers: ['free'], subcategories: [subDespensa]
};
const vacia: ICategory = {
  id: 3, name: 'Vacía', colorPalette: null, enabledTiers: ['free'], subcategories: []
};

const itemA: SubcategoryExpenseItem = {
  expenseId: 100, articleId: 1, concept: 'Jabón', subtotal: 120.5, expenseDate: '2026-06-01T12:00:00', recipientName: 'Soriana'
};
const itemB: SubcategoryExpenseItem = {
  expenseId: 100, articleId: 2, concept: 'Cloro', subtotal: 80, expenseDate: '2026-06-02T12:00:00', recipientName: 'Soriana'
};
const itemC: SubcategoryExpenseItem = {
  expenseId: 101, articleId: 1, concept: 'Escoba', subtotal: 250, expenseDate: '2026-06-03T12:00:00', recipientName: 'Costco'
};

describe('SubcategoryDeleteModalComponent', () => {
  let fixture: ComponentFixture<SubcategoryDeleteModalComponent>;
  let component: SubcategoryDeleteModalComponent;
  let api: {
    getSubcategoryExpenseItems: jest.Mock;
    reassignSubcategoryItems: jest.Mock;
    deleteSubcategory: jest.Mock;
  };
  let toast: { success: jest.Mock; error: jest.Mock };
  let dialogRef: { close: jest.Mock };

  function configure(itemsSource: Observable<SubcategoryExpenseItem[]>): void {
    api = {
      getSubcategoryExpenseItems: jest.fn().mockReturnValue(itemsSource),
      reassignSubcategoryItems: jest.fn(),
      deleteSubcategory: jest.fn()
    };
    toast = { success: jest.fn(), error: jest.fn() };
    dialogRef = { close: jest.fn() };

    const data: SubcategoryDeleteData = {
      subcategory: subLimpieza,
      category: hogar,
      categories: [hogar, comida, vacia]
    };

    TestBed.configureTestingModule({
      imports: [SubcategoryDeleteModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoriesApiService, useValue: api },
        { provide: HotToastService, useValue: toast },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(SubcategoryDeleteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function setup(items: SubcategoryExpenseItem[] = [itemA, itemB, itemC]): void {
    configure(of(items));
  }

  describe('loading the expense items', () => {
    it('should load the items of the subcategory on construction', () => {
      setup();

      expect(api.getSubcategoryExpenseItems).toHaveBeenCalledWith(11);
      expect(component.expenseItems()).toEqual([itemA, itemB, itemC]);
      expect(component.isLoading()).toBe(false);
    });

    it('should render the title and the blocking explanation when items exist', () => {
      setup();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Eliminar "Limpieza"');
      expect(text).toContain('artículos de gasto en esta subcategoría');
      expect(text).toContain('0 de 3 seleccionados');
      expect(text).toContain('$120.50');
    });

    it('should toast in Spanish and stop loading when the load fails', () => {
      configure(throwError(() => new Error('boom')));

      expect(toast.error).toHaveBeenCalledWith('Error al cargar los artículos de gasto');
      expect(component.isLoading()).toBe(false);
      expect(component.expenseItems()).toEqual([]);
    });
  });

  describe('reassignment targets', () => {
    it('should only offer categories that have subcategories', () => {
      setup();

      expect(component.availableCategories().map(c => c.id)).toEqual([1, 2]);
    });

    it('should offer no target subcategories until a category is chosen', () => {
      setup();

      expect(component.targetSubcategories()).toEqual([]);
    });

    it('should exclude the subcategory being deleted from the targets', () => {
      setup();

      component.onCategoryChange(1);

      expect(component.targetSubcategories()).toEqual([subSpa]);
    });

    it('should return no targets for an unknown category', () => {
      setup();

      component.onCategoryChange(99);

      expect(component.targetSubcategories()).toEqual([]);
    });

    it('should reset the target subcategory when the category changes', () => {
      setup();
      component.onCategoryChange(1);
      component.targetSubcategoryId.set(12);

      component.onCategoryChange(2);

      expect(component.targetCategoryId()).toBe(2);
      expect(component.targetSubcategoryId()).toBeNull();
    });
  });

  describe('item selection', () => {
    it('should key items by expenseId and articleId', () => {
      setup();

      expect(component.itemKey(itemA)).toBe('100:1');
      expect(component.itemKey(itemC)).toBe('101:1');
    });

    it('should toggle a single item on and off', () => {
      setup();

      component.toggleItem(itemA);
      expect(component.isSelected(itemA)).toBe(true);
      expect(component.someSelected()).toBe(true);
      expect(component.allSelected()).toBe(false);

      component.toggleItem(itemA);
      expect(component.isSelected(itemA)).toBe(false);
      expect(component.selectedKeys().size).toBe(0);
    });

    it('should distinguish articles of the same expense', () => {
      setup();

      component.toggleItem(itemA);

      expect(component.isSelected(itemA)).toBe(true);
      expect(component.isSelected(itemB)).toBe(false);
    });

    it('should select all items and then clear them with toggleAll', () => {
      setup();

      component.toggleAll();
      expect(component.allSelected()).toBe(true);
      expect(component.someSelected()).toBe(false);
      expect(component.selectedKeys().size).toBe(3);

      component.toggleAll();
      expect(component.selectedKeys().size).toBe(0);
    });

    it('should never report allSelected for an empty list', () => {
      setup([]);

      expect(component.allSelected()).toBe(false);
    });
  });

  describe('reassign', () => {
    it('should require a selection and both targets', () => {
      setup();

      expect(component.canReassign()).toBe(false);

      component.toggleItem(itemA);
      expect(component.canReassign()).toBe(false);

      component.onCategoryChange(2);
      expect(component.canReassign()).toBe(false);

      component.targetSubcategoryId.set(21);
      expect(component.canReassign()).toBe(true);
    });

    it('should not call the API when reassignment is not allowed', () => {
      setup();

      component.reassign();

      expect(api.reassignSubcategoryItems).not.toHaveBeenCalled();
      expect(component.isSaving()).toBe(false);
    });

    it('should send the selected expense/article pairs to the target and reload', () => {
      setup();
      api.getSubcategoryExpenseItems.mockReturnValue(of([itemB]));
      api.reassignSubcategoryItems.mockReturnValue(of({ reassigned: 2 }));

      component.toggleItem(itemA);
      component.toggleItem(itemC);
      component.onCategoryChange(2);
      component.targetSubcategoryId.set(21);

      component.reassign();

      expect(api.reassignSubcategoryItems).toHaveBeenCalledWith(11, {
        targetCategoryId: 2,
        targetSubcategoryId: 21,
        items: [
          { expenseId: 100, articleId: 1 },
          { expenseId: 101, articleId: 1 }
        ]
      });
      expect(toast.success).toHaveBeenCalledWith('2 artículos reasignados');
      expect(component.selectedKeys().size).toBe(0);
      expect(api.getSubcategoryExpenseItems).toHaveBeenCalledTimes(2);
      expect(component.expenseItems()).toEqual([itemB]);
      expect(component.isSaving()).toBe(false);
    });

    it('should surface the nested backend message when the reassign fails', () => {
      setup();
      api.reassignSubcategoryItems.mockReturnValue(
        throwError(() => ({ error: { error: { message: 'No autorizado' } } }))
      );

      component.toggleItem(itemA);
      component.onCategoryChange(2);
      component.targetSubcategoryId.set(21);
      component.reassign();

      expect(toast.error).toHaveBeenCalledWith('No autorizado');
      expect(component.isSaving()).toBe(false);
      expect(api.getSubcategoryExpenseItems).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the generic Spanish reassign error', () => {
      setup();
      api.reassignSubcategoryItems.mockReturnValue(throwError(() => ({})));

      component.toggleItem(itemA);
      component.onCategoryChange(2);
      component.targetSubcategoryId.set(21);
      component.reassign();

      expect(toast.error).toHaveBeenCalledWith('Error al reasignar');
      expect(component.isSaving()).toBe(false);
    });
  });

  describe('delete', () => {
    it('should allow deleting only when no expense items remain', () => {
      setup();
      expect(component.canDelete()).toBe(false);

      const deleteButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
        .find(button => (button as HTMLButtonElement).textContent?.includes('Eliminar subcategoría')) as HTMLButtonElement;
      expect(deleteButton.disabled).toBe(true);
    });

    it('should not call the API while items still exist', () => {
      setup();

      component.deleteSubcategory();

      expect(api.deleteSubcategory).not.toHaveBeenCalled();
    });

    it('should show the direct-delete copy when there is nothing to reassign', () => {
      setup([]);

      expect(component.canDelete()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('No hay artículos de gasto asociados. Se puede eliminar directamente.');
    });

    it('should delete, toast in Spanish and close with "deleted"', () => {
      setup([]);
      api.deleteSubcategory.mockReturnValue(of(void 0));

      component.deleteSubcategory();

      expect(api.deleteSubcategory).toHaveBeenCalledWith(11);
      expect(toast.success).toHaveBeenCalledWith('Subcategoría eliminada');
      expect(component.isSaving()).toBe(false);
      expect(dialogRef.close).toHaveBeenCalledWith('deleted');
    });

    it('should keep the dialog open and toast the fallback message when the delete fails', () => {
      setup([]);
      api.deleteSubcategory.mockReturnValue(throwError(() => ({})));

      component.deleteSubcategory();

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar');
      expect(component.isSaving()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should surface the backend message when the delete fails with one', () => {
      setup([]);
      api.deleteSubcategory.mockReturnValue(
        throwError(() => ({ error: { message: 'Subcategoría protegida' } }))
      );

      component.deleteSubcategory();

      expect(toast.error).toHaveBeenCalledWith('Subcategoría protegida');
    });
  });

  describe('misc', () => {
    it('should close with null on cancel', () => {
      setup();

      component.onCancel();

      expect(dialogRef.close).toHaveBeenCalledWith(null);
    });

    it('should format currency with two decimals and thousand separators', () => {
      setup();

      expect(component.formatCurrency(1234.5)).toBe('$1,234.50');
      expect(component.formatCurrency(80)).toBe('$80.00');
    });

    it('should format dates in Spanish and tolerate empty values', () => {
      setup();

      expect(component.formatDate('')).toBe('');
      const formatted = component.formatDate('2026-06-01T12:00:00');
      expect(formatted).toContain('2026');
      expect(formatted.toLowerCase()).toContain('jun');
    });
  });
});
