import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { ArticleListManagerComponent } from './article-list-manager.component';
import { IExpenseArticles as IExpenseArticle } from '@shared/interfaces/expense.model';
import { ArticlesService } from '@app/modules/inventory/articles.service';
import { ArticleRecord } from '@shared/interfaces/article.model';
import { Category, ISubcategory } from '@shared/interfaces/common.model';

describe('ArticleListManagerComponent', () => {
  let fixture: ComponentFixture<ArticleListManagerComponent>;
  let component: ArticleListManagerComponent;
  let articlesApi: { createArticle: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };

  const subcatLimpieza: ISubcategory = { id: 11, name: 'Limpieza', categoryId: 1, enabledTiers: ['free'] };
  const subcatCocina: ISubcategory = { id: 12, name: 'Cocina', categoryId: 1, enabledTiers: ['free'] };
  const subcatVarios: ISubcategory = { id: 31, name: 'Varios', categoryId: 3, enabledTiers: ['free'] };

  const catHogar: Category = {
    id: 1, name: 'Hogar', colorPalette: '#AABBCC', enabledTiers: ['free'], subcategories: [subcatLimpieza, subcatCocina]
  };
  const catSuper: Category = {
    id: 2, name: 'Súper', colorPalette: null, enabledTiers: ['free'], subcategories: []
  };
  const catOtros: Category = {
    id: 3, name: 'Otros', colorPalette: '#001122', enabledTiers: ['free'], subcategories: [subcatVarios]
  };

  const articleRecords: ArticleRecord[] = [
    { id: 10, concept: 'Escoba', isEnabled: true },
    { id: 20, concept: 'Jabón', isEnabled: true }
  ];

  const makeExisting = (overrides: Partial<IExpenseArticle> = {}): IExpenseArticle => ({
    articleId: 20,
    articleName: 'Jabón',
    quantity: 2,
    units: 'pzas',
    price: 30,
    onDiscount: false,
    categoryId: 1,
    subcategoryId: 11,
    categoryName: 'Hogar',
    subcategoryName: 'Limpieza',
    subtotal: 60,
    ...overrides
  });

  beforeEach(() => {
    articlesApi = { createArticle: jest.fn() };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ArticleListManagerComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: ArticlesService, useValue: articlesApi },
        { provide: HotToastService, useValue: toast }
    ]
});

    fixture = TestBed.createComponent(ArticleListManagerComponent);
    component = fixture.componentInstance;
    component.articles = [...articleRecords];
    component.categories = [catHogar, catSuper, catOtros];
    component.expenseArticles = [];
    component.ngOnInit();
  });

  describe('initialization', () => {
    it('should create the article form with its defaults and start invalid', () => {
      expect(component.articleForm.value).toEqual({
        articleId: null,
        quantity: 1,
        units: 'pzas',
        price: null,
        category: null,
        subcategory: null,
        onDiscount: false,
        costcoDiscount: 0,
        costcoIVA: false
      });
      expect(component.articleForm.invalid).toBe(true);
    });

    it('should create an empty, invalid edit form and no editing row', () => {
      expect(component.editForm.value).toEqual({
        quantity: null,
        price: null,
        category: null,
        subcategory: null,
        onDiscount: false
      });
      expect(component.editForm.invalid).toBe(true);
      expect(component.editingIndex()).toBeNull();
    });

    it('should auto-enable the discount toggle when a costco discount is entered', () => {
      component.articleForm.patchValue({ costcoDiscount: 50 });

      expect(component.articleForm.get('onDiscount')?.value).toBe(true);
    });

    it('should not touch the discount toggle for a zero costco discount', () => {
      component.articleForm.patchValue({ costcoDiscount: 0 });

      expect(component.articleForm.get('onDiscount')?.value).toBe(false);
    });

    it('should leave the discount toggle on when it was already enabled', () => {
      component.articleForm.patchValue({ onDiscount: true });
      component.articleForm.patchValue({ costcoDiscount: 25 });

      expect(component.articleForm.get('onDiscount')?.value).toBe(true);
    });
  });

  describe('addArticleOnTheFly', () => {
    it('should create the article with the trimmed concept, append it and toast', async () => {
      const created = { id: 99, concept: 'Nuevo', isEnabled: true };
      articlesApi.createArticle.mockReturnValue(of(created));

      const result = await component.addArticleOnTheFly('  Nuevo  ');

      expect(articlesApi.createArticle).toHaveBeenCalledWith({ concept: 'Nuevo' });
      expect(result).toEqual(created);
      expect(component.articles).toContain(created);
      expect(toast.success).toHaveBeenCalledWith('Artículo "  Nuevo  " creado');
    });

    it('should resolve null and toast an error when creation fails', async () => {
      articlesApi.createArticle.mockReturnValue(throwError(() => new Error('boom')));

      const result = await component.addArticleOnTheFly('Nuevo');

      expect(result).toBeNull();
      expect(component.articles).toHaveLength(2);
      expect(toast.error).toHaveBeenCalledWith('Error al crear el artículo');
    });
  });

  describe('onCategorySelect', () => {
    it('should expose the subcategories of the selected category', () => {
      component.onCategorySelect(catHogar.id);

      expect(component.subcategories).toEqual([subcatLimpieza, subcatCocina]);
    });

    it('should fall back to an empty list when the category has none', () => {
      component.onCategorySelect(catSuper.id);

      expect(component.subcategories).toEqual([]);
    });

    it('should fall back to an empty list when the category id is unknown', () => {
      component.onCategorySelect(999);

      expect(component.subcategories).toEqual([]);
    });
  });

  describe('addArticle', () => {
    function fillValidForm(): void {
      component.onCategorySelect(catHogar.id);
      component.articleForm.patchValue({
        articleId: 10,
        quantity: 3,
        units: 'kg',
        price: 25.5,
        category: catHogar.id,
        subcategory: subcatLimpieza.id,
        onDiscount: true
      });
    }

    it('should mark the form touched and emit nothing when invalid', () => {
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      const totalSpy = jest.spyOn(component.totalAmountChange, 'emit');

      component.addArticle();

      expect(component.articleForm.touched).toBe(true);
      expect(articlesSpy).not.toHaveBeenCalled();
      expect(totalSpy).not.toHaveBeenCalled();
    });

    it('should prepend the new article and emit the updated list and total', () => {
      component.expenseArticles = [makeExisting()];
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      const totalSpy = jest.spyOn(component.totalAmountChange, 'emit');
      fillValidForm();

      component.addArticle();

      expect(articlesSpy).toHaveBeenCalledTimes(1);
      const emitted = articlesSpy.mock.calls[0][0] as IExpenseArticle[];
      expect(emitted).toHaveLength(2);
      expect(emitted[0]).toEqual({
        articleId: 10,
        articleName: 'Escoba',
        quantity: 3,
        units: 'kg',
        price: 25.5,
        onDiscount: true,
        categoryId: 1,
        subcategoryId: 11,
        categoryName: 'Hogar',
        subcategoryName: 'Limpieza',
        subtotal: 76.5
      });
      expect(emitted[1]).toEqual(makeExisting());
      expect(component.expenseArticles).toBe(emitted);
      expect(totalSpy).toHaveBeenCalledWith(136.5);
    });

    it('should reset the form but keep category, subcategory and defaults', () => {
      fillValidForm();
      component.articleForm.markAllAsTouched();

      component.addArticle();

      expect(component.articleForm.value).toEqual({
        articleId: null,
        quantity: 1,
        units: 'pzas',
        price: null,
        category: catHogar.id,
        subcategory: subcatLimpieza.id,
        onDiscount: false,
        costcoDiscount: 0,
        costcoIVA: false
      });
      expect(component.articleForm.pristine).toBe(true);
      expect(component.articleForm.untouched).toBe(true);
    });

    it('should use an empty article name when the id is unknown', () => {
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      fillValidForm();
      component.articleForm.patchValue({ articleId: 555 });

      component.addArticle();

      const emitted = articlesSpy.mock.calls[0][0] as IExpenseArticle[];
      expect(emitted[0].articleName).toBe('');
    });

    it('should apply the costco price formula (price - discount) / 1.023', () => {
      component.costcoMode = true;
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      fillValidForm();
      component.articleForm.patchValue({ quantity: 1, price: 102.3, costcoDiscount: 2.3, costcoIVA: false });

      component.addArticle();

      const emitted = articlesSpy.mock.calls[0][0] as IExpenseArticle[];
      expect(emitted[0].price).toBe(97.75);
      expect(emitted[0].subtotal).toBe(97.75);
    });

    it('should add IVA before the costco divisor when the toggle is on', () => {
      component.costcoMode = true;
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      const totalSpy = jest.spyOn(component.totalAmountChange, 'emit');
      fillValidForm();
      component.articleForm.patchValue({ quantity: 2, price: 100, costcoDiscount: 0, costcoIVA: true });

      component.addArticle();

      const emitted = articlesSpy.mock.calls[0][0] as IExpenseArticle[];
      expect(emitted[0].price).toBe(113.39);
      expect(emitted[0].subtotal).toBe(226.78);
      expect(totalSpy).toHaveBeenCalledWith(226.78);
    });
  });

  describe('deleteArticle', () => {
    it('should remove the article at the index and emit the new list and total', () => {
      const first = makeExisting();
      const second = makeExisting({ articleId: 10, articleName: 'Escoba', subtotal: 40 });
      component.expenseArticles = [first, second];
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      const totalSpy = jest.spyOn(component.totalAmountChange, 'emit');

      component.deleteArticle(0);

      expect(component.expenseArticles).toEqual([second]);
      expect(articlesSpy).toHaveBeenCalledWith([second]);
      expect(totalSpy).toHaveBeenCalledWith(40);
    });
  });

  describe('updateSubtotal', () => {
    it('should overwrite the subtotal from the input and re-emit list and total', () => {
      component.expenseArticles = [makeExisting(), makeExisting({ subtotal: 10 })];
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      const totalSpy = jest.spyOn(component.totalAmountChange, 'emit');
      const event = { target: { value: '99.5' } } as unknown as Event;

      component.updateSubtotal(event, 0);

      expect(component.expenseArticles[0].subtotal).toBe(99.5);
      expect(articlesSpy).toHaveBeenCalledWith(component.expenseArticles);
      expect(totalSpy).toHaveBeenCalledWith(109.5);
    });
  });

  describe('startEdit', () => {
    it('should enter edit mode, emit the editing state and patch the edit form', () => {
      component.expenseArticles = [makeExisting({ onDiscount: true })];
      const editingSpy = jest.spyOn(component.editingStateChange, 'emit');

      component.startEdit(0);

      expect(component.editingIndex()).toBe(0);
      expect(editingSpy).toHaveBeenCalledWith(true);
      expect(component.editSubcategories).toEqual([subcatLimpieza, subcatCocina]);
      expect(component.editForm.value).toEqual({
        quantity: 2,
        price: 30,
        category: catHogar.id,
        subcategory: subcatLimpieza.id,
        onDiscount: true
      });
    });

    it('should leave subcategories empty when the item category is unknown', () => {
      component.expenseArticles = [makeExisting({ categoryId: 999 })];

      component.startEdit(0);

      expect(component.editSubcategories).toEqual([]);
      expect(component.editForm.get('category')?.value).toBeNull();
    });

    it('should not clobber the add-form subcategory options when a row enters edit mode', () => {
      component.onCategorySelect(catOtros.id);
      component.expenseArticles = [makeExisting()];

      component.startEdit(0);

      expect(component.subcategories).toEqual([subcatVarios]);
      expect(component.editSubcategories).toEqual([subcatLimpieza, subcatCocina]);
    });
  });

  describe('hover editing', () => {
    const HOVER_DELAY = ArticleListManagerComponent['HOVER_EDIT_DELAY_MS'];
    const GRACE = ArticleListManagerComponent['COMMIT_GRACE_MS'];
    const SUPPRESS = ArticleListManagerComponent['HOVER_SUPPRESS_AFTER_SELECT_MS'];

    const hoverIn = (index: number): void => {
      component.onRowMouseEnter(index);
      tick(HOVER_DELAY);
    };

    it('should enter edit mode only after the hover-intent delay', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      component.onRowMouseEnter(0);
      expect(component.editingIndex()).toBeNull();

      tick(HOVER_DELAY);
      expect(component.editingIndex()).toBe(0);
      expect(component.editForm.get('quantity')?.value).toBe(2);
    }));

    it('should not enter edit mode when the pointer leaves before the delay', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      component.onRowMouseEnter(0);
      tick(HOVER_DELAY / 2);
      component.onRowMouseLeave();
      tick(HOVER_DELAY + GRACE);

      expect(component.editingIndex()).toBeNull();
    }));

    it('should save on row leave after the grace period', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      hoverIn(0);
      component.editForm.patchValue({ quantity: 4 });
      component.onRowMouseLeave();
      expect(component.editingIndex()).toBe(0);

      tick(GRACE);
      expect(component.expenseArticles[0].quantity).toBe(4);
      expect(component.expenseArticles[0].subtotal).toBe(120);
      expect(component.editingIndex()).toBeNull();
    }));

    it('should keep editing when the pointer returns within the grace period', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      hoverIn(0);
      component.editForm.patchValue({ quantity: 4 });
      component.onRowMouseLeave();
      tick(GRACE / 3);
      component.onRowMouseEnter(0);
      tick(HOVER_DELAY + GRACE);

      expect(component.editingIndex()).toBe(0);
      expect(component.expenseArticles[0].quantity).toBe(2);
    }));

    it('should keep the row in edit mode when leaving with an invalid form', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      hoverIn(0);
      component.editForm.get('quantity')?.setValue(null);
      component.onRowMouseLeave();
      tick(HOVER_DELAY + GRACE);

      expect(component.editingIndex()).toBe(0);
      expect(component.expenseArticles[0].quantity).toBe(2);
    }));

    it('should save the current row when hovering a different row', fakeAsync(() => {
      component.expenseArticles = [makeExisting(), makeExisting({ articleId: 10, articleName: 'Escoba' })];
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');

      hoverIn(0);
      component.editForm.patchValue({ price: 99 });
      component.onRowMouseLeave();
      hoverIn(1);

      expect(component.expenseArticles[0].price).toBe(99);
      expect(articlesSpy).toHaveBeenCalled();
      expect(component.editingIndex()).toBe(1);
      tick(HOVER_DELAY + GRACE);
    }));

    it('should discard an invalid edit when switching to another row', fakeAsync(() => {
      component.expenseArticles = [makeExisting(), makeExisting({ articleId: 10, articleName: 'Escoba' })];

      hoverIn(0);
      component.editForm.get('quantity')?.setValue(null);
      component.onRowMouseLeave();
      hoverIn(1);

      expect(component.expenseArticles[0].quantity).toBe(2);
      expect(component.editingIndex()).toBe(1);
      tick(HOVER_DELAY + GRACE);
    }));

    it('should not commit on row leave while a select overlay is open', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      hoverIn(0);
      component.onEditSelectOpened(true);
      component.editForm.patchValue({ quantity: 7 });
      component.onRowMouseLeave();
      tick(HOVER_DELAY + GRACE + SUPPRESS);

      expect(component.editingIndex()).toBe(0);
      expect(component.expenseArticles[0].quantity).toBe(2);
      component.onEditSelectOpened(false);
      tick(HOVER_DELAY + GRACE + SUPPRESS);
    }));

    it('should ignore synthetic hover events right after a select closes', fakeAsync(() => {
      component.expenseArticles = [makeExisting(), makeExisting({ articleId: 10, articleName: 'Escoba' })];

      hoverIn(0);
      component.onEditSelectOpened(true);
      component.onEditSelectOpened(false);

      component.onRowMouseLeave();
      component.onRowMouseEnter(1);
      tick(SUPPRESS - 50);

      expect(component.editingIndex()).toBe(0);
      tick(HOVER_DELAY + GRACE + SUPPRESS);
    }));

    it('should commit again once the suppression window has passed', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      hoverIn(0);
      component.onEditSelectOpened(true);
      component.editForm.patchValue({ quantity: 7 });
      component.onEditSelectOpened(false);
      tick(SUPPRESS);

      component.onRowMouseEnter(0);
      component.onRowMouseLeave();
      tick(GRACE);

      expect(component.expenseArticles[0].quantity).toBe(7);
      expect(component.editingIndex()).toBeNull();
    }));

    it('should keep edit mode when re-entering the row being edited', fakeAsync(() => {
      component.expenseArticles = [makeExisting()];

      hoverIn(0);
      component.editForm.patchValue({ quantity: 9 });
      component.onRowMouseEnter(0);
      tick(HOVER_DELAY + GRACE);

      expect(component.editingIndex()).toBe(0);
      expect(component.editForm.get('quantity')?.value).toBe(9);
    }));

    it('should drop edit state when the edited row is deleted', fakeAsync(() => {
      component.expenseArticles = [makeExisting(), makeExisting({ articleId: 10, articleName: 'Escoba' })];

      hoverIn(1);
      component.deleteArticle(1);

      expect(component.editingIndex()).toBeNull();
      expect(component.expenseArticles).toHaveLength(1);
    }));

    it('should shift the editing index when an earlier row is deleted', fakeAsync(() => {
      component.expenseArticles = [makeExisting(), makeExisting({ articleId: 10, articleName: 'Escoba' })];

      hoverIn(1);
      component.deleteArticle(0);

      expect(component.editingIndex()).toBe(0);
      expect(component.expenseArticles[0].articleName).toBe('Escoba');
    }));
  });

  describe('saveEdit', () => {
    it('should do nothing when the edit form is invalid', () => {
      component.expenseArticles = [makeExisting()];
      component.startEdit(0);
      component.editForm.get('quantity')?.setValue(null);
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');

      component.saveEdit();

      expect(articlesSpy).not.toHaveBeenCalled();
      expect(component.editingIndex()).toBe(0);
    });

    it('should do nothing when no row is being edited', () => {
      component.expenseArticles = [makeExisting()];
      component.editForm.patchValue({
        quantity: 1, price: 1, category: catHogar.id, subcategory: subcatLimpieza.id, onDiscount: false
      });
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');

      component.saveEdit();

      expect(articlesSpy).not.toHaveBeenCalled();
    });

    it('should recompute the subtotal when quantity or price changed and exit edit mode', () => {
      const item = makeExisting();
      component.expenseArticles = [item];
      component.startEdit(0);
      const editingSpy = jest.spyOn(component.editingStateChange, 'emit');
      const articlesSpy = jest.spyOn(component.articlesChange, 'emit');
      const totalSpy = jest.spyOn(component.totalAmountChange, 'emit');
      component.editForm.patchValue({ quantity: 5, price: 12, onDiscount: true });

      component.saveEdit();

      expect(item.quantity).toBe(5);
      expect(item.price).toBe(12);
      expect(item.onDiscount).toBe(true);
      expect(item.subtotal).toBe(60);
      expect(articlesSpy).toHaveBeenCalledWith([item]);
      expect(totalSpy).toHaveBeenCalledWith(60);
      expect(component.editingIndex()).toBeNull();
      expect(editingSpy).toHaveBeenCalledWith(false);
      expect(component.editForm.pristine).toBe(true);
    });

    it('should keep a manually edited subtotal when only the category changed', () => {
      const item = makeExisting({ subtotal: 55 });
      component.expenseArticles = [item];
      component.startEdit(0);
      component.onEditCategorySelect(catOtros.id);
      component.editForm.patchValue({ category: catOtros.id, subcategory: subcatVarios.id });

      component.saveEdit();

      expect(item.categoryId).toBe(3);
      expect(item.categoryName).toBe('Otros');
      expect(item.subcategoryId).toBe(31);
      expect(item.subcategoryName).toBe('Varios');
      expect(item.subtotal).toBe(55);
    });
  });

  describe('cancelEdit', () => {
    it('should clear the editing index, emit false and reset the edit form', () => {
      component.expenseArticles = [makeExisting()];
      component.startEdit(0);
      const editingSpy = jest.spyOn(component.editingStateChange, 'emit');

      component.cancelEdit();

      expect(component.editingIndex()).toBeNull();
      expect(editingSpy).toHaveBeenCalledWith(false);
      expect(component.editForm.get('quantity')?.value).toBeNull();
    });
  });

  describe('helpers', () => {
    it('should resolve the category color, defaulting to null', () => {
      expect(component.getCategoryColor(1)).toBe('#AABBCC');
      expect(component.getCategoryColor(2)).toBeNull();
      expect(component.getCategoryColor(999)).toBeNull();
    });

    it('should swap subcategories and clear the selection on edit category change', () => {
      component.editForm.patchValue({ subcategory: subcatLimpieza.id });

      component.onEditCategorySelect(catOtros.id);

      expect(component.editSubcategories).toEqual([subcatVarios]);
      expect(component.editForm.get('subcategory')?.value).toBeNull();
    });
  });
});
