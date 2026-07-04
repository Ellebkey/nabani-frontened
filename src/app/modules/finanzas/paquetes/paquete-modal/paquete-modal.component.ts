import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

import { FinanzasService } from '../../finanzas.service';
import { IPackage, PackageDTO, MEAL_TOGGLES } from '../../finanzas.models';

interface DialogData {
  pkg?: IPackage;
  isEditMode?: boolean;
}

@Component({
  selector: 'app-paquete-modal',
  templateUrl: './paquete-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, ChipComponent, ChipRowComponent,
    MatButton, MatProgressSpinner, CurrencyPipe,
  ],
})
export class PaqueteModalComponent implements OnInit {
  private finanzasService = inject(FinanzasService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PaqueteModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly mealToggles = MEAL_TOGGLES;

  readonly form: FormGroup = this.fb.group({
    displayLabel: [null, Validators.required],
    code: [null, Validators.required],
    pricePerDay: [null, [Validators.required, Validators.min(0)]],
    consultPrice: [null, [Validators.min(0)]],
    monthDiscount: [null, [Validators.min(0)]],
    includesDesayuno: [false],
    includesSnack1: [false],
    includesComida: [true],
    includesSnack2: [false],
    includesCena: [false],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formValue = computed(() => { this.formEvents(); return this.form.getRawValue(); });
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly isEditMode = signal(false);
  readonly title = computed(() => this.isEditMode() ? 'Editar paquete' : 'Nuevo paquete');

  ngOnInit(): void {
    const pkg = this.data?.pkg;
    if (this.data?.isEditMode && pkg) {
      this.isEditMode.set(true);
      this.form.patchValue({
        displayLabel: pkg.displayLabel,
        code: pkg.code,
        pricePerDay: pkg.pricePerDay,
        consultPrice: pkg.consultPrice,
        monthDiscount: pkg.monthDiscount,
        includesDesayuno: pkg.includesDesayuno,
        includesSnack1: pkg.includesSnack1,
        includesComida: pkg.includesComida,
        includesSnack2: pkg.includesSnack2,
        includesCena: pkg.includesCena,
      });
    }
  }

  isMealOn(control: string): boolean {
    return !!this.formValue()[control];
  }

  toggleMeal(control: string): void {
    const ctrl = this.form.get(control);
    ctrl?.setValue(!ctrl.value);
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
    const payload: PackageDTO = {
      displayLabel: raw.displayLabel,
      code: raw.code,
      pricePerDay: Number(raw.pricePerDay),
      consultPrice: raw.consultPrice != null && raw.consultPrice !== '' ? Number(raw.consultPrice) : 0,
      monthDiscount: raw.monthDiscount != null && raw.monthDiscount !== '' ? Number(raw.monthDiscount) : 0,
      includesDesayuno: !!raw.includesDesayuno,
      includesSnack1: !!raw.includesSnack1,
      includesComida: !!raw.includesComida,
      includesSnack2: !!raw.includesSnack2,
      includesCena: !!raw.includesCena,
    };

    const save$ = this.isEditMode()
      ? this.finanzasService.updatePackage(this.data!.pkg!.id, payload)
      : this.finanzasService.savePackage(payload);

    const messages = this.isEditMode()
      ? { loading: 'Actualizando...', success: 'Paquete actualizado exitosamente', error: 'Error al actualizar el paquete' }
      : { loading: 'Guardando...', success: 'Paquete creado exitosamente', error: 'Error al guardar el paquete' };

    save$.pipe(
      this.toast.observe(messages),
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
