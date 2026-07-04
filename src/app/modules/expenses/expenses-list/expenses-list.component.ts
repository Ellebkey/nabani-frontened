import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, WritableSignal, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, takeUntil, tap } from 'rxjs';

import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { MerchantsService } from '@app/modules/inventory/merchants.service';
import { PaginationService } from '@shared/services/pagination.service';
import { IExpenseDateGroup, PaymentMethod } from '@shared/interfaces/expense.model';
import { IMerchant } from '@shared/interfaces/merchant.model';
import { ChartData } from '@shared/interfaces/shared.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { format, subDays } from 'date-fns';
import { DateRange } from '@shared/components/date-range-filter/date-range-filter.component';
import { PageEvent } from '@shared/components/pager/pager.component';

import { ExpensesCreateModalComponent } from '@app/modules/expenses/expenses-create-modal/expenses-create-modal.component';
import { ReceiptScanModalComponent } from '@app/modules/expenses/receipt-scan/receipt-scan-modal.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NgSelectComponent, NgLabelTemplateDirective, NgOptionTemplateDirective } from '@ng-select/ng-select';
import { DotComponent } from '../../shared/components/dot/dot.component';
import { DateRangeFilterComponent } from '../../shared/components/date-range-filter/date-range-filter.component';
import { ExpensesCategoryChartComponent } from './expenses-category-chart/expenses-category-chart.component';
import { PagerComponent } from '../../shared/components/pager/pager.component';
import { RowSkeletonComponent } from '../../shared/components/skeleton/row-skeleton.component';
import { DateRowComponent } from '../../shared/components/transaction-row/date-row.component';
import { ExpensesItemDetailComponent } from './expenses-item-detail/expenses-item-detail.component';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-expenses-list',
    templateUrl: './expenses-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButton, MatIcon, EmptyStateComponent, FormsModule, ReactiveFormsModule, NgSelectComponent, NgLabelTemplateDirective, DotComponent, NgOptionTemplateDirective, DateRangeFilterComponent, ExpensesCategoryChartComponent, PagerComponent, RowSkeletonComponent, DateRowComponent, ExpensesItemDetailComponent, DecimalPipe, CurrencyPipe, DatePipe]
})
export class ExpensesListComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpensesService);
  private merchantService = inject(MerchantsService);
  private paginationService = inject(PaginationService);
  dialog = inject(MatDialog);

  constructor() {
    this.pagination = signal(this.paginationService.getDefaultPagination(true));
  }

  private readonly destroy$ = new Subject<void>();
  readonly expensesForm: FormGroup = this.fb.group({
    merchantId: [],
    paymentMethodId: [],
    paymentMethodIdFilter: [],
  });
  searchControl = new FormControl('');

  readonly isDataLoaded = signal(false);
  readonly expensesByCategory = signal<ChartData | undefined>(undefined);
  readonly chartDateLabel = signal<string | undefined>(undefined);
  readonly expenses = signal<IExpenseDateGroup[] | undefined>(undefined);
  readonly pagination: WritableSignal<PaginationSetting>;
  readonly merchantList = signal<IMerchant[]>([]);
  readonly paymentMethodList = signal<PaymentMethod[]>([]);
  readonly startDate = signal<string | null>(null);
  readonly endDate = signal<string | null>(null);
  readonly paymentId = signal<number | null | undefined>(undefined);
  readonly recipientId = signal<number | null | undefined>(undefined);

  readonly categoryColors = computed<Record<string, string>>(() => {
    const data = this.expensesByCategory()?.series?.[0]?.data ?? [];
    return data.reduce((map, item: any) => {
      if (item.x && item.colorPalette) {
        map[item.x] = item.colorPalette;
      }
      return map;
    }, {} as Record<string, string>);
  });

  readonly hasActiveFilters = computed<boolean>(() =>
    !!this.startDate() || !!this.recipientId() || !!this.paymentId()
  );

  ngOnInit(): void {
    this.initializeForm();
    this.loadFilteredData();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.startDate.set(null);
    this.endDate.set(null);
    this.expensesForm.get('merchantId')?.valueChanges.subscribe(value => {
      this.loadOnMerchantSelected(value);
    });
    this.expensesForm.get('paymentMethodId')?.valueChanges.subscribe(value => {
      this.loadOnPaymentMethodSelected(value);
    });
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        this.pagination.update(p => ({ ...p, searchText: value?.trim() || null, offset: 0 }));
        this.loadData();
      });
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    const startDate = this.startDate();
    const endDate = this.endDate();
    forkJoin([
      this.expenseService.getExpenses({
        limit: pagination.limit,
        offset: pagination.offset,
        searchText: pagination.searchText,
        startDate: startDate,
        endDate: endDate,
        paymentId: this.paymentId(),
        recipientId: this.recipientId(),
        isDraft: false,
      }),
      this.expenseService.getExpensesByCategory({
        startDate: startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: endDate || format(new Date(), 'yyyy-MM-dd'),
      }),
    ]).pipe(
      tap(([expenses, expensesByCategory]) => {
        this.expenses.set(expenses.rows);
        this.pagination.update(p => ({ ...p, count: expenses.count }));
        this.expensesByCategory.set({ ... expensesByCategory });
        // startDate and endDate are always set together (see onDateRangeChange)
        this.chartDateLabel.set(startDate
          ? `${format(new Date(startDate + 'T00:00:00'), 'yyyy-MMM-dd')} — ${format(new Date(endDate! + 'T00:00:00'), 'yyyy-MMM-dd')}`
          : 'Últimos 30 días');
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

  private loadFilteredData(): void {
    forkJoin([
      this.expenseService.getPaymentMethods({
        isActive: true
      }),
      this.merchantService.getMerchantsList({ limit: 1000 }),
    ]).pipe(
      tap(([paymentMethods, merchants]) => {
        this.paymentMethodList.set(paymentMethods);
        this.merchantList.set(merchants.rows);
      }),
    ).subscribe({
      error: (err) => {
        console.error('Failed to load filter data:', err);
      }
    });
  }

  groupTotal(group: IExpenseDateGroup): number {
    return group.expenses.reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0);
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
    document.getElementById('expenses-list-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onDateRangeChange(range: DateRange | null): void {
    this.startDate.set(range?.startDate ?? null);
    this.endDate.set(range?.endDate ?? null);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  loadOnMerchantSelected(value: number | null): void {
    this.recipientId.set(value);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  loadOnPaymentMethodSelected(value: number | null): void {
    this.paymentId.set(value);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  openCreateExpense(): void {
    const dialogRef = this.dialog.open(ExpensesCreateModalComponent, {
      width: '1260px',
      height: '94vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
    });

    dialogRef.afterClosed()
      .subscribe(result => {
        if (result) {
          this.loadData();
        }
      });
  }

  openReceiptScan(): void {
    const dialogRef = this.dialog.open(ReceiptScanModalComponent, {
      width: '440px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
    });

    dialogRef.afterClosed()
      .subscribe(result => {
        if (result?.openEdit && result?.expense) {
          this.openEditExpense(result.expense);
        } else if (result) {
          this.loadData();
        }
      });
  }

  private openEditExpense(expense: any): void {
    this.expenseService.getExpenseById(expense.id)
      .subscribe({
        next: (fullExpense) => {
          const editDialogRef = this.dialog.open(ExpensesCreateModalComponent, {
            data: { ...fullExpense, isDraft: fullExpense.isDraft ?? true },
            width: '1260px',
            height: '94vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            disableClose: true,
          });

          editDialogRef.afterClosed().subscribe(() => {
            // Always refresh the list after edit dialog closes
            // This ensures the list reflects any changes (draft completion, updates, etc.)
            this.loadData();
          });
        },
        error: (error) => {
          console.error('Error loading expense for edit:', error);
        }
      });
  }

  onReload() {
    this.loadData();
  }

}
