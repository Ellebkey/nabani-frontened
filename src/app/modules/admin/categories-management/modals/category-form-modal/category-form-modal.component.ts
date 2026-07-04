import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ICategory } from '@shared/interfaces/common.model';
import { CreateCategoryDto, UpdateCategoryDto } from '../../services/api/categories-api.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ColorSwatchesComponent } from '@shared/components/color-swatches/color-swatches.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { PillComponent } from '@shared/components/pill/pill.component';

@Component({
    selector: 'app-category-form-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        ModalShellComponent,
        ColorSwatchesComponent,
        TileComponent,
        PillComponent,
    ],
    templateUrl: './category-form-modal.component.html'
})
export class CategoryFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<CategoryFormModalComponent>>(MatDialogRef);
  data = inject<ICategory | null>(MAT_DIALOG_DATA);

  // Field initializer: toSignal below needs an injection context
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });
  protected readonly selectedColor = signal<string | null>(null);
  protected readonly isEditMode = computed(() => this.data !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar categoría' : 'Nueva categoría'
  );

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.form.events);
  protected readonly formInvalid = computed(() => {
    this.formEvents();
    return this.form.invalid;
  });
  protected readonly nameValue = computed(() => {
    this.formEvents();
    return this.form.get('name')?.value ?? '';
  });
  protected readonly showNameError = computed(() => {
    this.formEvents();
    const name = this.form.get('name');
    return !!name && name.invalid && name.touched;
  });
  protected readonly nameErrorMessage = computed(() => {
    this.formEvents();
    return this.form.get('name')?.hasError('minlength') ? 'Mínimo 2 caracteres' : 'El nombre es obligatorio';
  });

  protected get subcategoriesLabel(): string {
    const count = this.data?.subcategories?.length ?? 0;
    return `${count} ${count === 1 ? 'subcategoría' : 'subcategorías'}`;
  }

  constructor() {
    if (this.data) {
      this.form.patchValue({ name: this.data.name });
      this.selectedColor.set(this.data.colorPalette);
    }
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    const result: CreateCategoryDto | UpdateCategoryDto = {
      name: this.form.value.name.trim(),
      colorPalette: this.selectedColor() || undefined,
    };

    this.dialogRef.close(result);
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
