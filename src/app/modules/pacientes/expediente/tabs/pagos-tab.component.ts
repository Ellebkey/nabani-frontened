import { Component, ChangeDetectionStrategy, computed, effect, signal, input, output, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MatDialog } from '@angular/material/dialog';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PillComponent } from '@shared/components/pill/pill.component';

import { PacientesService } from '../../pacientes.service';
import { IPatient, IPayment, billingLabel, methodLabel, mealLabel } from '../../pacientes.models';
import { PagoModalComponent } from '../../modals/pago-modal/pago-modal.component';

@Component({
  selector: 'app-pagos-tab',
  templateUrl: './pagos-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, MatButton, MatIcon, EmptyStateComponent, PillComponent],
})
export class PagosTabComponent {
  private pacientesService = inject(PacientesService);
  private dialog = inject(MatDialog);

  readonly patient = input.required<IPatient>();
  readonly reloadTick = input(0);
  readonly changed = output<void>();

  readonly payments = signal<IPayment[]>([]);
  readonly isLoaded = signal(false);

  protected readonly billingLabel = billingLabel;
  protected readonly methodLabel = methodLabel;
  protected readonly mealLabel = mealLabel;

  readonly unpaid = computed(() =>
    [...this.payments()].filter(p => !p.paid)
      .sort((a, b) => this.time(a.dueDate) - this.time(b.dueDate))
  );

  readonly saldo = computed(() =>
    this.unpaid().reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  readonly adeudoNote = computed(() => {
    const items = this.unpaid();
    if (!items.length) return '';
    const dates = items
      .map(p => this.shortDate(p.dueDate))
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    const count = items.length;
    return `${count} ${count === 1 ? 'día' : 'días'} con adeudo${dates ? ` (${dates})` : ''}`;
  });

  readonly history = computed(() =>
    [...this.payments()].sort((a, b) => this.time(b.dueDate) - this.time(a.dueDate))
  );

  constructor() {
    effect(() => {
      const id = this.patient().id;
      this.reloadTick();
      if (id) this.load(id);
    });
  }

  private load(id: number): void {
    this.isLoaded.set(false);
    this.pacientesService.getPayments(id).subscribe({
      next: (response) => {
        this.payments.set(response.rows ?? []);
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.payments.set([]);
        this.isLoaded.set(true);
      },
    });
  }

  registrarPago(): void {
    const next = this.unpaid()[0];
    if (next) this.openPago(next);
  }

  openPago(payment: IPayment): void {
    const dialogRef = this.dialog.open(PagoModalComponent, {
      width: '480px',
      maxWidth: '100vw',
      disableClose: true,
      data: {
        payment,
        patientName: `${this.patient().firstName} ${this.patient().lastName}`.trim(),
        saldo: this.saldo(),
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.changed.emit();
    });
  }

  private time(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
    try {
      return parseISO(dateStr).getTime();
    } catch {
      return 0;
    }
  }

  private shortDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'd MMM', { locale: es });
    } catch {
      return '';
    }
  }
}
