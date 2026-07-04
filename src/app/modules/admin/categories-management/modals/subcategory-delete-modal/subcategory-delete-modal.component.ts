import { Component, signal, computed, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ICategory, ISubcategory } from '@shared/interfaces/common.model';
import {
  CategoriesApiService,
  SubcategoryExpenseItem,
  ReassignSubcategoryDto,
} from '../../services/api/categories-api.service';

export interface SubcategoryDeleteData {
  subcategory: ISubcategory;
  category: ICategory;
  categories: ICategory[];
}

@Component({
    selector: 'app-subcategory-delete-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    ModalShellComponent
],
    templateUrl: './subcategory-delete-modal.component.html'
})
export class SubcategoryDeleteModalComponent {
  private dialogRef = inject<MatDialogRef<SubcategoryDeleteModalComponent>>(MatDialogRef);
  data = inject<SubcategoryDeleteData>(MAT_DIALOG_DATA);

  private readonly api = inject(CategoriesApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly expenseItems = signal<SubcategoryExpenseItem[]>([]);
  readonly selectedKeys = signal<Set<string>>(new Set());

  readonly targetCategoryId = signal<number | null>(null);
  readonly targetSubcategoryId = signal<number | null>(null);

  readonly modalTitle = computed(() => `Eliminar "${this.data.subcategory.name}"`);

  readonly availableCategories = computed(() =>
    this.data.categories.filter(c => c.subcategories?.length > 0)
  );

  readonly targetSubcategories = computed(() => {
    const catId = this.targetCategoryId();
    if (!catId) return [];
    const cat = this.data.categories.find(c => c.id === catId);
    return (cat?.subcategories || []).filter(s => s.id !== this.data.subcategory.id);
  });

  readonly allSelected = computed(() => {
    const items = this.expenseItems();
    return items.length > 0 && this.selectedKeys().size === items.length;
  });

  readonly someSelected = computed(() => {
    const size = this.selectedKeys().size;
    return size > 0 && size < this.expenseItems().length;
  });

  readonly canReassign = computed(() =>
    this.selectedKeys().size > 0 &&
    this.targetCategoryId() !== null &&
    this.targetSubcategoryId() !== null
  );

  readonly canDelete = computed(() =>
    !this.isLoading() && this.expenseItems().length === 0
  );

  constructor() {
    this.loadExpenseItems();
  }

  itemKey(item: SubcategoryExpenseItem): string {
    return `${item.expenseId}:${item.articleId}`;
  }

  isSelected(item: SubcategoryExpenseItem): boolean {
    return this.selectedKeys().has(this.itemKey(item));
  }

  toggleItem(item: SubcategoryExpenseItem): void {
    const key = this.itemKey(item);
    this.selectedKeys.update(set => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedKeys.set(new Set());
    } else {
      this.selectedKeys.set(new Set(this.expenseItems().map(i => this.itemKey(i))));
    }
  }

  onCategoryChange(categoryId: number): void {
    this.targetCategoryId.set(categoryId);
    this.targetSubcategoryId.set(null);
  }

  reassign(): void {
    if (!this.canReassign()) return;

    this.isSaving.set(true);
    const selected = this.expenseItems().filter(i => this.selectedKeys().has(this.itemKey(i)));
    const dto: ReassignSubcategoryDto = {
      targetCategoryId: this.targetCategoryId()!,
      targetSubcategoryId: this.targetSubcategoryId()!,
      items: selected.map(i => ({ expenseId: i.expenseId, articleId: i.articleId })),
    };

    this.api.reassignSubcategoryItems(this.data.subcategory.id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.toast.success(`${res.reassigned} artículos reasignados`);
          this.isSaving.set(false);
          this.selectedKeys.set(new Set());
          this.loadExpenseItems();
        },
        error: (err) => {
          const msg = err.error?.error?.message || err.error?.message || 'Error al reasignar';
          this.toast.error(msg);
          this.isSaving.set(false);
        },
      });
  }

  deleteSubcategory(): void {
    if (!this.canDelete()) return;

    this.isSaving.set(true);
    this.api.deleteSubcategory(this.data.subcategory.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Subcategoría eliminada');
          this.isSaving.set(false);
          this.dialogRef.close('deleted');
        },
        error: (err) => {
          const msg = err.error?.error?.message || err.error?.message || 'Error al eliminar';
          this.toast.error(msg);
          this.isSaving.set(false);
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private loadExpenseItems(): void {
    this.isLoading.set(true);
    this.api.getSubcategoryExpenseItems(this.data.subcategory.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.expenseItems.set(items);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error('Error al cargar los artículos de gasto');
          this.isLoading.set(false);
        },
      });
  }
}
