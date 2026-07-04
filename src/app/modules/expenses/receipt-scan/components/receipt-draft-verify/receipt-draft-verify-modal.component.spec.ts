import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of, throwError } from 'rxjs';

import { ReceiptDraftVerifyModalComponent } from './receipt-draft-verify-modal.component';
import { ArticleSearchDialogComponent } from '../article-search-dialog/article-search-dialog.component';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { ICategory } from '@shared/interfaces/common.model';
import { ReceiptDraftApiService } from '../../services/receipt-draft-api.service';
import {
  ReceiptDraft,
  ReceiptDraftCandidate,
  ReceiptDraftData,
  ReceiptDraftItem
} from '../../models/receipt-draft.model';

type DraftRow = ReceiptDraftItem & { creatingNew: boolean; mergedCount?: number };

describe('ReceiptDraftVerifyModalComponent', () => {
  let fixture: ComponentFixture<ReceiptDraftVerifyModalComponent>;
  let component: ReceiptDraftVerifyModalComponent;
  let dialogRef: { close: jest.Mock };
  let dialog: { open: jest.Mock };
  let api: { update: jest.Mock; confirm: jest.Mock };
  let toast: { observe: jest.Mock; error: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let expensesService: { getCategoriesForUser: jest.Mock };
  let searchResult: unknown = null;
  let confirmAction: unknown;

  const cand = (articleId: number, concept: string, score = 0.9): ReceiptDraftCandidate => ({ articleId, concept, score });

  const categories: ICategory[] = [
    {
      id: 1,
      name: 'Alimentos',
      colorPalette: null,
      enabledTiers: ['premium'],
      subcategories: [
        { id: 10, name: 'Lácteos', categoryId: 1, enabledTiers: ['premium'] },
        { id: 11, name: 'Panadería', categoryId: 1, enabledTiers: ['premium'] }
      ]
    },
    { id: 2, name: 'Limpieza', colorPalette: null, enabledTiers: ['premium'], subcategories: [] }
  ];

  const baseItems = (): ReceiptDraftItem[] => [
    {
      name: 'LECHE 1L', unitPrice: 10, quantity: 2, barcode: '750100', sku: null,
      status: 'matched', candidates: [cand(11, 'Leche entera')], selectedArticleId: 11, newArticle: null
    },
    {
      name: 'PAN BIMBO', unitPrice: 5, quantity: 1, barcode: null, sku: 'SKU-2',
      status: 'no-match', candidates: [cand(22, 'Pan blanco', 0.4)], selectedArticleId: null, newArticle: null
    },
    {
      name: 'QUESO PANELA', unitPrice: 7.25, quantity: 4, barcode: null, sku: null,
      status: 'new', candidates: [], selectedArticleId: null, newArticle: { concept: 'Queso panela' }
    }
  ];

  function setup(items: ReceiptDraftItem[] = baseItems(), dataExtra: Partial<ReceiptDraftData> = {}): ReceiptDraft {
    const draft: ReceiptDraft = {
      id: 7,
      store: 'Soriana',
      expenseDate: '2026-06-10',
      total: 49,
      status: 'pending',
      data: { store: 'Soriana', date: '2026-06-10', items, ...dataExtra }
    };

    searchResult = null;
    confirmAction = undefined;
    dialogRef = { close: jest.fn() };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(searchResult) })) };
    api = { update: jest.fn(), confirm: jest.fn() };
    toast = { observe: jest.fn(() => (source: unknown) => source), error: jest.fn() };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmAction) })) };
    expensesService = { getCategoriesForUser: jest.fn(() => of(categories)) };

    TestBed.configureTestingModule({
      imports: [ReceiptDraftVerifyModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { draft } },
        { provide: MatDialog, useValue: dialog },
        { provide: ReceiptDraftApiService, useValue: api },
        { provide: HotToastService, useValue: toast },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: ExpensesService, useValue: expensesService }
      ]
    });
    TestBed.overrideComponent(ReceiptDraftVerifyModalComponent, { set: { template: '', imports: [] } });

    fixture = TestBed.createComponent(ReceiptDraftVerifyModalComponent);
    component = fixture.componentInstance;
    return draft;
  }

  const items = (): DraftRow[] => component['items']() as DraftRow[];

  describe('initial state', () => {
    it('should expose the store and map items, flagging in-progress new articles', () => {
      setup();

      expect(component['store']).toBe('Soriana');
      expect(items().map((row) => row.creatingNew)).toEqual([false, false, true]);
      expect(component['costcoMode']()).toBe(false);
      expect(component['selectionMode']()).toBe(false);
      expect(component['selectedCount']()).toBe(0);
    });

    it('should take the costco mode stored on the draft', () => {
      setup(baseItems(), { costcoMode: true });

      expect(component['costcoMode']()).toBe(true);
    });

    it('should compute resolved, skipped, totals and the split row lists', () => {
      setup();

      expect(component['resolvedCount']()).toBe(2);
      expect(component['skippedCount']()).toBe(1);
      expect(component['total']()).toBe(49);
      expect(component['pendingRows']().map((row) => row.index)).toEqual([1]);
      expect(component['resolvedRows']().map((row) => row.index)).toEqual([0, 2]);
    });

    it('should resolve the display concept from the new article or the selected candidate', () => {
      setup();

      expect(component['conceptFor'](items()[0])).toBe('Leche entera');
      expect(component['conceptFor'](items()[1])).toBe('');
      expect(component['conceptFor'](items()[2])).toBe('Queso panela');
      expect(component['subtotal'](items()[2])).toBe(29);
    });
  });

  describe('row resolution', () => {
    it('should select a candidate and mark the row matched', () => {
      setup();

      component['selectCandidate'](1, 22);

      const row = items()[1];
      expect(row.selectedArticleId).toBe(22);
      expect(row.status).toBe('matched');
      expect(row.newArticle).toBeNull();
      expect(component['resolvedCount']()).toBe(3);
    });

    it('should clear a resolution back to no-match', () => {
      setup();

      component['clearSelection'](0);

      const row = items()[0];
      expect(row.selectedArticleId).toBeNull();
      expect(row.newArticle).toBeNull();
      expect(row.status).toBe('no-match');
      expect(component['resolvedCount']()).toBe(1);
    });

    it('should open the create dialog and resolve the row with the created article', () => {
      setup();
      searchResult = { concept: 'Pan Bimbo Integral', categoryId: 2, subcategoryId: 10, learnCode: true };

      component['startCreateNew'](1);

      const row = items()[1];
      expect(row.creatingNew).toBe(false);
      expect(row.newArticle).toEqual({ concept: 'Pan Bimbo Integral' });
      expect(row.categoryId).toBe(2);
      expect(row.subcategoryId).toBe(10);
      expect(row.learnCode).toBe(true);
      expect(row.status).toBe('new');
      expect(row.selectedArticleId).toBeNull();
    });

    it('should keep the row unresolved when the create dialog is dismissed', () => {
      setup();
      searchResult = null;

      component['startCreateNew'](1);

      const row = items()[1];
      expect(row.newArticle).toBeNull();
      expect(row.status).toBe('no-match');
    });

    it('should toggle learnCode treating undefined as on', () => {
      setup();

      component['toggleLearnCode'](0);
      expect(items()[0].learnCode).toBe(false);

      component['toggleLearnCode'](0);
      expect(items()[0].learnCode).toBe(true);
    });

    it('should sanitize quantity edits to a minimum of 1', () => {
      setup();

      component['updateQuantity'](0, '5');
      expect(items()[0].quantity).toBe(5);

      component['updateQuantity'](0, '0');
      expect(items()[0].quantity).toBe(1);

      component['updateQuantity'](0, 'abc');
      expect(items()[0].quantity).toBe(1);
    });

    it('should sanitize price edits to numbers, defaulting to 0', () => {
      setup();

      component['updatePrice'](0, '12.5');
      expect(items()[0].unitPrice).toBe(12.5);

      component['updatePrice'](0, 'abc');
      expect(items()[0].unitPrice).toBe(0);
    });
  });

  describe('confirmed ordering', () => {
    it('should put the most recently confirmed row at the top of the resolved list', () => {
      setup();

      component['selectCandidate'](1, 22);

      expect(component['resolvedRows']().map((row) => row.index)).toEqual([1, 0, 2]);
    });

    it('should stack successive confirmations newest-first', () => {
      setup([
        { ...baseItems()[1], name: 'A' },
        { ...baseItems()[1], name: 'B' },
        { ...baseItems()[1], name: 'C' }
      ]);

      component['selectCandidate'](0, 22);
      component['selectCandidate'](2, 22);

      expect(component['resolvedRows']().map((row) => row.index)).toEqual([2, 0]);
    });

    it('should drop the recency stamp when a row is un-resolved', () => {
      setup();
      component['selectCandidate'](1, 22);

      component['clearSelection'](1);
      component['selectCandidate'](1, 22);

      expect(component['resolvedRows']().map((row) => row.index)).toEqual([1, 0, 2]);
    });
  });

  describe('categories and discount', () => {
    it('should load the tier-filtered categories on init', () => {
      setup();

      component.ngOnInit();

      expect(expensesService.getCategoriesForUser).toHaveBeenCalled();
      expect(component['categories']()).toEqual(categories);
    });

    it('should toast an error when categories fail to load', () => {
      setup();
      expensesService.getCategoriesForUser.mockReturnValue(throwError(() => new Error('boom')));

      component.ngOnInit();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las categorías');
    });

    it('should expose the subcategories of the item category', () => {
      setup();
      component.ngOnInit();

      component['updateCategory'](0, 1);
      expect(component['subcategoriesFor'](items()[0]).map((sub) => sub.id)).toEqual([10, 11]);

      component['updateCategory'](0, 2);
      expect(component['subcategoriesFor'](items()[0])).toEqual([]);
    });

    it('should reset the subcategory when the category changes', () => {
      setup();

      component['updateCategory'](0, 1);
      component['updateSubcategory'](0, 10);
      expect(items()[0].subcategoryId).toBe(10);

      component['updateCategory'](0, 2);
      expect(items()[0].categoryId).toBe(2);
      expect(items()[0].subcategoryId).toBeNull();

      component['updateCategory'](0, null);
      expect(items()[0].categoryId).toBeNull();
    });

    it('should toggle the discount flag', () => {
      setup();

      component['toggleDiscount'](0);
      expect(items()[0].hasDiscount).toBe(true);

      component['toggleDiscount'](0);
      expect(items()[0].hasDiscount).toBe(false);
    });
  });

  describe('searchArticle', () => {
    it('should open the search dialog and ignore a dismissed result', () => {
      setup();
      searchResult = null;

      component['searchArticle'](1);

      expect(dialog.open).toHaveBeenCalledWith(ArticleSearchDialogComponent, {
        width: '400px',
        maxHeight: '80vh',
        data: { contextName: 'PAN BIMBO' },
      });
      expect(items()[1].selectedArticleId).toBeNull();
    });

    it('should prepend an unseen result as candidate and select it', () => {
      setup();
      searchResult = {
        articleId: 33, concept: 'Pan integral', brand: null, barcode: null, score: 0, matchedOn: 'concept'
      };

      component['searchArticle'](1);

      const row = items()[1];
      expect(row.candidates.map((candidate) => candidate.articleId)).toEqual([33, 22]);
      expect(row.selectedArticleId).toBe(33);
      expect(row.status).toBe('matched');
      expect(row.newArticle).toBeNull();
      expect(items()[0].selectedArticleId).toBe(11);
    });

    it('should not duplicate a result that is already a candidate', () => {
      setup();
      searchResult = {
        articleId: 22, concept: 'Pan blanco', brand: null, barcode: null, score: 0.4, matchedOn: 'concept'
      };

      component['searchArticle'](1);

      const row = items()[1];
      expect(row.candidates).toHaveLength(1);
      expect(row.selectedArticleId).toBe(22);
    });
  });

  describe('selection and combine', () => {
    it('should toggle selection mode and always reset the selected set', () => {
      setup();
      component['toggleSelected'](0);

      component['toggleSelectionMode']();
      expect(component['selectionMode']()).toBe(true);
      expect(component['selectedCount']()).toBe(0);

      component['toggleSelected'](0);
      component['toggleSelected'](1);
      component['toggleSelected'](0);
      expect([...component['selected']()]).toEqual([1]);
    });

    it('should do nothing when fewer than two rows are selected', () => {
      setup();
      component['toggleSelected'](0);

      component['combineSelected']();

      expect(items()).toHaveLength(3);
    });

    it('should merge the selected rows into the first one with blended price', fakeAsync(() => {
      setup();
      component['toggleSelectionMode']();
      component['toggleSelected'](0);
      component['toggleSelected'](1);

      component['combineSelected']();

      const rows = items();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(expect.objectContaining({
        name: 'LECHE 1L',
        quantity: 3,
        unitPrice: 8.33,
        mergedCount: 2,
        selectedArticleId: 11,
        status: 'matched'
      }));
      expect(rows[1].name).toBe('QUESO PANELA');
      expect(component['selectedCount']()).toBe(0);
      expect(component['selectionMode']()).toBe(false);

      expect(component['justMergedIndex']()).toBe(0);
      tick(1300);
      expect(component['justMergedIndex']()).toBeNull();
    }));

    it('should keep the discount flag when any merged row had one', fakeAsync(() => {
      setup([
        { ...baseItems()[0], hasDiscount: false },
        { ...baseItems()[1], hasDiscount: true }
      ]);
      component['toggleSelected'](0);
      component['toggleSelected'](1);

      component['combineSelected']();
      tick(1300);

      expect(items()[0].hasDiscount).toBe(true);
    }));

    it('should accumulate mergedCount across successive merges', fakeAsync(() => {
      setup();
      component['toggleSelected'](0);
      component['toggleSelected'](1);
      component['combineSelected']();
      tick(1300);

      component['toggleSelected'](0);
      component['toggleSelected'](1);
      component['combineSelected']();
      tick(1300);

      const rows = items();
      expect(rows).toHaveLength(1);
      expect(rows[0].mergedCount).toBe(3);
      expect(rows[0].quantity).toBe(7);
    }));
  });

  describe('toggleCostco', () => {
    it('should divide every unit price by 1.023 when enabled and revert when disabled', () => {
      setup([
        { ...baseItems()[0], unitPrice: 102.3 },
        { ...baseItems()[1], unitPrice: 51.15 },
        { ...baseItems()[2], unitPrice: 20.46 }
      ]);

      component['toggleCostco'](true);
      expect(component['costcoMode']()).toBe(true);
      expect(items().map((row) => row.unitPrice)).toEqual([100, 50, 20]);

      component['toggleCostco'](false);
      expect(component['costcoMode']()).toBe(false);
      expect(items().map((row) => row.unitPrice)).toEqual([102.3, 51.15, 20.46]);
    });
  });

  describe('confirm', () => {
    it('should not call the API while a save is already in flight', () => {
      setup();
      component['saving'].set(true);

      component['confirm']();

      expect(api.update).not.toHaveBeenCalled();
    });

    it('should persist the resolutions stripped of UI-only fields, with Spanish toasts', () => {
      const draft = setup();
      api.update.mockReturnValue(of(draft));
      confirmAction = undefined;

      component['confirm']();

      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando borrador...', success: 'Borrador guardado', error: 'Error al guardar'
      });
      expect(api.update).toHaveBeenCalledWith(7, { items: expect.any(Array), costcoMode: false });
      const payloadItems = api.update.mock.calls[0][1].items;
      expect(payloadItems).toHaveLength(3);
      expect(payloadItems[0]).toEqual(expect.objectContaining({
        name: 'LECHE 1L', unitPrice: 10, quantity: 2, barcode: '750100', sku: null,
        status: 'matched', selectedArticleId: 11, newArticle: null,
        hasDiscount: false, categoryId: null, subcategoryId: null
      }));
      expect(payloadItems[0]).not.toHaveProperty('creatingNew');
      expect(payloadItems[0]).not.toHaveProperty('mergedCount');
      expect(payloadItems[0]).not.toHaveProperty('resolvedSeq');
    });

    it('should persist the discount flag and category choices per item', () => {
      const draft = setup();
      api.update.mockReturnValue(of(draft));
      component['toggleDiscount'](0);
      component['updateCategory'](0, 1);
      component['updateSubcategory'](0, 10);

      component['confirm']();

      const payloadItems = api.update.mock.calls[0][1].items;
      expect(payloadItems[0]).toEqual(expect.objectContaining({
        hasDiscount: true, categoryId: 1, subcategoryId: 10
      }));
    });

    it('should ask to complete and close as saved when the user chooses later', () => {
      const draft = setup();
      api.update.mockReturnValue(of(draft));
      confirmAction = 'cancelled';

      component['confirm']();

      expect(magueyConfirmation.open).toHaveBeenCalledWith(expect.objectContaining({
        title: '¿Completar el gasto ahora?',
        message: 'El escaneo se guardó en "Recibos por revisar". Puedes completarlo como gasto ahora o continuar después.',
        dismissible: false
      }));
      expect(api.confirm).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith({ saved: true });
      expect(component['saving']()).toBe(false);
    });

    it('should confirm the draft into an expense and hand it back when completing now', () => {
      const draft = setup();
      api.update.mockReturnValue(of(draft));
      api.confirm.mockReturnValue(of({ id: 99 }));
      confirmAction = 'confirmed';

      component['confirm']();

      expect(api.confirm).toHaveBeenCalledWith(7);
      expect(dialogRef.close).toHaveBeenCalledWith({ expense: { id: 99 }, complete: true });
      expect(component['saving']()).toBe(false);
    });

    it('should stop saving and not prompt when the update fails', () => {
      setup();
      api.update.mockReturnValue(throwError(() => new Error('boom')));

      component['confirm']();

      expect(component['saving']()).toBe(false);
      expect(magueyConfirmation.open).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should stop saving and keep the dialog open when the completion fails', () => {
      const draft = setup();
      api.update.mockReturnValue(of(draft));
      api.confirm.mockReturnValue(throwError(() => new Error('boom')));
      confirmAction = 'confirmed';

      component['confirm']();

      expect(component['saving']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('should close without a result on cancel', () => {
    setup();

    component['cancel']();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
