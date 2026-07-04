import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';

import { IncomesService } from '../incomes.service';
import { AccountsService } from '@app/modules/accounts/accounts.service';
import { CommonService } from '@shared/services/common.service';
import { IAccount } from '@shared/interfaces/account.model';
import { MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { CompactSelectComponent } from '../../shared/components/compact-select/compact-select.component';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';

const currentTimeString = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

@Component({
    selector: 'app-create-income',
    templateUrl: './create-income.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalShellComponent, FormsModule, ReactiveFormsModule, CompactSelectComponent, MatFormField, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, MatButton, MatProgressSpinner, CurrencyPipe]
})
export class CreateIncomeComponent implements OnInit {
  private incomeService = inject(IncomesService);
  private accountService = inject(AccountsService);
  private commonService = inject(CommonService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<CreateIncomeComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject(MAT_DIALOG_DATA);


  // Built in a field initializer so the toSignal bridge below runs in an injection context
  readonly createIncomeForm: FormGroup = this.fb.group({
    accountId: [null, Validators.required],
    concept: [null, Validators.required],
    incomeDate: [null, Validators.required],
    incomeTime: [currentTimeString(), Validators.required],
    totalAmount: [null, Validators.required],
    comment: [null],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.createIncomeForm.events);
  readonly formValue = computed(() => { this.formEvents(); return this.createIncomeForm.getRawValue(); });
  readonly formDisabled = computed(() => { this.formEvents(); return this.createIncomeForm.disabled; });

  accounts = signal<IAccount[]>([]);
  isEditMode = signal(false);
  title = computed(() => this.isEditMode() ? 'Actualizar ingreso' : 'Registrar ingreso');
  concepts = [{
    name: 'Nomina',
    id: 'Nomina'
  }, {
    name: 'Freelance',
    id: 'Freelance'
  }, {
    name: 'Otros',
    id: 'Otros'
  }];

  accountOptions = computed<MgSelectOption[]>(() => this.accounts().map(account => ({
    value: account.id,
    label: account.name,
    color: account.colorPalette,
  })));

  conceptOptions = computed<MgSelectOption[]>(() =>
    this.concepts.map(concept => ({ value: concept.id, label: concept.name }))
  );

  ngOnInit() {
    this.checkEditMode();
    this.accountService.getAccounts()
      .subscribe({
        next: (accounts) => {
          this.accounts.set(accounts.rows);
        }
      });
    this.initializeFromTemplate();
  }

  private checkEditMode(): void {
    if (this.data && this.data.isEditMode) {
      this.isEditMode.set(true);
    }
  }

  private initializeFromTemplate(): void {
    if (!this.data) {
      return
    }

    let timeValue = '';
    if (this.data.incomeDate) {
      const existingDate = new Date(this.data.incomeDate);
      timeValue = `${existingDate.getHours().toString().padStart(2, '0')}:${existingDate.getMinutes().toString().padStart(2, '0')}`;
    }

    this.createIncomeForm.patchValue({
      accountId: this.data.accountId,
      concept: this.data.concept,
      totalAmount: this.data.totalAmount,
      comment: this.data.comment,
      incomeDate: this.data.incomeDate ? new Date(this.data.incomeDate) : null,
      incomeTime: timeValue || this.createIncomeForm.get('incomeTime')?.value,
    })
  }

  // Reads the bridged events signal so zoneless templates re-evaluate on form changes
  showError(controlName: string): boolean {
    this.formEvents();
    const control = this.createIncomeForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  save() {
    if (this.createIncomeForm.invalid) {
      this.createIncomeForm.markAllAsTouched();
      return;
    }

    this.createIncomeForm.disable();
    const formValue = this.createIncomeForm.value;
    const combinedDateTime = this.commonService.combineDateAndTime(formValue.incomeDate, formValue.incomeTime);
    formValue.incomeDate = combinedDateTime;

    const saveOperation$ = this.isEditMode()
      ? this.incomeService.updateIncome(this.data.id, formValue)
      : this.incomeService.saveIncome(formValue);

    const messages = this.isEditMode()
      ? {
          loading: 'Actualizando...',
          success: 'Ingreso actualizado exitosamente',
          error: 'Error al actualizar el ingreso'
        }
      : {
          loading: 'Guardando...',
          success: 'Ingreso creado exitosamente',
          error: 'Error al guardar el ingreso'
        };

    saveOperation$
      .pipe(
        this.toast.observe(messages),
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
