import { Component, inject, signal, computed, effect, untracked, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { HotToastService } from '@ngxpert/hot-toast';
import { forkJoin } from 'rxjs';
import { addMonths, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

import { CategoriesApiService } from '@app/modules/admin/categories-management/services/api/categories-api.service';
import { ICategory } from '@shared/interfaces/common.model';
import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import { NoPartnershipComponent } from '../components/no-partnership/no-partnership.component';
import { BudgetFormModalComponent, BudgetFormModalData } from '../modals/budget-form-modal/budget-form-modal.component';
import { IBudgetStatus, IBudgetStatusRow, IFamilyBudget, IFamilyCategoryRef } from '../models/family.model';
import { MatMenuModule } from '@angular/material/menu';
import { DecimalPipe } from '@angular/common';
import { TileComponent } from '@shared/components/tile/tile.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { RowSkeletonComponent } from '@shared/components/skeleton/row-skeleton.component';

@Component({
    selector: 'app-family-budgets',
    templateUrl: './family-budgets.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CurrencyPipe,
        DecimalPipe,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatMenuModule,
        NoPartnershipComponent,
        TileComponent,
        EmptyStateComponent,
        RowSkeletonComponent
    ]
})
export class FamilyBudgetsComponent {
  private readonly api = inject(FamilyApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(HotToastService);
  private readonly magueyConfirmation = inject(MagueyConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly familyState = inject(FamilyStateService);

  protected readonly month = signal(new Date());
  protected readonly loading = signal(false);
  protected readonly budgets = signal<IFamilyBudget[]>([]);
  protected readonly status = signal<IBudgetStatus>({ rows: [], totalBudgeted: 0, totalSpent: 0 });
  protected readonly allCategories = signal<ICategory[]>([]);

  protected readonly isPremium = this.familyState.isPremium();

  protected readonly monthLabel = computed(() => {
    const label = format(this.month(), 'MMMM yyyy', { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  protected readonly periodMonth = computed(() => format(this.month(), 'yyyy-MM'));

  protected readonly totalRemaining = computed(() =>
    this.status().totalBudgeted - this.status().totalSpent
  );

  // Budgetable = every category of the hogar: all categories minus the
  // excluded (personal) ones, minus those already budgeted this month.
  protected readonly availableCategories = computed<IFamilyCategoryRef[]>(() => {
    const budgetedIds = new Set(this.budgets().map(budget => budget.categoryId));
    const excludedIds = new Set(this.familyState.excludedCategories().map(category => category.categoryId));
    return this.allCategories()
      .filter(category => !budgetedIds.has(category.id) && !excludedIds.has(category.id))
      .map(category => ({
        categoryId: category.id,
        name: category.name,
        colorPalette: category.colorPalette ?? undefined
      }));
  });

  private readonly reloadOnChanges = effect(() => {
    const periodMonth = this.periodMonth();
    if (this.familyState.loaded() && this.familyState.hasPartnership()) {
      this.fetchData(periodMonth);
      // untracked: the catalog arriving must not re-trigger this effect
      if (untracked(this.allCategories).length === 0) {
        this.loadCategories();
      }
    }
  }, { allowSignalWrites: true });

  constructor() {
    this.familyState.ensureLoaded();
  }

  protected previousMonth(): void {
    this.month.update(current => subMonths(current, 1));
  }

  protected nextMonth(): void {
    this.month.update(current => addMonths(current, 1));
  }

  protected menuRow!: IBudgetStatusRow;

  protected spentPercent(row: IBudgetStatusRow): number {
    if (row.budgeted <= 0) {
      return 0;
    }
    return Math.min((row.spent / row.budgeted) * 100, 100);
  }

  protected rawPercent(row: IBudgetStatusRow): number {
    if (row.budgeted <= 0) {
      return 0;
    }
    return (row.spent / row.budgeted) * 100;
  }

  protected budgetFillColor(row: IBudgetStatusRow): string {
    if (row.remaining < 0) {
      return '#E11D48';
    }
    if (this.rawPercent(row) >= 80) {
      return '#F59E0B';
    }
    return row.colorPalette || '#33604A';
  }

  protected budgetIdForCategory(categoryId: number): string | null {
    return this.budgets().find(budget => budget.categoryId === categoryId)?.id ?? null;
  }

  protected openCreateModal(): void {
    const dialogRef = this.dialog.open(BudgetFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: {
        budget: null,
        availableCategories: this.availableCategories(),
        monthLabel: this.monthLabel()
      } satisfies BudgetFormModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createBudget(result.categoryId, result.amount);
      }
    });
  }

  protected openEditModal(row: IBudgetStatusRow): void {
    const budget = this.budgets().find(item => item.categoryId === row.categoryId);
    if (!budget) {
      return;
    }

    const dialogRef = this.dialog.open(BudgetFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: {
        budget: { ...budget, categoryName: row.categoryName },
        availableCategories: [],
        monthLabel: this.monthLabel()
      } satisfies BudgetFormModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateBudget(budget.id, result.amount);
      }
    });
  }

  protected confirmDelete(row: IBudgetStatusRow): void {
    const budgetId = this.budgetIdForCategory(row.categoryId);
    if (!budgetId) {
      return;
    }

    const confirmDialog = this.magueyConfirmation.open({
      title: 'Eliminar presupuesto',
      message: `¿Eliminar el presupuesto de <b>${row.categoryName}</b> para ${this.monthLabel()}?`,
      actions: {
        confirm: { show: true, label: 'Eliminar', color: 'warn' },
        cancel: { show: true, label: 'Cancelar' }
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result === 'confirmed') {
        this.deleteBudget(budgetId);
      }
    });
  }

  private loadCategories(): void {
    this.categoriesApi.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.allCategories.set(categories),
        error: () => this.toast.error('Error al cargar las categorías')
      });
  }

  private fetchData(periodMonth: string): void {
    this.loading.set(true);

    forkJoin({
      budgets: this.api.getBudgets(periodMonth),
      status: this.api.getBudgetStatus(periodMonth)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ budgets, status }) => {
          this.budgets.set(budgets);
          this.status.set(status);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Error al cargar los presupuestos');
          this.loading.set(false);
        }
      });
  }

  private createBudget(categoryId: number, amount: number): void {
    this.loading.set(true);

    this.api.createBudget({ categoryId, amount, periodMonth: this.periodMonth() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Presupuesto creado exitosamente');
          this.fetchData(this.periodMonth());
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            403: 'Necesitas una cuenta Premium para crear presupuestos',
            409: 'Ya existe un presupuesto para esa categoría este mes',
            422: 'Solo puedes presupuestar categorías del hogar'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al crear el presupuesto');
          this.loading.set(false);
        }
      });
  }

  private updateBudget(id: string, amount: number): void {
    this.loading.set(true);

    this.api.updateBudget(id, amount)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Presupuesto actualizado exitosamente');
          this.fetchData(this.periodMonth());
        },
        error: () => {
          this.toast.error('Error al actualizar el presupuesto');
          this.loading.set(false);
        }
      });
  }

  private deleteBudget(id: string): void {
    this.loading.set(true);

    this.api.deleteBudget(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Presupuesto eliminado');
          this.fetchData(this.periodMonth());
        },
        error: () => {
          this.toast.error('Error al eliminar el presupuesto');
          this.loading.set(false);
        }
      });
  }
}
