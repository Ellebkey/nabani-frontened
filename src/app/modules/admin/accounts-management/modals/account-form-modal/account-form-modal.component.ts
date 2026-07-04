import { CurrencyPipe } from '@angular/common';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ColorSwatchesComponent } from '@shared/components/color-swatches/color-swatches.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { IAccount, IAccountCreate, IAccountUpdate, DEFAULT_ACCOUNT_COLORS } from '@shared/interfaces/account.model';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-account-form-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatSlideToggleModule,
        MatProgressSpinner,
        CurrencyPipe,
        ModalShellComponent,
        ColorSwatchesComponent,
        TileComponent
    ],
    templateUrl: './account-form-modal.component.html',
    styleUrl: './account-form-modal.component.scss'
})
export class AccountFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<AccountFormModalComponent>>(MatDialogRef);
  data = inject<IAccount | null>(MAT_DIALOG_DATA);

  // Form setup (field initializer: toSignal below needs an injection context)
  accountForm: FormGroup = this.createForm();

  // State signals
  protected readonly isSubmitting = signal(false);
  protected readonly selectedColor = signal(DEFAULT_ACCOUNT_COLORS[0]);

  // Available colors for selection
  protected readonly availableColors = DEFAULT_ACCOUNT_COLORS;

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.accountForm.events);
  protected readonly formInvalid = computed(() => {
    this.formEvents();
    return this.accountForm.invalid;
  });
  protected readonly previewName = computed(() => {
    this.formEvents();
    return this.accountForm.get('name')?.value || 'Nombre de la cuenta';
  });
  protected readonly previewAmount = computed(() => {
    this.formEvents();
    return this.accountForm.get('currentAmount')?.value || 0;
  });

  // Computed properties
  protected readonly isEditMode = computed(() => this.data !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar cuenta' : 'Nueva cuenta'
  );

  constructor() {
    this.initializeForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      currentAmount: [0, [Validators.required]],
      colorPalette: [DEFAULT_ACCOUNT_COLORS[0], Validators.required]
    });
  }

  private initializeForm(): void {
    if (this.data) {
      // Edit mode - populate form with existing data
      this.accountForm.patchValue({
        name: this.data.name,
        currentAmount: this.data.currentAmount,
        colorPalette: this.data.colorPalette
      });
      this.selectedColor.set(this.data.colorPalette);

      // Disable currentAmount field in edit mode
      this.accountForm.get('currentAmount')?.disable();
    }
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
    this.accountForm.patchValue({ colorPalette: color });
  }

  protected onSubmit(): void {
    if (this.accountForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      const formData = this.accountForm.value;

      const result: IAccountCreate | IAccountUpdate = this.isEditMode()
        ? { name: formData.name.trim(), colorPalette: formData.colorPalette }
        : { name: formData.name.trim(), currentAmount: parseFloat(formData.currentAmount) || 0, colorPalette: formData.colorPalette };

      setTimeout(() => {
        this.dialogRef.close(result);
      }, 500);
    }
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
