import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { PaymentMethodFormModalComponent } from './payment-method-form-modal.component';
import { AccountsApiService } from '@app/modules/admin/accounts-management/services/api/accounts-api.service';
import { AccountsStateService } from '@app/modules/admin/accounts-management/services/state/accounts-state.service';
import { IPaymentMethod, PAYMENT_METHODS, CARD_GRADIENTS } from '@shared/interfaces/payment-method.model';
import { IAccount, DEFAULT_ACCOUNT_COLORS } from '@shared/interfaces/account.model';

const accountFixture: IAccount = {
  id: 'acc-1',
  name: 'Bancomer',
  currentAmount: 1500,
  value: 0,
  showSection: false,
  colorPalette: '#3570B4',
  isPrimary: false,
  disable: false,
  ownerId: 'u-1'
};

const paymentMethodFixture: IPaymentMethod = {
  id: 'pm-1',
  shortName: 'Visa Oro',
  method: PAYMENT_METHODS.CREDIT_CARD,
  cardType: 'visa',
  backgroundColor: '#004369',
  cardIcon: null,
  cardNumber: '4521',
  cardCVV: null,
  cardExpiry: null,
  creditLimit: 50000,
  cutOffDay: 15,
  isActive: true,
  accountId: 'acc-1',
  accountName: 'Bancomer'
};

