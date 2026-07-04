import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { MerchantsService } from '@app/modules/inventory/merchants.service';
import { IMerchant } from '@shared/interfaces/merchant.model';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-create-merchant-modal',
    templateUrl: './create-merchant-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalShellComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatButton, MatProgressSpinner]
})
export class CreateMerchantModalComponent implements OnInit {
  private merchantService = inject(MerchantsService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<CreateMerchantModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject<IMerchant>(MAT_DIALOG_DATA);


  createMerchantForm: FormGroup = this.fb.group({
    name: [null, Validators.required]
  });
  readonly title = signal('Registrar Beneficiario');
  isEditMode = false;

  ngOnInit() {
    // Check if we're in edit mode
    if (this.data) {
      this.isEditMode = true;
      this.title.set('Actualizar Beneficiario');
      this.createMerchantForm.patchValue({
        name: this.data.name
      });
    }
  }
  save() {
    if (this.createMerchantForm.invalid) {
      return;
    }

    this.createMerchantForm.disable();

    const operation = this.isEditMode
      ? this.merchantService.updateMerchant(this.data.id, this.createMerchantForm.value)
      : this.merchantService.createMerchant(this.createMerchantForm.value);

    const successMessage = this.isEditMode
      ? 'Beneficiario actualizado exitosamente'
      : 'Beneficiario creado exitosamente';

    operation
      .pipe(
        this.toast.observe({
          loading: 'Guardando...',
          success: successMessage,
          error: 'Error al guardar el beneficiario'
        }),
        catchError((err) => {
          console.error(err);
          return of(err);
        })
      )
      .subscribe({
          next: (response) => {
            setTimeout(() => {
              this.dialogRef.close(response);
            }, 500);
          },
        }
      );
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
