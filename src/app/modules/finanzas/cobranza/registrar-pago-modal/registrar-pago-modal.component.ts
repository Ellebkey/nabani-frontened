import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { FinanzasService } from '../../finanzas.service';
import { IPayment, PAYMENT_METHOD_OPTIONS, paymentPatientName } from '../../finanzas.models';

interface DialogData {
  payment: IPayment;
}

/** Registrar pago modal (design-spec §5, 480px). Confirms a pending payment
 *  via PUT /payments/:id with the chosen método + nota. */
@Component({
  selector: 'app-registrar-pago-modal',
  templateUrl: './registrar-pago-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, ChipComponent, ChipRowComponent,
    MatButton, MatProgressSpinner, CurrencyPipe, DatePipe,
  ],
})
export class RegistrarPagoModalComponent {
  private finanzasService = inject(FinanzasService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<RegistrarPagoModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly payment = this.data.payment;
  readonly patientName = paymentPatientName(this.data.payment);
  readonly subtitle = `${this.patientName} · venta ${this.payment.folio}`;
  readonly methodOptions = PAYMENT_METHOD_OPTIONS;

  readonly form: FormGroup = this.fb.group({
    method: ['efectivo', Validators.required],
    note: [null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });
  readonly selectedMethod = computed(() => { this.formEvents(); return this.form.get('method')?.value as string; });

  readonly isOverdue = signal(this.data.payment.agingDays > 0);

  selectMethod(method: string): void {
    this.form.get('method')?.setValue(method);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();

    this.finanzasService.registerPayment(this.payment.id, {
      paid: true,
      method: raw.method,
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
