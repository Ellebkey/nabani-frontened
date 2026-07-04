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
import { IExpense, IBeneficiary, EXPENSE_TYPE_OPTIONS } from '../../finanzas.models';

interface DialogData {
  expense?: IExpense;
  beneficiaries?: IBeneficiary[];
  isEditMode?: boolean;
}

/** Nuevo gasto modal (design-spec §5, 480px). Beneficiario is a free-text
 *  name that the backend auto-creates; the datalist offers existing ones. */
@Component({
  selector: 'app-gasto-modal',
  templateUrl: './gasto-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, ChipComponent, ChipRowComponent,
    MatButton, MatProgressSpinner, CurrencyPipe,
  ],
})
export class GastoModalComponent implements OnInit {
  private finanzasService = inject(FinanzasService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<GastoModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly beneficiaries = signal<IBeneficiary[]>(this.data?.beneficiaries ?? []);
  readonly typeOptions = EXPENSE_TYPE_OPTIONS;

  readonly form: FormGroup = this.fb.group({
    beneficiary: [null],
    concept: [null, Validators.required],
    totalAmount: [null, [Validators.required, Validators.min(0)]],
    expenseDate: [null, Validators.required],
    type: ['variable', Validators.required],
    comments: [null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formValue = computed(() => { this.formEvents(); return this.form.getRawValue(); });
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });
  readonly selectedType = computed(() => { this.formEvents(); return this.form.get('type')?.value as string; });

  readonly isEditMode = signal(false);
  readonly title = computed(() => this.isEditMode() ? 'Editar gasto' : 'Nuevo gasto');

  ngOnInit(): void {
    const expense = this.data?.expense;
    if (this.data?.isEditMode && expense) {
      this.isEditMode.set(true);
      this.form.patchValue({
        beneficiary: expense.beneficiary?.name ?? null,
        concept: expense.concept,
        totalAmount: expense.totalAmount,
        expenseDate: expense.expenseDate ? expense.expenseDate.substring(0, 10) : null,
        type: (expense.type ?? 'variable').toLowerCase(),
        comments: expense.comments,
      });
    }
  }

  selectType(type: string): void {
    this.form.get('type')?.setValue(type);
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
      beneficiary: raw.beneficiary ? String(raw.beneficiary).trim() : null,
      concept: raw.concept,
      totalAmount: Number(raw.totalAmount),
      expenseDate: raw.expenseDate,
      type: raw.type,
      comments: raw.comments || null,
    };

    const save$ = this.isEditMode()
      ? this.finanzasService.updateExpense(this.data!.expense!.id, payload)
      : this.finanzasService.saveExpense(payload);

    const messages = this.isEditMode()
      ? { loading: 'Actualizando...', success: 'Gasto actualizado exitosamente', error: 'Error al actualizar el gasto' }
      : { loading: 'Guardando...', success: 'Gasto creado exitosamente', error: 'Error al guardar el gasto' };

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
