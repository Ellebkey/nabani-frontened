import { Component, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { IFamilyBudget, IFamilyCategoryRef } from '../../models/family.model';

export interface BudgetFormModalData {
  budget: IFamilyBudget | null;
  availableCategories: IFamilyCategoryRef[];
  monthLabel: string;
}

@Component({
    selector: 'app-budget-form-modal',
    templateUrl: './budget-form-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        ModalShellComponent
    ]
})
export class BudgetFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<BudgetFormModalComponent>>(MatDialogRef);
  data = inject<BudgetFormModalData>(MAT_DIALOG_DATA);

  protected readonly isEditMode = computed(() => this.data.budget !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar presupuesto' : 'Nuevo presupuesto'
  );
  protected readonly shellTitle = computed(() => `${this.modalTitle()} · ${this.data.monthLabel}`);

  // Field initializer: toSignal below needs an injection context
  protected readonly form: FormGroup = this.fb.group({
    categoryId: [
      { value: this.data.budget?.categoryId ?? null, disabled: this.isEditMode() },
      [Validators.required]
    ],
    amount: [this.data.budget?.amount ?? null, [Validators.required, Validators.min(1)]]
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.form.events);
  protected readonly formInvalid = computed(() => {
    this.formEvents();
    return this.form.invalid;
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.dialogRef.close({
      categoryId: this.form.getRawValue().categoryId,
      amount: Number(this.form.value.amount)
    });
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
