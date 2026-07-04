import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, signal } from '@angular/core';
import { CHART_CATEGORY_COLORS } from '@shared/services/chart.service';

interface CategoryItem {
  name: string;
  amount: number;
  barWidth: number;
  sharePercent: number;
  color: string;
}

@Component({
    selector: 'app-expenses-category-chart',
    templateUrl: './expenses-category-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesCategoryChartComponent implements OnInit, OnChanges {
  @Input() expensesByCategory?: { series: { data: { x: string; y: number; extraLabel?: number; colorPalette?: string | null }[] }[] };
  @Input() dateLabel?: string;

  readonly categories = signal<CategoryItem[]>([]);

  ngOnInit(): void {
    this.buildCategories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expensesByCategory'] && !changes['expensesByCategory'].firstChange) {
      this.buildCategories();
    }
  }

  private buildCategories(): void {
    if (!this.expensesByCategory?.series?.[0]?.data) {
      this.categories.set([]);
      return;
    }

    const data = this.expensesByCategory.series[0].data;
    const maxAmount = Math.max(...data.map(d => d.extraLabel ?? d.y));
    const totalAmount = data.reduce((sum, d) => sum + (d.extraLabel ?? d.y), 0);

    this.categories.set(data.map((item, i) => {
      const amount = item.extraLabel ?? item.y;
      return {
        name: item.x,
        amount,
        barWidth: maxAmount > 0 ? (amount / maxAmount) * 100 : 0,
        sharePercent: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        color: item.colorPalette || CHART_CATEGORY_COLORS[i % CHART_CATEGORY_COLORS.length],
      };
    }));
  }

  formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
