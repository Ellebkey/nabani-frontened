import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CategoriesManagementComponent } from './categories-management.component';
import { CategoryFormModalComponent } from './modals/category-form-modal/category-form-modal.component';
import { SubcategoryFormModalComponent } from './modals/subcategory-form-modal/subcategory-form-modal.component';
import { SubcategoryDeleteModalComponent } from './modals/subcategory-delete-modal/subcategory-delete-modal.component';
import { CategoriesStateService } from './services/state/categories-state.service';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';

const subLimpieza: ISubcategory = { id: 11, name: 'Limpieza', categoryId: 1, enabledTiers: ['free', 'premium'] };
const subSpa: ISubcategory = { id: 12, name: 'Spa', categoryId: 1, enabledTiers: ['premium'] };

const hogar: ICategory = {
  id: 1,
  name: 'Hogar',
  colorPalette: '#EF4444',
  enabledTiers: ['free', 'premium'],
  subcategories: [subLimpieza, subSpa]
};

const viajes: ICategory = {
  id: 2,
  name: 'Viajes',
  colorPalette: null,
  enabledTiers: undefined as unknown as string[],
  subcategories: []
};

const createStateMock = () => ({
  categories: signal<ICategory[]>([hogar, viajes]),
  loading: signal(false),
  isEmpty: signal(false),
  categoryCount: signal(2),
  totalSubcategories: signal(2),
  expandedCategoryId: signal<number | null>(null),
  loadCategories: jest.fn(),
  toggleExpanded: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  createSubcategory: jest.fn(),
  updateSubcategory: jest.fn(),
  removeSubcategory: jest.fn(),
  updateCategoryTiers: jest.fn(),
  updateSubcategoryTiers: jest.fn()
});

