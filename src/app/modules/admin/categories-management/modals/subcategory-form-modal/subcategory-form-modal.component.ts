import { Component, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ISubcategory } from '@shared/interfaces/common.model';

export interface SubcategoryFormData {
  categoryId: number;
  categoryName: string;
  subcategory: ISubcategory | null;
}

@Component({
    selector: 'app-subcategory-form-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        ModalShellComponent,
    ],
    templateUrl: './subcategory-form-modal.component.html'
})
export class SubcategoryFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<SubcategoryFormModalComponent>>(MatDialogRef);
  data = inject<SubcategoryFormData>(MAT_DIALOG_DATA);

  // Field initializer: toSignal below needs an injection context
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });
  protected readonly isEditMode = computed(() => this.data.subcategory !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode()
      ? 'Editar Subcategoría'
      : `Nueva Subcategoría en "${this.data.categoryName}"`
  );

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.form.events);
  protected readonly formInvalid = computed(() => {
    this.formEvents();
    return this.form.invalid;
  });
  protected readonly showNameRequiredError = computed(() => {
    this.formEvents();
    const name = this.form.get('name');
    return !!name && name.hasError('required') && name.touched;
  });
  protected readonly showNameMinlengthError = computed(() => {
    this.formEvents();
    return !!this.form.get('name')?.hasError('minlength');
  });

  constructor() {
    if (this.data.subcategory) {
      this.form.patchValue({ name: this.data.subcategory.name });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.dialogRef.close({
      name: this.form.value.name.trim(),
      categoryId: this.data.categoryId,
    });
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