describe('PaymentMethodFormModalComponent', () => {
  let accountsState: { accounts: ReturnType<typeof signal<IAccount[]>>; loadAccounts: jest.Mock };
  let accountsApi: { createAccount: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };
  let dialogRef: { close: jest.Mock };

  function setup(
    data: IPaymentMethod | null = null,
    accounts: IAccount[] = [accountFixture]
  ): ComponentFixture<PaymentMethodFormModalComponent> {
    accountsState = { accounts: signal<IAccount[]>(accounts), loadAccounts: jest.fn() };
    accountsApi = { createAccount: jest.fn() };
    toast = { success: jest.fn(), error: jest.fn() };
    dialogRef = { close: jest.fn() };

    TestBed.configureTestingModule({
      imports: [PaymentMethodFormModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AccountsStateService, useValue: accountsState },
        { provide: AccountsApiService, useValue: accountsApi },
        { provide: HotToastService, useValue: toast },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    const fixture = TestBed.createComponent(PaymentMethodFormModalComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('create mode', () => {
    it('should title the modal, refresh the accounts and start with credit defaults', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      expect(component['isEditMode']()).toBe(false);
      expect(component['modalTitle']()).toBe('Nuevo método de pago');
      expect(accountsState.loadAccounts).toHaveBeenCalledTimes(1);
      expect(component.paymentForm.value).toEqual({
        shortName: '',
        method: PAYMENT_METHODS.CREDIT_CARD,
        cardNumber: '',
        accountId: '',
        backgroundColor: CARD_GRADIENTS[0].primary
      });
      expect(component['selectedColor']()).toBe(CARD_GRADIENTS[0].primary);
      expect(component.paymentForm.invalid).toBe(true);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Crear');
    });

    it('should require shortName (2-50 chars) and an account', () => {
      const fixture = setup();
      const form = fixture.componentInstance.paymentForm;

      expect(form.get('shortName')!.hasError('required')).toBe(true);
      expect(form.get('accountId')!.hasError('required')).toBe(true);

      form.get('shortName')!.setValue('a');
      expect(form.get('shortName')!.hasError('minlength')).toBe(true);

      form.get('shortName')!.setValue('a'.repeat(51));
      expect(form.get('shortName')!.hasError('maxlength')).toBe(true);

      form.get('shortName')!.setValue('Visa');
      form.get('accountId')!.setValue('acc-1');
      expect(form.valid).toBe(true);
    });

    it('should only accept up to four digits as card number', () => {
      const fixture = setup();
      const cardNumber = fixture.componentInstance.paymentForm.get('cardNumber')!;

      expect(cardNumber.valid).toBe(true); // optional

      cardNumber.setValue('12a4');
      expect(cardNumber.hasError('pattern')).toBe(true);

      cardNumber.setValue('12345');
      expect(cardNumber.invalid).toBe(true);

      cardNumber.setValue('4521');
      expect(cardNumber.valid).toBe(true);
    });

    it('should expose the card digits field only for card methods', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      expect(component['isCardMethod']()).toBe(true);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Últimos 4 dígitos');

      component.paymentForm.get('method')!.setValue(PAYMENT_METHODS.CASH);
      // Clicking a swatch (real listener) marks the OnPush view for refresh
      (fixture.nativeElement.querySelector('mg-color-swatches button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component['isCardMethod']()).toBe(false);
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Últimos 4 dígitos');

      component.paymentForm.get('method')!.setValue(PAYMENT_METHODS.DEBIT_CARD);
      expect(component['isCardMethod']()).toBe(true);
    });

    it('should close after 500ms with the trimmed payload and no id', fakeAsync(() => {
      const fixture = setup();
      const component = fixture.componentInstance;
      component.paymentForm.patchValue({
        shortName: '  Visa Azul  ',
        accountId: 'acc-1',
        cardNumber: '4521'
      });
      component['selectColor']('#222e3d');

      component['onSubmit']();

      expect(component['isSubmitting']()).toBe(true);
      expect(dialogRef.close).not.toHaveBeenCalled();

      // A second submit while submitting must be ignored
      component['onSubmit']();
      tick(500);

      expect(accountsApi.createAccount).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledTimes(1);
      expect(dialogRef.close).toHaveBeenCalledWith({
        shortName: 'Visa Azul',
        method: PAYMENT_METHODS.CREDIT_CARD,
        accountId: 'acc-1',
        backgroundColor: '#222e3d',
        cardNumber: '4521'
      });
    }));

    it('should send an empty cardNumber when none is captured', fakeAsync(() => {
      const fixture = setup();
      fixture.componentInstance.paymentForm.patchValue({ shortName: 'Efectivo', accountId: 'acc-1' });

      fixture.componentInstance['onSubmit']();
      tick(500);

      expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ cardNumber: '' }));
    }));

    it('should not submit while the form is invalid', fakeAsync(() => {
      const fixture = setup();

      fixture.componentInstance['onSubmit']();
      tick(500);

      expect(fixture.componentInstance['isSubmitting']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));
  });

  describe('inline account creation', () => {
    it('should force account creation when there are no accounts', () => {
      const fixture = setup(null, []);
      const component = fixture.componentInstance;

      expect(component['noAccountsAvailable']()).toBe(true);
      expect(component['isCreatingNewAccount']()).toBe(true);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cuenta nueva');
    });

    it('should toggle the inline account form on demand', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      expect(component['isCreatingNewAccount']()).toBe(false);
      component['toggleAccountCreation']();
      expect(component['showAccountCreation']()).toBe(true);
      expect(component['isCreatingNewAccount']()).toBe(true);
      component['toggleAccountCreation']();
      expect(component['isCreatingNewAccount']()).toBe(false);
    });

    it('should gate submission on the new account form instead of accountId', () => {
      const fixture = setup(null, []);
      const component = fixture.componentInstance;
      component.paymentForm.patchValue({ shortName: 'Efectivo' });

      expect(component['canSubmit']()).toBe(false);

      component.newAccountForm.patchValue({ name: 'Banorte', currentAmount: 100 });
      expect(component['canSubmit']()).toBe(true);

      component.newAccountForm.patchValue({ currentAmount: -5 });
      expect(component['canSubmit']()).toBe(false);

      component.newAccountForm.patchValue({ currentAmount: 0 });
      expect(component['canSubmit']()).toBe(true);
    });

    it('should create the account first, link it and close with the payment payload', fakeAsync(() => {
      const fixture = setup(null, []);
      const component = fixture.componentInstance;
      component.paymentForm.patchValue({ shortName: 'Efectivo', method: PAYMENT_METHODS.CASH });
      component.newAccountForm.patchValue({ name: '  Banorte  ', currentAmount: 500 });
      accountsApi.createAccount.mockReturnValue(of({ ...accountFixture, id: 'acc-9', name: 'Banorte' }));

      component['onSubmit']();

      expect(accountsApi.createAccount).toHaveBeenCalledTimes(1);
      const accountPayload = accountsApi.createAccount.mock.calls[0][0];
      expect(accountPayload.name).toBe('Banorte');
      expect(accountPayload.currentAmount).toBe(500);
      expect(DEFAULT_ACCOUNT_COLORS).toContain(accountPayload.colorPalette);
      expect(accountsState.loadAccounts).toHaveBeenCalledTimes(2); // ngOnInit + after creation
      expect(toast.success).toHaveBeenCalledWith('Cuenta "Banorte" creada');

      tick(500);

      expect(dialogRef.close).toHaveBeenCalledWith({
        shortName: 'Efectivo',
        method: PAYMENT_METHODS.CASH,
        accountId: 'acc-9',
        backgroundColor: CARD_GRADIENTS[0].primary,
        cardNumber: ''
      });
    }));

    it('should toast in Spanish and stay open when the account creation fails', fakeAsync(() => {
      const fixture = setup(null, []);
      const component = fixture.componentInstance;
      component.paymentForm.patchValue({ shortName: 'Efectivo' });
      component.newAccountForm.patchValue({ name: 'Banorte', currentAmount: 0 });
      accountsApi.createAccount.mockReturnValue(throwError(() => new Error('boom')));

      component['onSubmit']();
      tick(500);

      expect(toast.error).toHaveBeenCalledWith('Error al crear la cuenta');
      expect(component['isSubmitting']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));
  });

  describe('edit mode', () => {
    it('should patch the form from the payment method', () => {
      const fixture = setup(paymentMethodFixture);
      const component = fixture.componentInstance;

      expect(component['isEditMode']()).toBe(true);
      expect(component['modalTitle']()).toBe('Editar método de pago');
      expect(component.paymentForm.value).toEqual({
        shortName: 'Visa Oro',
        method: PAYMENT_METHODS.CREDIT_CARD,
        cardNumber: '4521',
        accountId: 'acc-1',
        backgroundColor: '#004369'
      });
      expect(component['selectedColor']()).toBe('#004369');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Actualizar');
    });

    it('should fall back to the first gradient when the method has no color', () => {
      const fixture = setup({ ...paymentMethodFixture, backgroundColor: null, cardNumber: null });
      const component = fixture.componentInstance;

      expect(component.paymentForm.get('backgroundColor')!.value).toBe(CARD_GRADIENTS[0].primary);
      expect(component['selectedColor']()).toBe(CARD_GRADIENTS[0].primary);
      expect(component.paymentForm.get('cardNumber')!.value).toBe('');
    });

    it('should include the id in the emitted payload on submit', fakeAsync(() => {
      const fixture = setup(paymentMethodFixture);
      fixture.componentInstance.paymentForm.patchValue({ shortName: 'Visa Platino' });

      fixture.componentInstance['onSubmit']();
      tick(500);

      expect(dialogRef.close).toHaveBeenCalledWith({
        id: 'pm-1',
        shortName: 'Visa Platino',
        method: PAYMENT_METHODS.CREDIT_CARD,
        accountId: 'acc-1',
        backgroundColor: '#004369',
        cardNumber: '4521'
      });
    }));
  });

  describe('helpers', () => {
    it('should sync the selected color into the form', () => {
      const fixture = setup();

      fixture.componentInstance['selectColor']('#9477E0');

      expect(fixture.componentInstance['selectedColor']()).toBe('#9477E0');
      expect(fixture.componentInstance.paymentForm.get('backgroundColor')!.value).toBe('#9477E0');
    });

    it('should detect light and dark colors', () => {
      const fixture = setup();

      expect(fixture.componentInstance['isLightColor']('#ffffff')).toBe(true);
      expect(fixture.componentInstance['isLightColor']('#e4cf83')).toBe(true);
      expect(fixture.componentInstance['isLightColor']('#222222')).toBe(false);
    });

    it('should resolve the Spanish label of the selected method', () => {
      const fixture = setup();
      const component = fixture.componentInstance;

      expect(component['selectedMethodLabel']()).toBe('Tarjeta de Crédito');

      component.paymentForm.get('method')!.setValue(PAYMENT_METHODS.DIGITAL_WALLET);
      expect(component['selectedMethodLabel']()).toBe('Billetera Digital');
    });
  });

  it('should close with null on cancel', () => {
    const fixture = setup();

    fixture.componentInstance['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
