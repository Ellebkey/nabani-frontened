import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { PageEvent, PagerComponent } from '@shared/components/pager/pager.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { FinanzasService } from '../finanzas.service';
import { FinanzasNavComponent } from '../components/finanzas-nav.component';
import { IPayment, agingMeta, paymentMethodLabel, paymentPatientName } from '../finanzas.models';
import { RegistrarPagoModalComponent } from './registrar-pago-modal/registrar-pago-modal.component';

type AgingFilter = 'todos' | 'vencidos' | 'semana';

@Component({
  selector: 'app-cobranza',
  templateUrl: './cobranza.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatIcon, DecimalPipe, CurrencyPipe, DatePipe,
    PagerComponent, EmptyStateComponent, PillComponent, ChipComponent, ChipRowComponent,
    FinanzasNavComponent,
  ],
})
export class CobranzaComponent implements OnInit, OnDestroy {
  private finanzasService = inject(FinanzasService);
  private paginationService = inject(PaginationService);
  private common = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  private readonly destroy$ = new Subject<void>();

  readonly payments = signal<IPayment[]>([]);
  readonly isDataLoaded = signal(false);
  readonly pagination = signal<PaginationSetting>(this.paginationService.getDefaultPagination(true));
  readonly agingFilter = signal<AgingFilter>('todos');

  readonly searchControl = new FormControl('');
  protected readonly agingMeta = agingMeta;
  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly paymentPatientName = paymentPatientName;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  // Aging buckets are derived client-side from agingDays: the API exposes only
  // paid/patient/sale filters (design-spec §4.12), so the chip sub-filter and its
  // counts are computed over the loaded pending page.
  readonly vencidosCount = computed(() => this.payments().filter(p => p.agingDays > 0).length);
  readonly semanaCount = computed(() => this.payments().filter(p => Math.abs(p.agingDays) <= 7).length);
  readonly todosCount = computed(() => this.payments().length);

  readonly visiblePayments = computed<IPayment[]>(() => {
    const filter = this.agingFilter();
    const rows = this.payments();
    if (filter === 'vencidos') {
      return rows.filter(p => p.agingDays > 0);
    }
    if (filter === 'semana') {
      return rows.filter(p => Math.abs(p.agingDays) <= 7);
    }
    return rows;
  });

  readonly porCobrar = computed(() =>
    this.payments().reduce((sum, p) => sum + (p.amount ?? 0), 0),
  );

  ngOnInit(): void {
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

  loadData(): void {
    this.isDataLoaded.set(false);
    const pagination = this.pagination();
    this.finanzasService.getPayments({
      paid: false,
      limit: pagination.limit,
      offset: pagination.offset,
      searchText: pagination.searchText,
    }).subscribe({
      next: (response) => {
        this.payments.set(response.rows ?? []);
        this.pagination.update(p => ({ ...p, count: response.count ?? 0 }));
        this.isDataLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.isDataLoaded.set(true);
      },
    });
  }

  setAgingFilter(filter: AgingFilter): void {
    this.agingFilter.set(filter);
  }

  onPageChange(event: PageEvent): void {
    this.pagination.update(p => ({ ...p, limit: event.limit, offset: event.offset }));
    this.loadData();
  }

  registrarPago(payment: IPayment): void {
    const dialogRef = this.dialog.open(RegistrarPagoModalComponent, {
      width: '480px',
      maxWidth: '100vw',
      disableClose: true,
      data: { payment },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  deletePayment(payment: IPayment): void {
    const dialogData = this.common.getDefaultDeleteConfirmation({ objectName: 'payment' });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);
    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.finanzasService.deletePayment(payment.id).subscribe({
          next: () => {
            this.loadData();
            this.toast.info('El pago fue eliminado correctamente.');
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
