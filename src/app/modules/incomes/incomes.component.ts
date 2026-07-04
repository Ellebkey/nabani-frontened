import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { DateRange } from '@shared/components/date-range-filter/date-range-filter.component';

import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { IncomesService } from './incomes.service';
import { IIncome, IIncomeStats } from '@shared/interfaces/income.model';
import { IAccount } from '@shared/interfaces/account.model';
import { AccountsService } from '@app/modules/accounts/accounts.service';

import { CreateIncomeComponent } from '@app/modules/incomes/create-income/create-income.component';
import { PageEvent } from '@shared/components/pager/pager.component';
import { MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { DateRangeFilterComponent } from '../shared/components/date-range-filter/date-range-filter.component';
import { CompactSelectComponent } from '../shared/components/compact-select/compact-select.component';
import { FormsModule } from '@angular/forms';
import { PagerComponent } from '../shared/components/pager/pager.component';
import { RowSkeletonComponent } from '../shared/components/skeleton/row-skeleton.component';
import { TransactionRowComponent } from '../shared/components/transaction-row/transaction-row.component';
import { DotComponent } from '../shared/components/dot/dot.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-incomes',
    templateUrl: './incomes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButton, MatIcon, EmptyStateComponent, DateRangeFilterComponent, CompactSelectComponent, FormsModule, PagerComponent, RowSkeletonComponent, TransactionRowComponent, DotComponent, MatMenuTrigger, MatMenu, MatMenuItem, DecimalPipe, CurrencyPipe, DatePipe]
})
export class IncomesComponent implements OnInit {
  private incomesService = inject(IncomesService);
  private accountsService = inject(AccountsService);
  private paginationService = inject(PaginationService);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  dialog = inject(MatDialog);
  private toast = inject(HotToastService);


  incomes = signal<IIncome[]>([]);
  menuIncome = signal<IIncome | null>(null);
  isDataLoaded = signal(false);
  pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination());
  accounts = signal<IAccount[]>([]);
  selectedAccountId = signal<string | null>(null);
  startDate = signal('');
  endDate = signal('');

  stats = signal<IIncomeStats | null>(null);

  accountOptions = computed<MgSelectOption[]>(() => [
    { value: null as any, label: 'Todas las cuentas' },
    ...this.accounts().map(account => ({
      value: account.id,
      label: account.name,
      color: account.colorPalette,
    })),
  ]);

  ngOnInit() {
    this.loadAccounts();
    this.loadStats();
    this.loadData();
  }

  loadStats(): void {
    this.incomesService.getIncomeStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  loadAccounts(): void {
    this.accountsService.getAccounts().subscribe({
      next: (response) => {
        this.accounts.set(response.rows);
      }
    });
  }

  loadData() {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const accountId = this.selectedAccountId();

    this.incomesService.getIncomes({
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
      ...(startDate && endDate && { startDate, endDate }),
      ...(accountId && { accountId }),
    }).subscribe({
      next: (incomes) => {
        this.incomes.set(incomes.rows);
        this.pagination.update(p => ({ ...p, count: incomes.count }));
        this.isDataLoaded.set(true);
      }
    });
  }

  onAccountSelectionChange(accountId: string | null): void {
    this.selectedAccountId.set(accountId);
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  onDateRangeChange(range: DateRange | null): void {
    this.startDate.set(range?.startDate ?? '');
    this.endDate.set(range?.endDate ?? '');
    this.pagination.update(p => ({ ...p, offset: 0 }));
    this.loadData();
  }

  openCreateIncome(): void {
    const dialogRef = this.dialog.open(CreateIncomeComponent, {
      width: '460px',
      maxWidth: '100vw',
      disableClose: true,
    });

    dialogRef.afterClosed()
      .subscribe(result => {
        if (result) {
          this.loadData();
        }
      });
  }

   createIncomeFromTemplate(incomeId: number): void {
    if (!incomeId) {
      return
    }

    this.incomesService.getIncomeDetails(incomeId).subscribe({
      next: (response) => {
        const dialogRef = this.dialog.open(CreateIncomeComponent, {
          width: '460px',
          maxWidth: '100vw',
          disableClose: true,
          data: response
        });

        dialogRef.afterClosed()
          .subscribe(result => {
            if (result) {
              this.loadData();
            }
          });
      }
    });
  }

  // Accepts a nullable id: rows sourced from drafts/templates may not carry one yet
  editIncome(income: Omit<IIncome, 'id'> & { id: number | null }): void {
    if (!income.id) {
      return;
    }

    this.incomesService.getIncomeDetails(income.id).subscribe({
      next: (response) => {
        const dialogRef = this.dialog.open(CreateIncomeComponent, {
          width: '460px',
          maxWidth: '100vw',
          disableClose: true,
          data: { ...(response as any), isEditMode: true }
        });

        dialogRef.afterClosed()
          .subscribe(result => {
            if (result) {
              this.loadData();
            }
          });
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  async deleteIncome(income: IIncome) {
    const dialogData = this.common.getDefaultDeleteConfirmation({
      objectName: 'income'
    });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);

    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.incomesService.deleteIncome(income.id)
          .subscribe({
            next: () => {
              this.loadData();
              this.toast.info('El registro fue eliminado correctamente.');
            },
            error: (err) => {
              console.error(err);
            }
          })
      }
    });
  }

}
