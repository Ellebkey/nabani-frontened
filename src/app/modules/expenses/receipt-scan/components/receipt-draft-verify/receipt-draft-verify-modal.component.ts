import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, computed,
} from '@angular/core';
import { formatBarcode } from '@shared/services/barcode';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@root/@maguey/services/confirmation';
import currency from 'currency.js';

import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { ReceiptDraftApiService } from '../../services/receipt-draft-api.service';
import { ReceiptDraft, ReceiptDraftItem } from '../../models/receipt-draft.model';
import { FuzzyMatchResult } from '../../models/receipt-scan.model';
import { ArticleCreateDialogComponent, ArticleCreateDialogResult } from '../article-create-dialog/article-create-dialog.component';
import { ArticleSearchDialogComponent } from '../article-search-dialog/article-search-dialog.component';

interface DraftRow extends ReceiptDraftItem {
  creatingNew: boolean;
  mergedCount?: number;
  // Monotonic stamp set when the user resolves the row.
  resolvedSeq?: number;
}

@Component({
    selector: 'app-receipt-draft-verify-modal',
    templateUrl: './receipt-draft-verify-modal.component.html',
    styleUrl: './receipt-draft-verify-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
        MatSlideToggleModule,
        ModalShellComponent,
        PillComponent,
        CompactSelectComponent,
    ]
})
export class ReceiptDraftVerifyModalComponent implements OnInit {
  protected readonly formatBarcode = formatBarcode;
  private readonly dialogRef = inject(MatDialogRef<ReceiptDraftVerifyModalComponent>);

  private readonly data = inject<{ draft: ReceiptDraft }>(MAT_DIALOG_DATA);

  private readonly dialog = inject(MatDialog);

  private readonly api = inject(ReceiptDraftApiService);

  private readonly toast = inject(HotToastService);

  private readonly magueyConfirmation = inject(MagueyConfirmationService);

  private readonly expensesService = inject(ExpensesService);

  protected readonly store = this.data.draft.store;

  protected readonly categories = signal<ICategory[]>([]);

  private resolvedSeqCounter = 0;

  protected readonly items = signal<DraftRow[]>(
    this.data.draft.data.items.map((item) => ({ ...item, creatingNew: item.status === 'new' && !!item.newArticle })),
  );

  protected readonly saving = signal(false);

  protected readonly costcoMode = signal(this.data.draft.data.costcoMode ?? false);

  protected readonly selectionMode = signal(false);

  protected readonly selected = signal<Set<number>>(new Set());

  protected readonly selectedCount = computed(() => this.selected().size);

  protected readonly justMergedIndex = signal<number | null>(null);

  protected readonly editingIndex = signal<number | null>(null);

  protected readonly categoryOptions = computed<MgSelectOption[]>(() => this.categories()
    .map((category) => ({ value: category.id, label: category.name, color: category.colorPalette || undefined })));

  protected readonly resolvedCount = computed(() => this.items().filter((item) => this.isResolved(item)).length);

  protected readonly skippedCount = computed(() => this.items().filter((item) => !this.isResolved(item)).length);

  protected readonly total = computed(() => this.items()
    .filter((item) => this.isResolved(item))
    .reduce((sum, item) => currency(item.unitPrice).multiply(item.quantity).add(sum).value, 0));

  protected readonly pendingRows = computed(() => this.items()
    .map((item, index) => ({ item, index }))
    .filter((row) => !this.isResolved(row.item)));

  // Newest confirmation first; scan-resolved rows (no seq) keep receipt order below.
  protected readonly resolvedRows = computed(() => this.items()
    .map((item, index) => ({ item, index }))
    .filter((row) => this.isResolved(row.item))
    .sort((a, b) => (b.item.resolvedSeq ?? -1) - (a.item.resolvedSeq ?? -1)));

