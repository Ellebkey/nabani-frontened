import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { PageEvent, PagerComponent } from '@shared/components/pager/pager.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { DateRange, DateRangeFilterComponent } from '@shared/components/date-range-filter/date-range-filter.component';

import { FinanzasService } from '../finanzas.service';
import { FinanzasNavComponent } from '../components/finanzas-nav.component';
import { IExpense, IBeneficiary, expenseTypeMeta } from '../finanzas.models';
import { GastoModalComponent } from './gasto-modal/gasto-modal.component';

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, MatButton, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem,
    DecimalPipe, CurrencyPipe, DatePipe, PagerComponent, CompactSelectComponent, EmptyStateComponent,
    PillComponent, DateRangeFilterComponent, FinanzasNavComponent,
  ],
})
export class GastosComponent implements OnInit, OnDestroy {
  private finanzasService = inject(FinanzasService);
  private paginationService = inject(PaginationService);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  private readonly destroy$ = new Subject<void>();

  readonly expenses = signal<IExpense[]>([]);
  readonly beneficiaries = signal<IBeneficiary[]>([]);
  readonly total = signal(0);
  readonly menuExpense = signal<IExpense | null>(null);
  readonly isDataLoaded = signal(false);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));
  readonly selectedBeneficiaryId = signal<number | null>(null);
  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly searchControl = new FormControl('');
  protected readonly expenseTypeMeta = expenseTypeMeta;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  readonly beneficiaryOptions = computed<MgSelectOption[]>(() => [
    { value: null as unknown as number, label: 'Todos los beneficiarios' },
    ...this.beneficiaries().map(b => ({ value: b.id, label: b.name })),
  ]);

  ngOnInit(): void {
    this.loadBeneficiaries();
    this.loadData();
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        this.pagination.update(p => ({ ...p, searchText: value?.trim() || null, offset: 0 }));
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBeneficiaries(): void {
    this.finanzasService.getBeneficiaries().subscribe({
      next: (response) => this.beneficiaries.set(response.rows ?? []),
      error: (err) => console.error(err),
    });
  }

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    const beneficiaryId = this.selectedBeneficiaryId();
    const startDate = this.startDate();
    const endDate = this.endDate();

    this.finanzasService.getExpenses({
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
      ...(beneficiaryId != null && { beneficiaryId }),
      ...(startDate && endDate && { startDate, endDate }),
    }).subscribe({
      next: (response) => {
        this.expenses.set(response.rows ?? []);
        this.pagination.update(p => ({ ...p, count: response.count ?? 0 }));
        this.total.set(response.total ?? 0);
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  onBeneficiaryChange(beneficiaryId: number | null): void {
    this.selectedBeneficiaryId.set(beneficiaryId);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  onDateRangeChange(range: DateRange | null): void {
    this.startDate.set(range?.startDate ?? '');
    this.endDate.set(range?.endDate ?? '');
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  openCreate(): void {
    const dialogRef = this.dialog.open(GastoModalComponent, {
      width: '480px',
      maxWidth: '100vw',
      disableClose: true,
      data: { beneficiaries: this.beneficiaries() },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBeneficiaries();
        this.loadData();
      }
    });
  }

  edit(expense: IExpense): void {
    const dialogRef = this.dialog.open(GastoModalComponent, {
      width: '480px',
      maxWidth: '100vw',
      disableClose: true,
      data: { expense, beneficiaries: this.beneficiaries(), isEditMode: true },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBeneficiaries();
        this.loadData();
      }
    });
  }

  delete(expense: IExpense): void {
    const dialogData = this.common.getDefaultDeleteConfirmation({ objectName: 'expense' });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);
    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.finanzasService.deleteExpense(expense.id).subscribe({
          next: () => {
            this.loadData();
            this.toast.info('El gasto fue eliminado correctamente.');
          },
          error: (err) => {
            console.error(err);
            return of(err);
          },
        });
      }
    });
  }
}
