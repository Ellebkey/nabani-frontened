import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';

import { DateRange, DateRangeFilterComponent } from '@shared/components/date-range-filter/date-range-filter.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

import { FinanzasService } from '../finanzas.service';
import { FinanzasNavComponent } from '../components/finanzas-nav.component';
import { IDailyIncomes } from '../finanzas.models';

@Component({
  selector: 'app-ingresos',
  templateUrl: './ingresos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe, CurrencyPipe, DatePipe, DateRangeFilterComponent, EmptyStateComponent,
    FinanzasNavComponent,
  ],
})
export class IngresosComponent implements OnInit {
  private finanzasService = inject(FinanzasService);

  readonly dailyIncomes = signal<IDailyIncomes | null>(null);
  readonly isDataLoaded = signal(false);
  readonly startDate = signal('');
  readonly endDate = signal('');
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  readonly days = computed(() => this.dailyIncomes()?.days ?? []);
  readonly grandTotal = computed(() => this.dailyIncomes()?.grandTotal ?? 0);
  readonly individualCount = computed(() =>
    this.days().reduce((sum, day) => sum + (day.items?.length ?? 0), 0),
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const startDate = this.startDate();
    const endDate = this.endDate();
    this.finanzasService.getDailyIncomes({
      ...(startDate && endDate && { startDate, endDate }),
    }).subscribe({
      next: (response) => {
        this.dailyIncomes.set(response);
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  onDateRangeChange(range: DateRange | null): void {
    this.startDate.set(range?.startDate ?? '');
    this.endDate.set(range?.endDate ?? '');
    this.loadData();
  }
}