describe('CategoriesManagementComponent', () => {
  let fixture: ComponentFixture<CategoriesManagementComponent>;
  let component: CategoriesManagementComponent;
  let state: ReturnType<typeof createStateMock>;
  let dialog: { open: jest.Mock };
  let dialogResult: unknown;
  let confirmSpy: jest.SpyInstance;

  const stopEvent = (): Event => ({ stopPropagation: jest.fn() } as unknown as Event);

  beforeEach(() => {
    dialogResult = undefined;
    state = createStateMock();
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [CategoriesManagementComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoriesStateService, useValue: state },
        { provide: MatDialog, useValue: dialog }
      ]
    });

    // MatDialogModule (imported by the component) provides its own MatDialog,
    // which shadows TestBed-level providers; overrideProvider wins everywhere.
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(CategoriesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('initialization and rendering', () => {
    it('should load the categories on init', () => {
      createComponent();

      expect(state.loadCategories).toHaveBeenCalledTimes(1);
    });

    it('should render the header with category and subcategory counts', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Categorías');
      expect(text).toContain('2 categorías');
      expect(text).toContain('2 subcategorías');
      expect(text).toContain('Hogar');
      expect(text).toContain('Viajes');
    });

    it('should render the loading skeleton while loading', () => {
      state.loading.set(true);

      createComponent();

      expect(fixture.nativeElement.querySelectorAll('mg-skeleton').length).toBeGreaterThan(0);
      expect(fixture.nativeElement.textContent).not.toContain('Hogar');
    });

    it('should render the Spanish empty state when there are no categories', () => {
      state.categories.set([]);
      state.isEmpty.set(true);
      state.categoryCount.set(0);
      state.totalSubcategories.set(0);

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay categorías registradas');
      expect(text).toContain('Crear primera categoría');
    });

    it('should show subcategories only for the expanded category', () => {
      createComponent();
      expect(fixture.nativeElement.textContent).not.toContain('Limpieza');

      state.expandedCategoryId.set(1);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Limpieza');
      expect(text).toContain('Spa');
    });

    it('should show the "Sin subcategorías" hint for an expanded category without subcategories', () => {
      state.expandedCategoryId.set(2);

      createComponent();

      expect(fixture.nativeElement.textContent).toContain('Sin subcategorías');
    });
  });

  describe('expand / collapse', () => {
    it('should delegate the toggle to the state service', () => {
      createComponent();

      component['toggleExpanded'](1);

      expect(state.toggleExpanded).toHaveBeenCalledWith(1);
    });

    it('should not toggle the category that is being renamed', () => {
      createComponent();
      component['editingCategoryId'].set(1);

      component['toggleExpanded'](1);

      expect(state.toggleExpanded).not.toHaveBeenCalled();
    });

    it('should still toggle other categories while one is being renamed', () => {
      createComponent();
      component['editingCategoryId'].set(1);

      component['toggleExpanded'](2);

      expect(state.toggleExpanded).toHaveBeenCalledWith(2);
    });
  });

  describe('create category modal', () => {
    it('should open the form modal and create the category with the returned dto', () => {
      dialogResult = { name: 'Mascotas', colorPalette: '#22C55E' };

      createComponent();
      component['openCreateCategoryModal']();

      expect(dialog.open).toHaveBeenCalledWith(CategoryFormModalComponent, {
        width: '420px',
        disableClose: true,
        data: null
      });
      expect(state.createCategory).toHaveBeenCalledWith({ name: 'Mascotas', colorPalette: '#22C55E' });
    });

    it('should not create anything when the modal is dismissed', () => {
      dialogResult = null;

      createComponent();
      component['openCreateCategoryModal']();

      expect(state.createCategory).not.toHaveBeenCalled();
    });
  });

  describe('inline category renaming', () => {
    it('should enter edit mode with the current name and focus the input', fakeAsync(() => {
      createComponent();
      const event = stopEvent();

      component['startEditingName'](hogar, event);
      fixture.detectChanges();
      tick();

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component['editingCategoryId']()).toBe(1);
      expect(component['editingName']()).toBe('Hogar');
      expect(fixture.nativeElement.querySelector('#nameInput')).not.toBeNull();
    }));

    it('should trim and save a changed name', () => {
      createComponent();
      component['editingCategoryId'].set(1);
      component['editingName'].set('  Casa  ');

      component['saveName'](hogar);

      expect(component['editingCategoryId']()).toBeNull();
      expect(state.updateCategory).toHaveBeenCalledWith(1, { name: 'Casa' });
    });

    it('should not save an unchanged name', () => {
      createComponent();
      component['editingName'].set('Hogar');

      component['saveName'](hogar);

      expect(state.updateCategory).not.toHaveBeenCalled();
    });

    it('should not save an empty name', () => {
      createComponent();
      component['editingName'].set('   ');

      component['saveName'](hogar);

      expect(state.updateCategory).not.toHaveBeenCalled();
    });

    it('should save on Enter and cancel on Escape', () => {
      createComponent();
      component['editingName'].set('Casa');
      const enter = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefault = jest.spyOn(enter, 'preventDefault');

      component['onNameKeydown'](enter, hogar);

      expect(preventDefault).toHaveBeenCalled();
      expect(state.updateCategory).toHaveBeenCalledWith(1, { name: 'Casa' });

      component['editingCategoryId'].set(2);
      component['onNameKeydown'](new KeyboardEvent('keydown', { key: 'Escape' }), viajes);

      expect(component['editingCategoryId']()).toBeNull();
      expect(state.updateCategory).toHaveBeenCalledTimes(1);
    });
  });

  describe('color picker', () => {
    it('should toggle the picker open and closed for a category', () => {
      createComponent();

      component['toggleColorPicker'](1, stopEvent());
      expect(component['colorPickerCategoryId']()).toBe(1);

      component['toggleColorPicker'](1, stopEvent());
      expect(component['colorPickerCategoryId']()).toBeNull();
    });

    it('should update the color and close the picker', () => {
      createComponent();
      component['colorPickerCategoryId'].set(1);

      component['updateColor'](hogar, '#22C55E');

      expect(component['colorPickerCategoryId']()).toBeNull();
      expect(state.updateCategory).toHaveBeenCalledWith(1, { colorPalette: '#22C55E' });
    });

    it('should clear the color when the current color is clicked again', () => {
      createComponent();

      component['updateColor'](hogar, '#EF4444');

      expect(state.updateCategory).toHaveBeenCalledWith(1, { colorPalette: null });
    });
  });

  describe('delete category', () => {
    it('should mention the subcategory count in the confirm and delete on accept', () => {
      createComponent();

      component['deleteCategory'](hogar);

      expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar "Hogar" y sus 2 subcategorías?');
      expect(state.deleteCategory).toHaveBeenCalledWith(1);
    });

    it('should use the simple confirm message for a category without subcategories', () => {
      createComponent();

      component['deleteCategory'](viajes);

      expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar la categoría "Viajes"?');
      expect(state.deleteCategory).toHaveBeenCalledWith(2);
    });

    it('should not delete when the confirm is rejected', () => {
      confirmSpy.mockReturnValue(false);

      createComponent();
      component['deleteCategory'](hogar);

      expect(state.deleteCategory).not.toHaveBeenCalled();
    });
  });

  describe('create subcategory modal', () => {
    it('should open the form modal with the parent category context and create the subcategory', () => {
      dialogResult = { name: 'Jardín', categoryId: 1 };

      createComponent();
      component['openCreateSubcategoryModal'](hogar);

      expect(dialog.open).toHaveBeenCalledWith(SubcategoryFormModalComponent, {
        width: '420px',
        disableClose: true,
        data: { categoryId: 1, categoryName: 'Hogar', subcategory: null }
      });
      expect(state.createSubcategory).toHaveBeenCalledWith({ name: 'Jardín', categoryId: 1 });
    });

    it('should not create anything when the modal is dismissed', () => {
      dialogResult = null;

      createComponent();
      component['openCreateSubcategoryModal'](hogar);

      expect(state.createSubcategory).not.toHaveBeenCalled();
    });
  });

  describe('inline subcategory renaming', () => {
    it('should enter edit mode with the current subcategory name', fakeAsync(() => {
      createComponent();
      const event = stopEvent();

      component['startEditingSubName'](subLimpieza, event);
      tick();

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component['editingSubcategoryId']()).toBe(11);
      expect(component['editingSubName']()).toBe('Limpieza');
    }));

    it('should trim and save a changed subcategory name', () => {
      createComponent();
      component['editingSubcategoryId'].set(11);
      component['editingSubName'].set(' Aseo ');

      component['saveSubName'](hogar, subLimpieza);

      expect(component['editingSubcategoryId']()).toBeNull();
      expect(state.updateSubcategory).toHaveBeenCalledWith(11, 1, { name: 'Aseo' });
    });

    it('should not save an unchanged or empty subcategory name', () => {
      createComponent();

      component['editingSubName'].set('Limpieza');
      component['saveSubName'](hogar, subLimpieza);

      component['editingSubName'].set('');
      component['saveSubName'](hogar, subLimpieza);

      expect(state.updateSubcategory).not.toHaveBeenCalled();
    });

    it('should save on Enter and cancel on Escape', () => {
      createComponent();
      component['editingSubName'].set('Aseo');
      const enter = new KeyboardEvent('keydown', { key: 'Enter' });

      component['onSubNameKeydown'](enter, hogar, subLimpieza);
      expect(state.updateSubcategory).toHaveBeenCalledWith(11, 1, { name: 'Aseo' });

      component['editingSubcategoryId'].set(12);
      component['onSubNameKeydown'](new KeyboardEvent('keydown', { key: 'Escape' }), hogar, subSpa);

      expect(component['editingSubcategoryId']()).toBeNull();
      expect(state.updateSubcategory).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete subcategory modal', () => {
    it('should open the delete modal with the subcategory, category and full catalog', () => {
      dialogResult = null;

      createComponent();
      component['deleteSubcategory'](hogar, subLimpieza);

      expect(dialog.open).toHaveBeenCalledWith(SubcategoryDeleteModalComponent, {
        width: '650px',
        maxHeight: '85vh',
        disableClose: true,
        data: { subcategory: subLimpieza, category: hogar, categories: [hogar, viajes] }
      });
      expect(state.removeSubcategory).not.toHaveBeenCalled();
    });

    it('should remove the subcategory from state only when the modal reports "deleted"', () => {
      dialogResult = 'deleted';

      createComponent();
      component['deleteSubcategory'](hogar, subLimpieza);

      expect(state.removeSubcategory).toHaveBeenCalledWith(11, 1);
    });
  });

  describe('tier toggles', () => {
    it('should remove an enabled tier from a category', () => {
      createComponent();

      component['toggleTier'](hogar, 'premium');

      expect(state.updateCategoryTiers).toHaveBeenCalledWith(1, ['free']);
    });

    it('should add a missing tier to a category', () => {
      createComponent();
      const premiumOnly: ICategory = { ...hogar, enabledTiers: ['premium'] };

      component['toggleTier'](premiumOnly, 'free');

      expect(state.updateCategoryTiers).toHaveBeenCalledWith(1, ['premium', 'free']);
    });

    it('should default missing tiers to free+premium before toggling', () => {
      createComponent();

      component['toggleTier'](viajes, 'free');

      expect(state.updateCategoryTiers).toHaveBeenCalledWith(2, ['premium']);
    });

    it('should remove an enabled tier from a subcategory', () => {
      createComponent();

      component['toggleSubcategoryTier'](hogar, subLimpieza, 'free');

      expect(state.updateSubcategoryTiers).toHaveBeenCalledWith(11, 1, ['premium']);
    });

    it('should add a missing tier to a subcategory', () => {
      createComponent();

      component['toggleSubcategoryTier'](hogar, subSpa, 'free');

      expect(state.updateSubcategoryTiers).toHaveBeenCalledWith(12, 1, ['premium', 'free']);
    });

    it('should default missing subcategory tiers to free+premium before toggling', () => {
      createComponent();
      const legacySub: ISubcategory = { id: 13, name: 'Legacy', categoryId: 1, enabledTiers: undefined as unknown as string[] };

      component['toggleSubcategoryTier'](hogar, legacySub, 'premium');

      expect(state.updateSubcategoryTiers).toHaveBeenCalledWith(13, 1, ['free']);
    });
  });
});
