// CashFlowComponent statically imports SankeyChartComponent, which pulls in
// ESM-only d3. The chart is never rendered here (template is overridden), so
// both packages are mocked away.
jest.mock('d3', () => ({ select: jest.fn() }));
jest.mock('d3-sankey', () => ({ sankey: jest.fn(), sankeyLinkHorizontal: jest.fn() }));

import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { CashFlowComponent } from './cash-flow.component';
import { CashFlowService } from './services/cash-flow.service';
import {
  ExpenseItemByCategory,
  NodeClickEvent,
  SankeyData,
  SubCategoryItem,
} from '../interfaces/cash-flow.model';
import { TagService } from '@shared/services/tag.service';
import { CategoriesApiService } from '@app/modules/admin/categories-management/services/api/categories-api.service';
import { ICategory } from '@shared/interfaces/common.model';

describe('CashFlowComponent', () => {
  let fixture: ComponentFixture<CashFlowComponent>;
  let component: CashFlowComponent;
  let api: {
    getCashFlowSankey: jest.Mock;
    getCashFlowSankeyByTags: jest.Mock;
    getSubCategoriesByCategory: jest.Mock;
    getSubCategoriesByCategoryWithTags: jest.Mock;
    getExpenseItemsByCategory: jest.Mock;
    updateExpenseItemCategory: jest.Mock;
  };
  let tagApi: { getTags: jest.Mock; getTagSummaries: jest.Mock };
  let categoriesApi: { getCategories: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };
  let scrollIntoView: jest.Mock;

  const sankeyFixture: SankeyData = {
    nodes: [
      { id: 'total-expenses', label: 'Gastos Totales', value: 1000 },
      { id: 'category-Hogar', label: 'Hogar', value: 600, categoryId: 1, color: '#3A7D6E' },
      { id: 'category-Comida', label: 'Comida', value: 400, categoryId: 2 },
    ],
    links: [
      { source: 'total-expenses', target: 'category-Hogar', value: 600 },
      { source: 'total-expenses', target: 'category-Comida', value: 400 },
    ],
    totalIncome: 2000,
    totalExpenses: 1000,
    netCashFlow: 1000,
  };

  const subCategoriesFixture: SubCategoryItem[] = [
    { x: 'Limpieza', y: 350, subcategoryId: 11 },
    { x: 'Muebles', y: 250, subcategoryId: 12 },
  ];

  const tagsFixture = [
    { id: 1, name: 'Viaje', color: '#aaa111' },
    { id: 2, name: 'Casa', color: '#bbb222' },
  ];

  const tagSummariesFixture = [
    { id: 1, name: 'Viaje', color: '#aaa111', totalAmount: 300, expenseCount: 2 },
  ];

  const categoriesFixture: ICategory[] = [
    {
      id: 1,
      name: 'Hogar',
      colorPalette: '#3A7D6E',
      enabledTiers: ['free'],
      subcategories: [
        { id: 11, name: 'Limpieza', categoryId: 1, enabledTiers: ['free'] },
        { id: 12, name: 'Muebles', categoryId: 1, enabledTiers: ['free'] },
      ],
    },
    {
      id: 2,
      name: 'Comida',
      colorPalette: null,
      enabledTiers: ['free'],
      subcategories: [{ id: 21, name: 'Restaurantes', categoryId: 2, enabledTiers: ['free'] }],
    },
  ];

  const expenseItemFixture: ExpenseItemByCategory = {
    expenseId: 10,
    articleId: 20,
    expenseDate: '2026-03-05T14:30:00',
    recipientName: 'Costco',
    concept: 'Jabón',
    categoryId: 1,
    subcategoryId: 11,
    categoryName: 'Hogar',
    subcategoryName: 'Limpieza',
    subtotal: 120,
    quantity: 1,
    units: 'pz',
    price: 120,
  };

  const expenseItemsResponse = { rows: [expenseItemFixture], count: 1, total: 120 };

  const categoryClickEvent = (overrides: Partial<NodeClickEvent> = {}): NodeClickEvent => ({
    type: 'category',
    label: 'Hogar',
    value: 600,
    color: '#3A7D6E',
    node: { id: 'category-Hogar', label: 'Hogar', value: 600, categoryId: 1 },
    ...overrides,
  });

  beforeEach(() => {
    api = {
      getCashFlowSankey: jest.fn().mockReturnValue(of(sankeyFixture)),
      getCashFlowSankeyByTags: jest.fn().mockReturnValue(of(sankeyFixture)),
      getSubCategoriesByCategory: jest.fn().mockReturnValue(of({ data: subCategoriesFixture })),
      getSubCategoriesByCategoryWithTags: jest.fn().mockReturnValue(of({ data: subCategoriesFixture })),
      getExpenseItemsByCategory: jest.fn().mockReturnValue(of(expenseItemsResponse)),
      updateExpenseItemCategory: jest.fn().mockReturnValue(of(void 0)),
    };
    tagApi = {
      getTags: jest.fn().mockReturnValue(of({ rows: tagsFixture, count: tagsFixture.length })),
      getTagSummaries: jest.fn().mockReturnValue(of(tagSummariesFixture)),
    };
    categoriesApi = { getCategories: jest.fn().mockReturnValue(of(categoriesFixture)) };
    toast = { success: jest.fn(), error: jest.fn() };
    scrollIntoView = jest.fn();

    TestBed.configureTestingModule({
      imports: [CashFlowComponent],
      providers: [
        { provide: CashFlowService, useValue: api },
        { provide: TagService, useValue: tagApi },
        { provide: CategoriesApiService, useValue: categoriesApi },
        { provide: HotToastService, useValue: toast },
      ],
    });

    // Class-logic only: never render ng-select/d3/material table in jsdom.
    TestBed.overrideComponent(CashFlowComponent, { set: { template: '', imports: [] } });
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(CashFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit
    component.categoryDetailEl = { nativeElement: { scrollIntoView } } as unknown as ElementRef;
  };

  const setRange = (): void => {
    component.onDateRangeChange({ startDate: '2026-01-01', endDate: '2026-01-31' });
  };

  const selectCategory = (event = categoryClickEvent()): void => {
    component.onCategoryClick(event);
    tick(); // flush the scroll-into-view setTimeout
  };

  describe('initialization', () => {
    it('should load tags and categories but skip the sankey fetch without dates', () => {
      createComponent();

      expect(tagApi.getTags).toHaveBeenCalledWith({ fetchAll: true });
      expect(component.tags()).toEqual(tagsFixture);
      expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
      expect(component.categories()).toEqual(categoriesFixture);
      expect(api.getCashFlowSankey).not.toHaveBeenCalled();
      expect(tagApi.getTagSummaries).not.toHaveBeenCalled();
      expect(component.sankeyData()).toBeNull();
    });

    it('should log and keep empty tags/categories when the catalogs fail', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      tagApi.getTags.mockReturnValue(throwError(() => new Error('boom')));
      categoriesApi.getCategories.mockReturnValue(throwError(() => new Error('boom')));

      createComponent();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.tags()).toEqual([]);
      expect(component.categories()).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('date range changes', () => {
    it('should store the range and load the sankey plus tag summaries', () => {
      createComponent();

      setRange();

      expect(api.getCashFlowSankey).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-01-31' });
      expect(tagApi.getTagSummaries).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-01-31' });
      expect(component.sankeyData()).toEqual(sankeyFixture);
      expect(component.tagSummaries()).toEqual(tagSummariesFixture);
      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should treat a null range as all-history and reload (preset "Todo")', () => {
      createComponent();
      setRange();

      component.onDateRangeChange(null);

      expect(component.startDate).toBe('2000-01-01');
      expect(component.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(api.getCashFlowSankey).toHaveBeenCalledTimes(2); // setRange + Todo
    });

    it('should set the Spanish error and stop loading when the sankey fetch fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      api.getCashFlowSankey.mockReturnValue(throwError(() => new Error('boom')));
      createComponent();

      setRange();

      expect(component.error()).toBe('Error al cargar los datos del flujo de efectivo');
      expect(component.isLoading()).toBe(false);
      expect(component.sankeyData()).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should clear the category selection and the subcategory cache on reload', fakeAsync(() => {
      createComponent();
      setRange();
      selectCategory();
      expect(component.selectedCategory()).not.toBeNull();
      expect(api.getSubCategoriesByCategory).toHaveBeenCalledTimes(1);

      setRange();

      expect(component.selectedCategory()).toBeNull();
      expect(component.subCategoryData()).toEqual([]);

      selectCategory();
      expect(api.getSubCategoriesByCategory).toHaveBeenCalledTimes(2);
    }));
  });

  describe('tag filtering', () => {
    it('should load by tags and theme the chart with the first selected tag color', () => {
      createComponent();
      setRange();

      component.selectedTagIds.setValue([2, 1]);
      component.onTagFilterChange();

      expect(api.getCashFlowSankeyByTags).toHaveBeenCalledWith('2,1');
      expect(api.getCashFlowSankey).toHaveBeenCalledTimes(1); // only the initial date load
      // tag color mapped to the muted palette (yellows → Olivo)
      expect(component.selectedTagColor()).toBe('#8A8A4E');
    });

    it('should reset the color and return to the date endpoint when tags are cleared', () => {
      createComponent();
      setRange();
      component.selectedTagIds.setValue([1]);
      component.onTagFilterChange();

      component.selectedTagIds.setValue([]);
      component.onTagFilterChange();

      expect(component.selectedTagColor()).toBeNull();
      expect(api.getCashFlowSankey).toHaveBeenCalledTimes(2);
    });

    it('should add the tag and reload when a tag summary card is clicked', () => {
      createComponent();
      setRange();
      component.selectedTagIds.setValue([1]);

      component.onTagSummaryClick(2);

      expect(component.selectedTagIds.value).toEqual([1, 2]);
      expect(api.getCashFlowSankeyByTags).toHaveBeenCalledWith('1,2');
      expect(component.selectedTagColor()).toBe('#8A8A4E');
    });

    it('should deselect an already selected tag on click (toggle)', () => {
      createComponent();
      setRange();
      component.selectedTagIds.setValue([2]);

      component.onTagSummaryClick(2);

      expect(component.selectedTagIds.value).toEqual([]);
      expect(api.getCashFlowSankeyByTags).not.toHaveBeenCalled();
      expect(api.getCashFlowSankey).toHaveBeenCalled();
    });
  });

  describe('category selection', () => {
    it('should ignore clicks on the total node', fakeAsync(() => {
      createComponent();
      setRange();

      selectCategory(categoryClickEvent({ type: 'total', label: 'Gastos Totales' }));

      expect(component.selectedCategory()).toBeNull();
      expect(api.getSubCategoriesByCategory).not.toHaveBeenCalled();
    }));

    it('should select the category, load its subcategories and scroll to the panel', fakeAsync(() => {
      createComponent();
      setRange();

      selectCategory();

      expect(component.selectedCategory()).toEqual({
        id: 'category-Hogar',
        label: 'Hogar',
        value: 600,
        color: '#3A7D6E',
        categoryId: 1,
      });
      expect(api.getSubCategoriesByCategory).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        categoryId: 1,
      });
      expect(component.subCategoryData()).toEqual(subCategoriesFixture);
      expect(component.isLoadingSubCategories()).toBe(false);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    }));

    it('should resolve the categoryId from the sankey data when the event node lacks it', fakeAsync(() => {
      createComponent();
      setRange();

      selectCategory(categoryClickEvent({
        node: { id: 'category-Hogar', label: 'Hogar', value: 600 },
      }));

      expect(component.selectedCategory()?.categoryId).toBe(1);
      expect(api.getSubCategoriesByCategory).toHaveBeenCalledTimes(1);
    }));

    it('should not load subcategories when no categoryId can be resolved', fakeAsync(() => {
      createComponent();
      setRange();

      selectCategory(categoryClickEvent({ label: 'Fantasma', node: undefined }));

      expect(component.selectedCategory()).toEqual(expect.objectContaining({
        id: 'category-Fantasma',
        categoryId: undefined,
      }));
      expect(api.getSubCategoriesByCategory).not.toHaveBeenCalled();
    }));

    it('should use the tag-aware endpoint when tags are selected', fakeAsync(() => {
      createComponent();
      setRange();
      component.selectedTagIds.setValue([1]);

      selectCategory();

      expect(api.getSubCategoriesByCategoryWithTags).toHaveBeenCalledWith(1, '1');
      expect(api.getSubCategoriesByCategory).not.toHaveBeenCalled();
      expect(component.subCategoryData()).toEqual(subCategoriesFixture);
    }));

    it('should serve repeated clicks for the same category from the cache', fakeAsync(() => {
      createComponent();
      setRange();
      selectCategory();
      component.clearCategorySelection();
      expect(component.subCategoryData()).toEqual([]);

      selectCategory();

      expect(api.getSubCategoriesByCategory).toHaveBeenCalledTimes(1);
      expect(component.subCategoryData()).toEqual(subCategoriesFixture);
    }));

    it('should stop the subcategory spinner when the load fails', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      api.getSubCategoriesByCategory.mockReturnValue(throwError(() => new Error('boom')));
      createComponent();
      setRange();

      selectCategory();

      expect(component.isLoadingSubCategories()).toBe(false);
      expect(component.subCategoryData()).toEqual([]);
      consoleSpy.mockRestore();
    }));
  });

  describe('expense items by subcategory', () => {
    const selectSubCategory = (): void => {
      component.onSubCategoryClick(subCategoriesFixture[0]);
    };

    it('should load the expense items for the selected subcategory', fakeAsync(() => {
      createComponent();
      setRange();
      selectCategory();

      selectSubCategory();

      expect(component.selectedSubCategory()).toEqual(subCategoriesFixture[0]);
      expect(api.getExpenseItemsByCategory).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        categoryId: 1,
        subcategoryId: 11,
        tagIds: undefined,
        limit: 10,
        offset: 0,
      });
      expect(component.expenseItems()).toEqual([expenseItemFixture]);
      expect(component.expenseItemsCount()).toBe(1);
      expect(component.expenseItemsTotal()).toBe(120);
      expect(component.expenseItemsPagination.count).toBe(1);
      expect(component.isLoadingExpenseItems()).toBe(false);
    }));

    it('should reload with the new limit and offset when the pagination changes', fakeAsync(() => {
      createComponent();
      setRange();
      selectCategory();
      selectSubCategory();

      component.onExpenseItemsPaginationChange({ limit: 25, offset: 50 });

      expect(component.expenseItemsPagination.limit).toBe(25);
      expect(component.expenseItemsPagination.offset).toBe(50);
      expect(api.getExpenseItemsByCategory).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
      expect(api.getExpenseItemsByCategory).toHaveBeenCalledTimes(2);
    }));

    it('should stop the items spinner when the load fails', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      api.getExpenseItemsByCategory.mockReturnValue(throwError(() => new Error('boom')));
      createComponent();
      setRange();
      selectCategory();

      selectSubCategory();

      expect(component.isLoadingExpenseItems()).toBe(false);
      expect(component.expenseItems()).toEqual([]);
      consoleSpy.mockRestore();
    }));

    it('should reset the expense items when the subcategory selection is cleared', fakeAsync(() => {
      createComponent();
      setRange();
      selectCategory();
      selectSubCategory();

      component.clearSubCategorySelection();

      expect(component.selectedSubCategory()).toBeNull();
      expect(component.expenseItems()).toEqual([]);
      expect(component.expenseItemsCount()).toBe(0);
      expect(component.expenseItemsTotal()).toBe(0);
    }));
  });

  describe('inline category editing', () => {
    const startEditing = (): void => {
      createComponent();
      setRange();
      component.onCategoryClick(categoryClickEvent());
      tick();
      component.onSubCategoryClick(subCategoriesFixture[0]);
      component.startCategoryEdit(expenseItemFixture);
    };

    it('should populate the edit state from the item and its category', fakeAsync(() => {
      startEditing();

      expect(component.editingItemKey()).toBe('10-20');
      expect(component.editCategoryId()).toBe(1);
      expect(component.editSubcategoryId()).toBe(11);
      expect(component.editSubcategories()).toEqual(categoriesFixture[0].subcategories);
    }));

    it('should keep the current edit state when the same item is clicked again', fakeAsync(() => {
      startEditing();
      component.onEditCategoryChange(2);

      component.startCategoryEdit(expenseItemFixture);

      expect(component.editCategoryId()).toBe(2);
    }));

    it('should switch the subcategory list and reset the selection on category change', fakeAsync(() => {
      startEditing();

      component.onEditCategoryChange(2);

      expect(component.editCategoryId()).toBe(2);
      expect(component.editSubcategoryId()).toBeNull();
      expect(component.editSubcategories()).toEqual(categoriesFixture[1].subcategories);

      component.onEditCategoryChange(99);
      expect(component.editSubcategories()).toEqual([]);
    }));

    it('should cancel silently when the chosen pair matches the current one', fakeAsync(() => {
      startEditing();

      component.onEditSubcategoryChange(11, expenseItemFixture);

      expect(api.updateExpenseItemCategory).not.toHaveBeenCalled();
      expect(component.editingItemKey()).toBeNull();
      expect(component.editCategoryId()).toBeNull();
    }));

    it('should do nothing without an edit category selected', fakeAsync(() => {
      startEditing();
      component.cancelCategoryEdit();

      component.onEditSubcategoryChange(21, expenseItemFixture);

      expect(api.updateExpenseItemCategory).not.toHaveBeenCalled();
    }));

    it('should save the new pair, toast in Spanish and reload fresh data', fakeAsync(() => {
      startEditing();
      component.onEditCategoryChange(2);

      component.onEditSubcategoryChange(21, expenseItemFixture);
      tick();

      expect(api.updateExpenseItemCategory).toHaveBeenCalledWith({
        expenseId: 10,
        articleId: 20,
        categoryId: 2,
        subcategoryId: 21,
      });
      expect(toast.success).toHaveBeenCalledWith('Categoría actualizada');
      expect(component.isSavingCategory()).toBe(false);
      expect(component.editingItemKey()).toBeNull();
      // cache invalidated for the selected category + items reloaded
      expect(api.getSubCategoriesByCategory).toHaveBeenCalledTimes(2);
      expect(api.getExpenseItemsByCategory).toHaveBeenCalledTimes(2);
    }));

    it('should toast the Spanish error and keep editing when the update fails', fakeAsync(() => {
      startEditing();
      component.onEditCategoryChange(2);
      api.updateExpenseItemCategory.mockReturnValue(throwError(() => new Error('boom')));

      component.onEditSubcategoryChange(21, expenseItemFixture);

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar categoría');
      expect(component.isSavingCategory()).toBe(false);
      expect(component.editingItemKey()).toBe('10-20');
      expect(api.getSubCategoriesByCategory).toHaveBeenCalledTimes(1);
    }));
  });

  describe('formatting helpers', () => {
    it('should build the item key from expense and article ids', () => {
      createComponent();

      expect(component.itemKey(expenseItemFixture)).toBe('10-20');
    });

    it('should format dates as dd/MM/yyyy', () => {
      createComponent();

      expect(component.formatDate('2026-03-05T14:30:00')).toBe('05/03/2026');
    });

    it('should format date-times with the Spanish locale', () => {
      createComponent();

      const formatted = component.formatDateTime('2026-03-05T14:30:00');
      expect(formatted).toContain('mar');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('02:30');
    });

    it('should format currency with two decimals and thousands separator', () => {
      createComponent();

      expect(component.formatCurrency(1234.5)).toBe('$ 1,234.50');
      expect(component.formatCurrency(0)).toBe('$ 0.00');
    });
  });



  describe('tag stats trio and helpers', () => {
    it('aggregates totals, counts and the combined period of the selected tags', () => {
      createComponent();
      setRange();
      component.onTagSummaryClick(1);

      expect(component.selectedSummaries().map(s => s.id)).toEqual([1]);
      expect(component.tagStatsTotal()).toBe(300);
      expect(component.tagStatsCount()).toBe(2);
      expect(component.tagStatsPeriod()).toBeNull(); // fixture has no dates
    });

    it('formats a tag card period and collapses same-month ranges', () => {
      createComponent();

      expect(component.tagPeriodLabel({
        id: 1, name: 'Japón', color: '#4E8A6A', totalAmount: 1, expenseCount: 1,
        firstExpenseDate: '2024-11-05', lastExpenseDate: '2026-06-20',
      })).toMatch(/nov.*2024.*jun.*2026/i);

      expect(component.tagPeriodLabel({
        id: 1, name: 'Japón', color: '#4E8A6A', totalAmount: 1, expenseCount: 1,
      })).toBeNull();
    });

    it('labels the category percent against the sankey total and the active source', () => {
      createComponent();
      setRange();

      expect(component.categoryPercentLabel(200)).toContain('del total');

      component.onTagSummaryClick(1);
      const label = component.categoryPercentLabel(200);
      expect(label).toContain('de la etiqueta');
      expect(label).toMatch(/^\d+\.\d%/);
    });

    it('toggles compare mode', () => {
      createComponent();

      component.toggleCompareMode();
      expect(component.compareMode()).toBe(true);
      component.toggleCompareMode();
      expect(component.compareMode()).toBe(false);
    });
  });

});
