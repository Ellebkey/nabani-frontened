import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';

import { AccountsService } from '../accounts.service';
import { CommonService } from '@shared/services/common.service';
import { IAccount } from '@shared/interfaces/account.model';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { TileComponent } from '../../shared/components/tile/tile.component';
import { MatIcon } from '@angular/material/icon';
import { DotComponent } from '../../shared/components/dot/dot.component';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';

interface TransferModalData {
  accounts: IAccount[];
  preSelectedAccountId: string;
}

const currentTimeString = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

@Component({
    selector: 'app-account-transfer-modal',
    templateUrl: './account-transfer-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalShellComponent, FormsModule, ReactiveFormsModule, MatMenuTrigger, TileComponent, MatIcon, MatMenu, MatMenuItem, DotComponent, MatFormField, MatInput, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker, MatButton, MatProgressSpinner, CurrencyPipe]
})
export class AccountTransferModalComponent {
  private accountService = inject(AccountsService);
  private commonService = inject(CommonService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<AccountTransferModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject<TransferModalData>(MAT_DIALOG_DATA);


  // Built in a field initializer so the toSignal bridge below runs in an injection context
  readonly transferForm: FormGroup = this.fb.group({
    sourceAccountId: [this.data.preSelectedAccountId, Validators.required],
    destinyAccountId: [null, Validators.required],
    movementDate: [new Date(), Validators.required],
    movementTime: [currentTimeString(), Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    comment: [null],
  });

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly formEvents = toSignal(this.transferForm.events);
  readonly formValue = computed(() => { this.formEvents(); return this.transferForm.getRawValue(); });
  readonly formInvalid = computed(() => { this.formEvents(); return this.transferForm.invalid; });
  readonly formDisabled = computed(() => { this.formEvents(); return this.transferForm.disabled; });

  get accounts(): IAccount[] {
    return this.data.accounts ?? [];
  }

  readonly sourceAccount = computed<IAccount | null>(() =>
    this.accounts.find(a => a.id === this.formValue().sourceAccountId) ?? null);

  readonly destinationAccounts = computed<IAccount[]>(() =>
    this.accounts.filter(a => a.id !== this.formValue().sourceAccountId));

  selectSource(accountId: string): void {
    const patch: { sourceAccountId: string; destinyAccountId?: null } = { sourceAccountId: accountId };
    if (this.transferForm.value.destinyAccountId === accountId) {
      patch.destinyAccountId = null;
    }
    this.transferForm.patchValue(patch);
  }

  selectDestination(accountId: string): void {
    this.transferForm.patchValue({ destinyAccountId: accountId });
  }

  swapAccounts(): void {
    const { sourceAccountId, destinyAccountId } = this.transferForm.value;
    if (!destinyAccountId) {
      return;
    }
    this.transferForm.patchValue({ sourceAccountId: destinyAccountId, destinyAccountId: sourceAccountId });
  }

  readonly destinationAccount = computed<IAccount | null>(() =>
    this.accounts.find(account => account.id === this.formValue().destinyAccountId) ?? null);

  readonly destinationNewBalance = computed<number>(() =>
    Number(this.destinationAccount()?.currentAmount ?? 0) + Number(this.formValue().amount || 0));

  transferAll(): void {
    this.transferForm.patchValue({ amount: Number(this.sourceAccount()?.currentAmount ?? 0) });
  }

  readonly newBalance = computed<number>(() => {
    const currentAmount = this.sourceAccount()?.currentAmount || 0;
    const transferAmount = this.formValue().amount || 0;
    return currentAmount - transferAmount;
  });

  readonly hasInsufficientFunds = computed<boolean>(() => {
    const amount = this.formValue().amount || 0;
    return amount > (this.sourceAccount()?.currentAmount || 0);
  });

  save(): void {
    if (this.transferForm.invalid || this.hasInsufficientFunds()) {
      return;
    }

    this.transferForm.disable();
    const formValue = this.transferForm.getRawValue();
    const combinedDateTime = this.commonService.combineDateAndTime(formValue.movementDate, formValue.movementTime);
    formValue.movementDate = combinedDateTime;
    formValue.movementType = 'transfer';

    this.accountService.accountTransfer(formValue)
      .pipe(
        this.toast.observe({
          loading: 'Procesando...',
          success: 'Transferencia realizada',
          error: 'Error en la transferencia'
        }),
        catchError((err) => {
          console.error(err);
          this.transferForm.enable();
          return of(err);
        })
      )
      .subscribe({
        next: (response) => {
          setTimeout(() => {
            this.dialogRef.close(response);
          }, 500);
        },
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
