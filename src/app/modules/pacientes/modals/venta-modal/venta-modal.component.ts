import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { format } from 'date-fns';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';
import { PillComponent } from '@shared/components/pill/pill.component';

import { PacientesService } from '../../pacientes.service';
import { IPackage, BILLING_OPTIONS, billingLabel } from '../../pacientes.models';

interface DialogData {
  patientId: number;
  patientName: string;
}

interface Breakdown {
  days: number;
  pricePerDay: number;
  subtotal: number;
  discount: number;
  total: number;
}

@Component({
  selector: 'app-venta-modal',
  templateUrl: './venta-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, CompactSelectComponent,
    ChipComponent, ChipRowComponent, PillComponent, MatButton, MatProgressSpinner, CurrencyPipe,
  ],
})
export class VentaModalComponent implements OnInit {
  private pacientesService = inject(PacientesService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<VentaModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly packages = signal<IPackage[]>([]);
  readonly billingOptions = BILLING_OPTIONS;
  readonly selectedBilling = signal<string>('mensual');
  protected readonly billingLabel = billingLabel;

  readonly form: FormGroup = this.fb.group({
    packageId: [null, Validators.required],
    startDate: [format(new Date(), 'yyyy-MM-dd'), Validators.required],
    days: [22, [Validators.required, Validators.min(1)]],
    discount: [0],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formValue = computed(() => { this.formEvents(); return this.form.getRawValue(); });
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly packageOptions = computed<MgSelectOption[]>(() =>
    this.packages().map(p => ({ value: p.id, label: p.name }))
  );

  readonly selectedPackage = computed<IPackage | null>(() => {
    const id = this.formValue().packageId;
    return this.packages().find(p => p.id === id) ?? null;
  });

  readonly breakdown = computed<Breakdown>(() => {
    const pricePerDay = Number(this.selectedPackage()?.pricePerDay ?? 0);
    const days = Number(this.formValue().days ?? 0);
    const discount = Number(this.formValue().discount ?? 0);
    const subtotal = days * pricePerDay;
    return { days, pricePerDay, subtotal, discount, total: Math.max(0, subtotal - discount) };
  });

  ngOnInit(): void {
    this.pacientesService.getPackages().subscribe({
      next: (response) => this.packages.set(response.rows ?? []),
      error: () => { /* keep current state on load failure */ },
    });
  }

  selectBilling(billing: string): void {
    this.selectedBilling.set(billing);
  }

  showError(controlName: string): boolean {
    this.formEvents();
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();

    this.pacientesService.calculateSale({
      patientId: this.data.patientId,
      packageId: raw.packageId,
      startDate: raw.startDate,
      days: Number(raw.days),
      billing: this.selectedBilling(),
    }).pipe(
      this.toast.observe({
        loading: 'Registrando venta...',
        success: 'Venta registrada exitosamente',
        error: 'Error al registrar la venta',
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
