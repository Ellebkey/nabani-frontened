import { Component, OnInit, effect, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { finalize, forkJoin, tap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from 'app/core/theme/theme.service';
import { DateRange } from '@shared/components/date-range-filter/date-range-filter.component';
import { PageEvent } from '@shared/components/pager/pager.component';
import { MgSelectOption } from '@shared/components/compact-select/compact-select.component';

import { AccountsService } from './accounts.service';
import { CommonService } from '@shared/services/common.service';
import { ChartService } from '@shared/services/chart.service';
import { PaginationService } from '@shared/services/pagination.service';
import { IAccount, MonthlyTrendDto } from '@shared/interfaces/account.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';

import { AccountSectionModalComponent } from './account-section-modal/account-section-modal.component';
import { AccountTransferModalComponent } from './account-transfer-modal/account-transfer-modal.component';
import { FamilyInviteBannerComponent } from '../family/components/family-invite-banner/family-invite-banner.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { RowSkeletonComponent } from '../shared/components/skeleton/row-skeleton.component';
import { SkeletonComponent } from '../shared/components/skeleton/skeleton.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { TileComponent } from '../shared/components/tile/tile.component';
import { MatIcon } from '@angular/material/icon';
import { ChartComponent } from 'ng-apexcharts';
import { CompactSelectComponent } from '../shared/components/compact-select/compact-select.component';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatDateRangeInput, MatStartDate, MatEndDate, MatDatepickerToggle, MatDateRangePicker } from '@angular/material/datepicker';
import { MatIconButton } from '@angular/material/button';
import { PagerComponent } from '../shared/components/pager/pager.component';
import { TransactionRowComponent } from '../shared/components/transaction-row/transaction-row.component';
import { DotComponent } from '../shared/components/dot/dot.component';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-accounts',
    templateUrl: './accounts.component.html',
    providers: [AccountsService, CommonService, ChartService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FamilyInviteBannerComponent, EmptyStateComponent, RowSkeletonComponent, SkeletonComponent, MatMenuTrigger, TileComponent, MatIcon, MatMenu, MatMenuItem, ChartComponent, CompactSelectComponent, FormsModule, MatFormField, ReactiveFormsModule, MatDateRangeInput, MatStartDate, MatEndDate, MatIconButton, MatSuffix, MatDatepickerToggle, MatDateRangePicker, PagerComponent, TransactionRowComponent, DotComponent, CurrencyPipe, DatePipe]
})

export class AccountsComponent implements OnInit {
  private accountService = inject(AccountsService);
  private chartService = inject(ChartService);
  private commonService = inject(CommonService);
  private paginationService = inject(PaginationService);
  private themeService = inject(ThemeService);
  dialog = inject(MatDialog);

  constructor() {
    // Rebuild the chart on theme change: the grid uses --maguey-line, which
    // can only be resolved by reading the DOM once the dark class is applied
    effect(() => {
      this.themeService.scheme();
      setTimeout(() => {
        if (this.lastTrend) {
          this.monthlyTrendChart.set(this.buildMonthlyTrendChart(this.lastTrend));
        }
        if (this.lastGraphics) {
          this.accountChart.set(this.chartService.mapPieChartGraphicData(this.lastGraphics));
        }
      });
    });
  }

  private lastTrend: MonthlyTrendDto | null = null;
  private lastGraphics: unknown = null;