  ngOnInit(): void {
    this.expensesService.getCategoriesForUser().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error('Error al cargar las categorías'),
    });
  }

  protected isResolved(item: DraftRow): boolean {
    return item.selectedArticleId !== null || item.newArticle !== null;
  }

  protected conceptFor(item: DraftRow): string {
    if (item.newArticle) return item.newArticle.concept;
    const candidate = item.candidates.find((c) => c.articleId === item.selectedArticleId);
    return candidate ? candidate.concept : '';
  }

  protected subtotal(item: DraftRow): number {
    return currency(item.unitPrice).multiply(item.quantity).value;
  }

  protected selectCandidate(index: number, articleId: number): void {
    this.patch(index, {
      selectedArticleId: articleId, newArticle: null, creatingNew: false, status: 'matched', resolvedSeq: ++this.resolvedSeqCounter,
    });
  }

  protected clearSelection(index: number): void {
    this.patch(index, {
      selectedArticleId: null, newArticle: null, creatingNew: false, status: 'no-match', resolvedSeq: undefined,
    });
  }

  protected searchArticle(index: number): void {
    const item = this.items()[index];
    this.dialog.open(ArticleSearchDialogComponent, {
      width: '400px',
      maxHeight: '80vh',
      data: { contextName: item?.name },
    })
      .afterClosed().subscribe((result: FuzzyMatchResult | { createNew: true } | null) => {
        if (!result) return;
        if ('createNew' in result) {
          this.startCreateNew(index);
          return;
        }
        this.items.update((rows) => rows.map((row, i) => {
          if (i !== index) return row;
          const candidates = row.candidates.some((c) => c.articleId === result.articleId)
            ? row.candidates
            : [{ articleId: result.articleId, concept: result.concept, score: result.score }, ...row.candidates];
          return {
            ...row, candidates, selectedArticleId: result.articleId, newArticle: null, creatingNew: false, status: 'matched', resolvedSeq: ++this.resolvedSeqCounter,
          };
        }));
      });
  }

  protected startCreateNew(index: number): void {
    const item = this.items()[index];
    this.dialog.open(ArticleCreateDialogComponent, {
      width: '400px',
      maxHeight: '90vh',
      data: {
        ocrText: item.name,
        barcode: item.barcode,
        categories: this.categories(),
        categoryId: item.categoryId ?? null,
        subcategoryId: item.subcategoryId ?? null,
      },
    })
      .afterClosed().subscribe((result: ArticleCreateDialogResult | null) => {
        if (!result) return;
        this.patch(index, {
          creatingNew: false,
          selectedArticleId: null,
          newArticle: { concept: result.concept },
          categoryId: result.categoryId,
          subcategoryId: result.subcategoryId,
          learnCode: result.learnCode,
          status: 'new',
          resolvedSeq: ++this.resolvedSeqCounter,
        });
      });
  }

  protected toggleLearnCode(index: number): void {
    const currentlyOn = this.items()[index].learnCode !== false;
    this.patch(index, { learnCode: !currentlyOn });
  }

  protected subcategoriesFor(item: DraftRow): ISubcategory[] {
    return this.categories().find((cat) => cat.id === item.categoryId)?.subcategories ?? [];
  }

  protected subcategoryOptionsFor(item: DraftRow): MgSelectOption[] {
    return this.subcategoriesFor(item).map((sub) => ({ value: sub.id, label: sub.name }));
  }

  protected categoryColor(item: DraftRow): string | null {
    return this.categories().find((cat) => cat.id === item.categoryId)?.colorPalette || null;
  }

  protected categoryName(item: DraftRow): string {
    return this.categories().find((cat) => cat.id === item.categoryId)?.name ?? '';
  }

  protected subcategoryName(item: DraftRow): string | null {
    return this.subcategoriesFor(item).find((sub) => sub.id === item.subcategoryId)?.name ?? null;
  }

  protected startEditing(index: number): void {
    this.editingIndex.set(index);
  }

  protected stopEditing(): void {
    this.editingIndex.set(null);
  }

  protected updateCategory(index: number, categoryId: number | null): void {
    this.patch(index, { categoryId, subcategoryId: null });
  }

  protected updateSubcategory(index: number, subcategoryId: number | null): void {
    this.patch(index, { subcategoryId });
  }

  protected toggleDiscount(index: number): void {
    this.patch(index, { hasDiscount: !this.items()[index].hasDiscount });
  }

  protected updateQuantity(index: number, value: string): void {
    this.patch(index, { quantity: Math.max(1, Number(value) || 1) });
  }

  protected updatePrice(index: number, value: string): void {
    this.patch(index, { unitPrice: Number(value) || 0 });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected confirm(): void {
    if (this.saving()) return;
    this.saving.set(true);

    const items: ReceiptDraftItem[] = this.items().map((row) => ({
      name: row.name,
      unitPrice: row.unitPrice,
      quantity: row.quantity,
      barcode: row.barcode,
      sku: row.sku,
      status: row.status,
      candidates: row.candidates,
      selectedArticleId: row.selectedArticleId,
      newArticle: row.newArticle,
      learnCode: row.learnCode,
      hasDiscount: row.hasDiscount ?? false,
      categoryId: row.categoryId ?? null,
      subcategoryId: row.subcategoryId ?? null,
    }));

    this.api.update(this.data.draft.id, { items, costcoMode: this.costcoMode() }).pipe(
      this.toast.observe({ loading: 'Guardando borrador...', success: 'Borrador guardado', error: 'Error al guardar' }),
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.promptComplete();
      },
      error: () => this.saving.set(false),
    });
  }

  /**
   * The resolved items are saved to the (still pending) draft; ask whether to
   * complete the expense now or leave the draft in "Recibos por revisar".
   */
  private promptComplete(): void {
    this.magueyConfirmation.open({
      title: '¿Completar el gasto ahora?',
      message: 'El escaneo se guardó en "Recibos por revisar". Puedes completarlo como gasto ahora o continuar después.',
      icon: { show: true, name: 'heroicons_outline:check-circle', color: 'success' },
      actions: {
        confirm: { show: true, label: 'Completar ahora', color: 'primary' },
        cancel: { show: true, label: 'Más tarde' },
      },
      dismissible: false,
    }).afterClosed().subscribe((action) => {
      if (action === 'confirmed') {
        this.completeNow();
      } else {
        this.dialogRef.close({ saved: true });
      }
    });
  }

  /** Confirm the draft into an expense (status -> confirmed) and hand it to the editor. */
  private completeNow(): void {
    this.saving.set(true);
    this.api.confirm(this.data.draft.id).pipe(
      this.toast.observe({ loading: 'Creando gasto...', success: 'Gasto creado', error: 'Error al crear el gasto' }),
    ).subscribe({
      next: (expense) => {
        this.saving.set(false);
        this.dialogRef.close({ expense, complete: true });
      },
      error: () => this.saving.set(false),
    });
  }

  protected toggleSelectionMode(): void {
    this.selectionMode.update((value) => !value);
    this.selected.set(new Set());
  }

  protected toggleSelected(index: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  /**
   * Merge the selected items into one: sum quantities and subtotals (the unit
   * price becomes the blended subtotal/quantity). Keeps the first item's name
   * and resolution; drops the rest.
   */
  protected combineSelected(): void {
    const indexes = [...this.selected()].sort((a, b) => a - b);
    if (indexes.length < 2) return;

    this.items.update((rows) => {
      const chosen = indexes.map((i) => rows[i]);
      const totalQty = chosen.reduce((sum, row) => sum + row.quantity, 0);
      const totalSubtotal = chosen.reduce(
        (sum, row) => currency(row.unitPrice).multiply(row.quantity).add(sum).value,
        0,
      );
      const mergedCount = chosen.reduce((sum, row) => sum + (row.mergedCount ?? 1), 0);
      const merged: DraftRow = {
        ...chosen[0],
        quantity: totalQty,
        unitPrice: totalQty > 0 ? currency(totalSubtotal).divide(totalQty).value : chosen[0].unitPrice,
        mergedCount,
        hasDiscount: chosen.some((row) => row.hasDiscount),
      };
      const remove = new Set(indexes.slice(1));
      return rows
        .map((row, i) => (i === indexes[0] ? merged : row))
        .filter((_, i) => !remove.has(i));
    });

    this.selected.set(new Set());
    this.selectionMode.set(false);

    // Briefly flash the merged row (it stays at the first selected position).
    this.justMergedIndex.set(indexes[0]);
    setTimeout(() => this.justMergedIndex.set(null), 1300);
  }

  /**
   * Costco/Sam's receipts print prices that need ÷1.023 to reach the charged price.
   * Toggling applies (or reverts) that adjustment to every line.
   */
  protected toggleCostco(enabled: boolean): void {
    this.costcoMode.set(enabled);
    this.items.update((rows) => rows.map((row) => ({
      ...row,
      unitPrice: enabled
        ? currency(row.unitPrice).divide(1.023).value
        : currency(row.unitPrice).multiply(1.023).value,
    })));
  }

  private patch(index: number, change: Partial<DraftRow>): void {
    this.items.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }
}
