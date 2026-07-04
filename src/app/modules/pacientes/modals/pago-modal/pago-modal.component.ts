import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { format } from 'date-fns';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { PacientesService } from '../../pacientes.service';
import { IPayment, PAYMENT_METHOD_OPTIONS } from '../../pacientes.models';

interface DialogData {
  payment: IPayment;
  patientName: string;
  saldo: number;
}

@Component({
  selector: 'app-pago-modal',
  templateUrl: './pago-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, ChipComponent, ChipRowComponent,
    MatButton, MatProgressSpinner, CurrencyPipe, DatePipe,
  ],
})
export class PagoModalComponent {
  private pacientesService = inject(PacientesService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PagoModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly methodOptions = PAYMENT_METHOD_OPTIONS;
  readonly selectedMethod = signal<string>('efectivo');

  readonly form: FormGroup = this.fb.group({
    amount: [this.data.payment.amount ?? null, [Validators.required, Validators.min(0)]],
    paymentDate: [format(new Date(), 'yyyy-MM-dd'), Validators.required],
    note: [this.data.payment.note ?? null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly subtitle = computed(() => {
    const folio = this.data.payment.folio;
    return folio ? `${this.data.patientName} · ${folio}` : this.data.patientName;
  });

  readonly overdueBanner = computed(() => {
    const aging = this.data.payment.agingDays ?? 0;
    if (aging > 0) {
      return `Pago vencido hace ${aging} días`;
    }
    return '';
  });

  showError(controlName: string): boolean {
    this.formEvents();
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  selectMethod(method: string): void {
    this.selectedMethod.set(method);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();

    this.pacientesService.updatePayment(this.data.payment.id, {
      paid: true,
      method: this.selectedMethod(),
      note: raw.note || null,
    }).pipe(
      this.toast.observe({
        loading: 'Registrando pago...',
        success: 'Pago registrado exitosamente',
        error: 'Error al registrar el pago',
      }),
      catchError((err) => {
        this.form.enable();
        console.error(err);
        return of(null);
      }),
    ).subscribe({
      next: (response) => {
        if (response) {
          setTimeout(() => this.dialogRef.close(response), 400);
        }
      },
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
