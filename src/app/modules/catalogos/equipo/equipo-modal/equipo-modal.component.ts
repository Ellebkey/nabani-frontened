import { Component, OnInit, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';

import { CatalogosService } from '../../catalogos.service';
import { IEmployee, POSITION_OPTIONS } from '../../catalogos.models';

interface DialogData {
  employee?: IEmployee;
  isEditMode?: boolean;
}

@Component({
  selector: 'app-equipo-modal',
  templateUrl: './equipo-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, CompactSelectComponent,
    MatButton, MatProgressSpinner, CurrencyPipe,
  ],
})
export class EquipoModalComponent implements OnInit {
  private catalogosService = inject(CatalogosService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<EquipoModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly form: FormGroup = this.fb.group({
    firstName: [null, Validators.required],
    lastName: [null, Validators.required],
    email: [null, [Validators.required, Validators.email]],
    position: [null, Validators.required],
    salaryQuincenal: [null, [Validators.required, Validators.min(0)]],
    lastPaymentDate: [null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formValue = computed(() => { this.formEvents(); return this.form.getRawValue(); });
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly isEditMode = signal(false);
  readonly title = computed(() => this.isEditMode() ? 'Editar empleado' : 'Nuevo empleado');
  readonly positionOptions: MgSelectOption[] = POSITION_OPTIONS;

  ngOnInit(): void {
    const employee = this.data?.employee;
    if (this.data?.isEditMode && employee) {
      this.isEditMode.set(true);
      this.form.patchValue({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        position: employee.position,
        salaryQuincenal: employee.salaryQuincenal,
        lastPaymentDate: employee.lastPaymentDate ? employee.lastPaymentDate.substring(0, 10) : null,
      });
    }
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
    const payload = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      position: raw.position,
      salaryQuincenal: Number(raw.salaryQuincenal),
      lastPaymentDate: raw.lastPaymentDate || null,
    };

    const save$ = this.isEditMode()
      ? this.catalogosService.updateEmployee(this.data!.employee!.id, payload)
      : this.catalogosService.saveEmployee(payload);

    const messages = this.isEditMode()
      ? { loading: 'Actualizando...', success: 'Empleado actualizado exitosamente', error: 'Error al actualizar el empleado' }
      : { loading: 'Guardando...', success: 'Empleado creado exitosamente', error: 'Error al guardar el empleado' };

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