  readonly accounts = signal<IAccount[]>([]);
  readonly selectedAccount = signal<IAccount | null>(null);
  readonly selectedAccountId = signal<string>('');
  readonly ledgerEntries = signal<any[]>([]);
  readonly accountChart = signal<any>(null);
  readonly monthlyTrendChart = signal<any>(null);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination());
  startDate = '';
  endDate = '';
  readonly isDataLoaded = signal(false);

  readonly totalBalance = computed<number>(() =>
    this.accounts().reduce((sum, account) => sum + Number(account.currentAmount || 0), 0));

  readonly accountOptions = computed<MgSelectOption[]>(() =>
    this.accounts().map(account => ({
      value: account.id,
      label: account.name,
      color: account.colorPalette,
    })));

  readonly selectedAccountName = computed<string>(() =>
    this.accounts().find(account => account.id === this.selectedAccountId())?.name ?? '');

  readonly selectedAccountColor = computed<string>(() =>
    this.accounts().find(account => account.id === this.selectedAccountId())?.colorPalette ?? '#5F7386');

  ledgerRangeForm = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly ledgerRangeEvents = toSignal(this.ledgerRangeForm.events);
  readonly ledgerRangeValue = computed(() => { this.ledgerRangeEvents(); return this.ledgerRangeForm.getRawValue(); });

  ngOnInit(): void {
    this.loadData();
  }


  loadData(): void {
    this.isDataLoaded.set(false);
    forkJoin([
      this.accountService.getAccountsWithGraphics(),
      this.accountService.getMonthlyTrend(6),
    ]).pipe(
      tap(([accounts, trend]) => {
        this.accounts.set(accounts.rows);
        this.lastGraphics = accounts.graphics;
        this.accountChart.set(this.chartService.mapPieChartGraphicData(accounts.graphics));
        this.lastTrend = trend;
        this.monthlyTrendChart.set(this.buildMonthlyTrendChart(trend));

        const rows = this.accounts();
        if (rows.length > 0) {
          if (!this.selectedAccountId() || !rows.find(a => a.id === this.selectedAccountId())) {
            this.selectedAccountId.set(rows[0].id);
          }
          this.loadAccountLedger();
        }
      }),
      finalize(() => {
        this.isDataLoaded.set(true);
      }),
    ).subscribe({
      error: (err) => {
        console.error('Failed to load account data:', err);
      }
    });
  }

  private themeLineColor(): string {
    // ApexCharts' color parser only understands hex / comma rgb
    const triplet = getComputedStyle(document.body).getPropertyValue('--maguey-line').trim();
    const parts = triplet.split(/\s+/).map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return '#E7EAE8';
    }
    return '#' + parts.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  private buildMonthlyTrendChart(trend: MonthlyTrendDto) {
    return {
      series: [
        { name: 'Ingresos', data: trend.incomes },
        { name: 'Gastos', data: trend.expenses },
      ],
      chart: {
        type: 'bar',
        width: '100%',
        height: '100%',
        fontFamily: 'inherit',
        foreColor: 'inherit',
        toolbar: { show: false },
      },
      colors: ['#4E8A6A', '#A64F4F'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
          borderRadius: 6,
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: trend.months,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#7C8680', fontSize: '11.5px' },
        },
      },
      yaxis: {
        labels: {
          style: { colors: '#7C8680' },
          formatter: (val: number): string =>
            '$ ' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        },
      },
      grid: {
        borderColor: this.themeLineColor(),
        strokeDashArray: 4,
        padding: { top: 0, bottom: -10, left: -5, right: -5 },
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number): string =>
            '$ ' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        },
      },
      legend: { show: false },
    };
  }

  onDateRangeChange(range: DateRange | null): void {
    this.startDate = range?.startDate ?? '';
    this.endDate = range?.endDate ?? '';
    this.pagination.set(this.paginationService.getDefaultPagination());
    this.loadAccountLedger();
  }

  onLedgerRangeChange(): void {
    const { start, end } = this.ledgerRangeForm.value;
    if (start && end) {
      this.onDateRangeChange({ startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') });
    }
  }

  clearLedgerRange(): void {
    this.ledgerRangeForm.reset();
    this.onDateRangeChange(null);
  }

  loadAccountLedger(): void {
    const accountId = this.selectedAccountId();
    if (!accountId) return;

    this.accountService.getAccountLedger(accountId, {
      limit: this.pagination().limit,
      offset: this.pagination().offset,
      startDate: this.startDate,
      endDate: this.endDate
    })
      .subscribe({
        next: (ledgerData) => {
          this.ledgerEntries.set(ledgerData.rows);
          this.pagination.update(p => ({ ...p, count: ledgerData.count }));
        },
        error: (err) => {
          console.error('Failed to load ledger data:', err);
        }
      });
  }

  onAccountSelectionChange(accountId: string): void {
    this.selectedAccountId.set(accountId);
    this.pagination.set(this.paginationService.getDefaultPagination());
    this.loadAccountLedger();
  }


  openSectionWithAccount(accountId: string): void {
    const dialogRef = this.dialog.open(AccountSectionModalComponent, {
      width: '600px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      data: {
        accounts: this.accounts(),
        preSelectedAccountId: accountId,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  openTransferWithAccount(accountId: string): void {
    const dialogRef = this.dialog.open(AccountTransferModalComponent, {
      width: '480px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      data: {
        accounts: this.accounts(),
        preSelectedAccountId: accountId,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadAccountLedger();
  }

  accountIcon(account: IAccount): string {
    const name = (account.name || '').toLowerCase();
    if (name.includes('efectivo')) {
      return 'heroicons_outline:banknotes';
    }
    if (name.includes('vale')) {
      return 'heroicons_outline:credit-card';
    }
    return 'heroicons_outline:building-library';
  }

  ledgerTitle(entry: {
    description: string;
    linkedEntityType?: string;
    originAccount?: { name: string };
    destinationAccount?: { name: string };
  }): string {
    if (entry.linkedEntityType === 'Transfer' && entry.originAccount && entry.destinationAccount) {
      return `Transferencia: ${entry.originAccount.name} → ${entry.destinationAccount.name}`;
    }
    if (entry.linkedEntityType === 'AccountSection' && entry.originAccount && entry.destinationAccount) {
      return `Apartado: ${entry.originAccount.name} → ${entry.destinationAccount.name}`;
    }
    return entry.description;
  }

  ledgerAmount(entry: { debitAmount: number; creditAmount: number }): string {
    const format = (value: number): string =>
      '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return entry.debitAmount > 0 ? `−${format(entry.debitAmount)}` : `+${format(entry.creditAmount)}`;
  }
}
