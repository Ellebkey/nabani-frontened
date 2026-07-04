import { MAGUEY_USER_COLORS } from '@shared/services/maguey-palette';
import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ColorSwatchesComponent } from '@shared/components/color-swatches/color-swatches.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { ITag, CreateTagDto, UpdateTagDto } from '@shared/interfaces/tag.model';



@Component({
    selector: 'app-tag-form-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinner,
        ModalShellComponent,
        ColorSwatchesComponent,
        TileComponent,
        PillComponent
    ],
    templateUrl: './tag-form-modal.component.html'
})
export class TagFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TagFormModalComponent>>(MatDialogRef);
  data = inject<ITag | null>(MAT_DIALOG_DATA);

  // Form setup (field initializer: toSignal below needs an injection context)
  tagForm: FormGroup = this.createForm();

  // State signals
  protected readonly isSubmitting = signal(false);
  protected readonly selectedColor = signal(MAGUEY_USER_COLORS[0]);

  // Available colors for selection

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.tagForm.events);
  protected readonly formInvalid = computed(() => {
    this.formEvents();
    return this.tagForm.invalid;
  });
  protected readonly nameValue = computed(() => {
    this.formEvents();
    return this.tagForm.get('name')?.value ?? '';
  });
  protected readonly showNameError = computed(() => {
    this.formEvents();
    const name = this.tagForm.get('name');
    return !!name && name.invalid && name.touched;
  });
  protected readonly nameErrorMessage = computed(() => {
    this.formEvents();
    return this.tagForm.get('name')?.hasError('minlength') ? 'Mínimo 2 caracteres' : 'El nombre es obligatorio';
  });

  // Computed properties
  protected readonly isEditMode = computed(() => this.data !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar etiqueta' : 'Nueva etiqueta'
  );

  constructor() {
    this.initializeForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      color: [MAGUEY_USER_COLORS[0], [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  private initializeForm(): void {
    if (this.data) {
      // Edit mode - populate form with existing data
      this.tagForm.patchValue({
        name: this.data.name,
        color: this.data.color,
        description: this.data.description || ''
      });
      this.selectedColor.set(this.data.color);
    }
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
    this.tagForm.patchValue({ color: color });
  }

  protected onSubmit(): void {
    if (this.tagForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      const formData = this.tagForm.value;
      const result: CreateTagDto | UpdateTagDto = {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description?.trim() || null
      };

      // Small delay for better UX
      setTimeout(() => {
        this.dialogRef.close(result);
      }, 300);
    }
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
