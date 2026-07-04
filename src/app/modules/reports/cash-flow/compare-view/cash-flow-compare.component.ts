import { Component, Input, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { forkJoin } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { HotToastService } from '@ngxpert/hot-toast';

import { CashFlowService } from '../services/cash-flow.service';
import { CategoryComparison, CompareSelection } from '../../interfaces/cash-flow.model';
import { CompareSelectComponent } from '../compare-select/compare-select.component';
import { ICategory } from '@shared/interfaces/common.model';
import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

/**
 * Cash-flow compare mode (flujo-caja-comparar.html): side A vs side B,
 * each with its own categories/subcategories and period.
 */
@Component({
    selector: 'app-cash-flow-compare',
    templateUrl: './cash-flow-compare.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatProgressSpinnerModule,
        MatButtonModule,
        CompareSelectComponent,
        PillComponent,
        EmptyStateComponent,
    ]
})
export class CashFlowCompareComponent {
  @Input() categories: ICategory[] = [];

  private readonly cashFlowService = inject(CashFlowService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly SIDE_A_COLOR = '#2A4C3C';
  readonly SIDE_B_COLOR = '#C9A45C';

  readonly resultA = signal<CategoryComparison | null>(null);
  readonly resultB = signal<CategoryComparison | null>(null);
  readonly isComparing = signal(false);
  readonly expandedA = signal(false);
  readonly expandedB = signal(false);

  selectionA: CompareSelection = { categoryIds: [], subcategoryIds: [] };
  selectionB: CompareSelection = { categoryIds: [], subcategoryIds: [] };

  rangeA = new FormGroup({
    start: new FormControl<Date | null>(startOfMonth(new Date())),
    end: new FormControl<Date | null>(endOfMonth(new Date())),
  });
  rangeB = new FormGroup({
    start: new FormControl<Date | null>(startOfMonth(new Date())),
    end: new FormControl<Date | null>(endOfMonth(new Date())),
  });

  get canCompare(): boolean {
    const hasSelection = (selection: CompareSelection): boolean =>
      selection.categoryIds.length > 0 || selection.subcategoryIds.length > 0;
    return hasSelection(this.selectionA)
      && hasSelection(this.selectionB)
      && !!this.rangeA.value.start && !!this.rangeA.value.end
      && !!this.rangeB.value.start && !!this.rangeB.value.end;
  }

  runCompare(): void {
    if (!this.canCompare || this.isComparing()) {
      return;
    }
    this.isComparing.set(true);
    this.expandedA.set(false);
    this.expandedB.set(false);

    forkJoin([
      this.cashFlowService.getCategoryComparison(this.compareQuery(this.selectionA, this.rangeA)),
      this.cashFlowService.getCategoryComparison(this.compareQuery(this.selectionB, this.rangeB)),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([a, b]) => {
          this.resultA.set(a);
          this.resultB.set(b);
          this.isComparing.set(false);
        },
        error: (err) => {
          console.error('Error comparing:', err);
          this.toast.error('Error al comparar');
          this.isComparing.set(false);
        },
      });
  }

  private compareQuery(selection: CompareSelection, range: FormGroup): { startDate: string; endDate: string; categoryIds?: string; subcategoryIds?: string } {
    return {
      startDate: format(range.value.start, 'yyyy-MM-dd'),
      endDate: format(range.value.end, 'yyyy-MM-dd'),
      categoryIds: selection.categoryIds.join(',') || undefined,
      subcategoryIds: selection.subcategoryIds.join(',') || undefined,
    };
  }

  sideLabel(selection: CompareSelection): string {
    const names: string[] = [];
    selection.categoryIds.forEach(id => {
      const category = this.categories.find(item => item.id === id);
      if (category) names.push(category.name);
    });
    selection.subcategoryIds.forEach(id => {
      const parent = this.categories.find(category =>
        (category.subcategories ?? []).some(sub => sub.id === id));
      const sub = parent?.subcategories?.find(item => item.id === id);
      if (sub) names.push(sub.name);
    });
    return names.join(' + ') || 'Sin selección';
  }

  periodLabel(range: FormGroup): string {
    const { start, end } = range.value;
    if (!start || !end) {
      return '';
    }
    if (isSameDay(start, startOfMonth(start)) && isSameDay(end, endOfMonth(start))) {
      const label = format(start, 'MMMM yyyy', { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`;
  }

  shortPeriodLabel(range: FormGroup): string {
    const { start } = range.value;
    if (!start) {
      return '';
    }
    return this.periodLabel(range).split(' ')[0].toLowerCase();
  }

  get diff(): number {
    return (this.resultB()?.total ?? 0) - (this.resultA()?.total ?? 0);
  }

  get diffPercent(): number | null {
    const totalA = this.resultA()?.total ?? 0;
    if (!totalA) {
      return null;
    }
    return (this.diff / totalA) * 100;
  }

  /** Union of both sides' subcategories, sorted by their larger amount. */
  get pairedSubcategories(): { name: string; a: number; b: number }[] {
    const rows = new Map<string, { name: string; a: number; b: number }>();
    (this.resultA()?.bySubcategory ?? []).forEach(item => {
      const key = `${item.categoryId}-${item.subcategoryId ?? 'none'}`;
      rows.set(key, { name: item.subcategoryName, a: item.total, b: 0 });
    });
    (this.resultB()?.bySubcategory ?? []).forEach(item => {
      const key = `${item.categoryId}-${item.subcategoryId ?? 'none'}`;
      const row = rows.get(key);
      if (row) {
        row.b = item.total;
      } else {
        rows.set(key, { name: item.subcategoryName, a: 0, b: item.total });
      }
    });
    return [...rows.values()].sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  }

  get pairedMax(): number {
    return this.pairedSubcategories.reduce((max, row) => Math.max(max, row.a, row.b), 0) || 1;
  }

  formatCurrency(value: number): string {
    return '$ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
