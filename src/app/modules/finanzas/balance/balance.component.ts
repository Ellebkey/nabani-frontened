import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

import { DateRange, DateRangeFilterComponent } from '@shared/components/date-range-filter/date-range-filter.component';

import { FinanzasService } from '../finanzas.service';
import { FinanzasNavComponent } from '../components/finanzas-nav.component';
import { IBalance, IPackageIncome, earthBarColor } from '../finanzas.models';

interface PackageBar extends IPackageIncome {
  color: string;
  widthPercent: number;
}

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe, DecimalPipe, DateRangeFilterComponent, FinanzasNavComponent,
  ],
})
export class BalanceComponent implements OnInit {
  private finanzasService = inject(FinanzasService);

  readonly balance = signal<IBalance | null>(null);
  readonly isDataLoaded = signal(false);
  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly incomesByPackage = computed(() => this.balance()?.incomesByPackage ?? []);

  readonly packageBars = computed<PackageBar[]>(() => {
    const packages = this.incomesByPackage();
    const max = packages.reduce((m, p) => Math.max(m, p.total ?? 0), 0);
    return packages.map((pkg, index) => ({
      ...pkg,
      color: earthBarColor(index),
      widthPercent: max > 0 ? Math.max(2, ((pkg.total ?? 0) / max) * 100) : 0,
    }));
  });

  readonly periodTotal = computed(() =>
    this.incomesByPackage().reduce((sum, p) => sum + (p.total ?? 0), 0),
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const startDate = this.startDate();
    const endDate = this.endDate();
    this.finanzasService.getBalance({
      ...(startDate && endDate && { startDate, endDate }),
    }).subscribe({
      next: (response) => {
        this.balance.set(response);
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
