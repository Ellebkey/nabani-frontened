import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { ColorSwatchesComponent } from '@shared/components/color-swatches/color-swatches.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { CcardComponent } from '@shared/components/ccard/ccard.component';
import { CompactSelectComponent, MgSelectOption } from '@shared/components/compact-select/compact-select.component';
import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { HotToastService } from '@ngxpert/hot-toast';

import {
  IPaymentMethod,
  IPaymentMethodCreate,
  IPaymentMethodUpdate,
  PAYMENT_METHODS,
  CARD_GRADIENTS
} from '@shared/interfaces/payment-method.model';
import { IAccountCreate, DEFAULT_ACCOUNT_COLORS } from '@shared/interfaces/account.model';
import { AccountsApiService } from '@app/modules/admin/accounts-management/services/api/accounts-api.service';
import { AccountsStateService } from '@app/modules/admin/accounts-management/services/state/accounts-state.service';

@Component({
    selector: 'app-payment-method-form-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatProgressSpinner,
        ModalShellComponent,
        ColorSwatchesComponent,
        TileComponent,
        CcardComponent,
        CompactSelectComponent
    ],
    templateUrl: './payment-method-form-modal.component.html',
    styleUrl: './payment-method-form-modal.component.scss'
})
export class PaymentMethodFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PaymentMethodFormModalComponent>>(MatDialogRef);
  data = inject<IPaymentMethod | null>(MAT_DIALOG_DATA);

  private readonly accountsState = inject(AccountsStateService);
  private readonly accountsApi = inject(AccountsApiService);
  private readonly toast = inject(HotToastService);

  // Forms as field initializers: toSignal below needs an injection context
  paymentForm: FormGroup = this.createForm();
  newAccountForm: FormGroup = this.createAccountForm();

  // State signals
  protected readonly isSubmitting = signal(false);
  protected readonly selectedColor = signal(CARD_GRADIENTS[0].primary);
  protected readonly showAccountCreation = signal(false);

  // Zoneless: reactive-form state read in the template must come through signals
  private readonly paymentFormEvents = toSignal(this.paymentForm.events);
  private readonly newAccountFormEvents = toSignal(this.newAccountForm.events);

  // Available options
  protected readonly availableColors = CARD_GRADIENTS.map(g => g.primary);
  protected readonly accounts = this.accountsState.accounts;
  protected readonly noAccountsAvailable = computed(() => this.accounts().length === 0);
  protected readonly isCreatingNewAccount = computed(() => this.showAccountCreation() || this.noAccountsAvailable());

  protected readonly paymentMethodTypes = [
    { value: PAYMENT_METHODS.CREDIT_CARD, label: 'Tarjeta de Crédito', icon: 'credit_card' },
    { value: PAYMENT_METHODS.DEBIT_CARD, label: 'Tarjeta de Débito', icon: 'payment' },
    { value: PAYMENT_METHODS.CASH, label: 'Efectivo', icon: 'payments' },
    { value: PAYMENT_METHODS.BANK_TRANSFER, label: 'Transferencia Bancaria', icon: 'account_balance' },
    { value: PAYMENT_METHODS.DIGITAL_WALLET, label: 'Billetera Digital', icon: 'account_balance_wallet' }
  ];

  protected get typeOptions(): MgSelectOption[] {
    return this.paymentMethodTypes.map(type => ({ value: type.value, label: type.label }));
  }

  protected get accountOptions(): MgSelectOption[] {
    return this.accounts().map(account => ({
      value: account.id,
      label: account.name,
      color: account.colorPalette || undefined,
    }));
  }

  protected readonly previewIcon = computed<string>(() => {
    this.paymentFormEvents();
    const iconMap: Record<string, string> = {
      [PAYMENT_METHODS.CASH]: 'heroicons_outline:banknotes',
      [PAYMENT_METHODS.BANK_TRANSFER]: 'heroicons_outline:arrows-right-left',
      [PAYMENT_METHODS.DIGITAL_WALLET]: 'heroicons_outline:credit-card',
    };
    return iconMap[this.paymentForm.get('method')?.value] || 'heroicons_outline:credit-card';
  });

  protected readonly previewName = computed<string>(() => {
    this.paymentFormEvents();
    return this.paymentForm.get('shortName')?.value || 'Nombre del método';
  });

  protected readonly previewLastDigits = computed<string | null>(() => {
    this.paymentFormEvents();
    return this.paymentForm.get('cardNumber')?.value || null;
  });

  // Computed properties
  protected readonly isEditMode = computed(() => this.data !== null);
  protected readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar método de pago' : 'Nuevo método de pago'
  );

  constructor() {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.accountsState.loadAccounts();
  }

  protected readonly isCardMethod = computed<boolean>(() => {
    this.paymentFormEvents();
    const method = this.paymentForm.get('method')?.value;
    return method === PAYMENT_METHODS.CREDIT_CARD || method === PAYMENT_METHODS.DEBIT_CARD;
  });

  private createForm(): FormGroup {
    return this.fb.group({
      shortName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      method: [PAYMENT_METHODS.CREDIT_CARD, Validators.required],
      cardNumber: ['', [Validators.maxLength(4), Validators.pattern(/^\d{0,4}$/)]],
      accountId: ['', Validators.required],
      backgroundColor: [CARD_GRADIENTS[0].primary, Validators.required]
    });
  }

  private initializeForm(): void {
    if (this.data) {
      this.paymentForm.patchValue({
        shortName: this.data.shortName,
        method: this.data.method,
        cardNumber: this.data.cardNumber || '',
        accountId: this.data.accountId,
        backgroundColor: this.data.backgroundColor || CARD_GRADIENTS[0].primary
      });
      this.selectedColor.set(this.data.backgroundColor || CARD_GRADIENTS[0].primary);
    }
  }

  protected isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  }

  protected readonly selectedMethodLabel = computed<string>(() => {
    this.paymentFormEvents();
    const method = this.paymentForm.get('method')?.value;
    return this.paymentMethodTypes.find(t => t.value === method)?.label ?? '';
  });

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
    this.paymentForm.patchValue({ backgroundColor: color });
  }

  protected readonly canSubmit = computed<boolean>(() => {
    this.paymentFormEvents();
    this.newAccountFormEvents();
    if (this.isCreatingNewAccount()) {
      // When creating a new account inline, skip accountId validation but check the rest + newAccountForm
      const paymentFormWithoutAccount = ['shortName', 'method', 'backgroundColor']
        .every(field => this.paymentForm.get(field)?.valid);
      return paymentFormWithoutAccount && this.newAccountForm.valid;
    }
    return this.paymentForm.valid;
  });

  protected onSubmit(): void {
    if (!this.canSubmit() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    if (this.isCreatingNewAccount()) {
      // First create the account, then close with the payment method data
      const accountFormValue = this.newAccountForm.value;
      const randomColor = DEFAULT_ACCOUNT_COLORS[Math.floor(Math.random() * DEFAULT_ACCOUNT_COLORS.length)];

      const accountData: IAccountCreate = {
        name: accountFormValue.name.trim(),
        currentAmount: accountFormValue.currentAmount,
        colorPalette: randomColor
      };

      this.accountsApi.createAccount(accountData).subscribe({
        next: (newAccount) => {
          this.accountsState.loadAccounts();
          this.paymentForm.patchValue({ accountId: newAccount.id });
          this.toast.success(`Cuenta "${accountData.name}" creada`);
          this.closeWithPaymentMethod();
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toast.error('Error al crear la cuenta');
        }
      });
    } else {
      this.closeWithPaymentMethod();
    }
  }

  private closeWithPaymentMethod(): void {
    const formData = this.paymentForm.value;
    const result: IPaymentMethodCreate | IPaymentMethodUpdate = {
      shortName: formData.shortName.trim(),
      method: formData.method,
      accountId: formData.accountId,
      backgroundColor: formData.backgroundColor,
      ...(formData.cardNumber ? { cardNumber: formData.cardNumber.trim() } : { cardNumber: '' }),
      ...(this.isEditMode() ? { id: this.data!.id } : {})
    };

    setTimeout(() => {
      this.dialogRef.close(result);
    }, 500);
  }

  private createAccountForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      currentAmount: [0, [Validators.required, Validators.min(0)]]
    });
  }

  protected toggleAccountCreation(): void {
    this.showAccountCreation.update(v => !v);
  }

  protected onCancel(): void {
    this.dialogRef.close(null);
  }
}
