import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { es } from 'date-fns/locale';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { AccountTransferModalComponent } from './account-transfer-modal.component';
import { AccountsService } from '../accounts.service';
import { CommonService } from '@shared/services/common.service';
import { IAccount } from '@shared/interfaces/account.model';

const makeAccount = (overrides: Partial<IAccount> = {}): IAccount => ({
  id: 'a-1',
  name: 'BBVA',
  currentAmount: 1000,
  value: 1000,
  showSection: true,
  colorPalette: '#3570B4',
  isPrimary: true,
  disable: false,
  ownerId: 'u-1',
  ...overrides
});

describe('AccountTransferModalComponent', () => {
  let fixture: ComponentFixture<AccountTransferModalComponent>;
  let component: AccountTransferModalComponent;

  let accountsApi: { accountTransfer: jest.Mock };
  let common: { combineDateAndTime: jest.Mock };
  let dialogRef: { close: jest.Mock };
  let toast: { observe: jest.Mock };

  const accounts: IAccount[] = [
    makeAccount(),
    makeAccount({ id: 'a-2', name: 'Nu', currentAmount: 500 }),
    makeAccount({ id: 'a-3', name: 'Efectivo', currentAmount: 200 })
  ];

  function setup(preSelectedAccountId = 'a-1'): void {
    accountsApi = { accountTransfer: jest.fn() };
    common = { combineDateAndTime: jest.fn().mockReturnValue('2026-06-10T09:15:00.000Z') };
    dialogRef = { close: jest.fn() };
    toast = { observe: jest.fn(() => (source: unknown) => source) };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, MatMenuModule, NoopAnimationsModule, AccountTransferModalComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: es },
        { provide: AccountsService, useValue: accountsApi },
        { provide: CommonService, useValue: common },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: { accounts, preSelectedAccountId } }
    ]
});

    fixture = TestBed.createComponent(AccountTransferModalComponent);
    component = fixture.componentInstance;
  }

  function init(preSelectedAccountId = 'a-1'): void {
    // The form is built in a field initializer, so creating the component is enough
    setup(preSelectedAccountId);
  }

  describe('initialization', () => {
    it('should resolve the source account and exclude it from the destinations', () => {
      init();

      expect(component.sourceAccount()).toEqual(accounts[0]);
      expect(component.destinationAccounts().map(a => a.id)).toEqual(['a-2', 'a-3']);
    });

    it('should build the form with the source account and the current time', () => {
      init();
      const value = component.transferForm.value;

      expect(value.sourceAccountId).toBe('a-1');
      expect(value.destinyAccountId).toBeNull();
      expect(value.movementDate).toBeInstanceOf(Date);
      expect(value.movementTime).toMatch(/^\d{2}:\d{2}$/);
      expect(value.amount).toBeNull();
      expect(component.transferForm.invalid).toBe(true);
    });

    it('should treat any amount as insufficient when the pre-selected account is unknown', () => {
      init('unknown');

      expect(component.sourceAccount()).toBeNull();
      expect(component.destinationAccounts()).toHaveLength(3);

      component.transferForm.patchValue({ amount: 1 });
      expect(component.hasInsufficientFunds()).toBe(true);
      expect(component.newBalance()).toBe(-1);
    });
  });

  describe('form validation', () => {
    it('should reject amounts below 0.01', () => {
      init();
      component.transferForm.patchValue({ destinyAccountId: 'a-2' });
      const amount = component.transferForm.get('amount')!;

      amount.setValue(0);
      expect(amount.invalid).toBe(true);

      amount.setValue(0.01);
      expect(component.transferForm.valid).toBe(true);
    });

    it('should require a destination account', () => {
      init();
      component.transferForm.patchValue({ amount: 100 });

      expect(component.transferForm.get('destinyAccountId')!.invalid).toBe(true);
      expect(component.transferForm.invalid).toBe(true);
    });
  });

  describe('derived values', () => {
    it('should preview the new source balance', () => {
      init();

      expect(component.newBalance()).toBe(1000);

      component.transferForm.patchValue({ amount: 250 });
      expect(component.newBalance()).toBe(750);
    });

    it('should flag insufficient funds only above the source balance', () => {
      init();

      component.transferForm.patchValue({ amount: 1500 });
      expect(component.hasInsufficientFunds()).toBe(true);

      component.transferForm.patchValue({ amount: 1000 });
      expect(component.hasInsufficientFunds()).toBe(false);
    });
  });

  describe('save', () => {
    function fillValidForm(): void {
      component.transferForm.patchValue({
        destinyAccountId: 'a-2',
        movementDate: new Date(2026, 5, 10),
        movementTime: '09:15',
        amount: 300
      });
    }

    it('should not call the API when the form is invalid', () => {
      init();

      component.save();

      expect(accountsApi.accountTransfer).not.toHaveBeenCalled();
      expect(component.transferForm.enabled).toBe(true);
    });

    it('should not call the API when funds are insufficient', () => {
      init();
      fillValidForm();
      component.transferForm.patchValue({ amount: 1500 });

      component.save();

      expect(component.transferForm.valid).toBe(true);
      expect(accountsApi.accountTransfer).not.toHaveBeenCalled();
    });

    it('should disable the form, send the transfer payload and close with the response', fakeAsync(() => {
      init();
      fillValidForm();
      const response = { ok: true };
      accountsApi.accountTransfer.mockReturnValue(of(response));

      component.save();

      expect(component.transferForm.disabled).toBe(true);
      expect(common.combineDateAndTime).toHaveBeenCalledWith(new Date(2026, 5, 10), '09:15');
      expect(accountsApi.accountTransfer).toHaveBeenCalledWith({
        sourceAccountId: 'a-1',
        destinyAccountId: 'a-2',
        movementDate: '2026-06-10T09:15:00.000Z',
        movementTime: '09:15',
        amount: 300,
        comment: null,
        movementType: 'transfer'
      });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Procesando...',
        success: 'Transferencia realizada',
        error: 'Error en la transferencia'
      });

      expect(dialogRef.close).not.toHaveBeenCalled();
      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith(response);
    }));

    it('should log the failure, re-enable the form and close with the error', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init();
      fillValidForm();
      const failure = new Error('offline');
      accountsApi.accountTransfer.mockReturnValue(throwError(() => failure));

      component.save();
      tick(500);

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(component.transferForm.enabled).toBe(true);
      expect(dialogRef.close).toHaveBeenCalledWith(failure);
      consoleSpy.mockRestore();
    }));
  });

  it('should close the dialog without a result on cancel', () => {
    init();

    component.closeDialog();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  describe('account selectors (handoff accfields)', () => {
    it('selectSource clears the destination when both would collide', () => {
      init();
      component.transferForm.patchValue({ destinyAccountId: 'a-2' });

      component['selectSource']('a-2');

      expect(component.transferForm.value.sourceAccountId).toBe('a-2');
      expect(component.transferForm.value.destinyAccountId).toBeNull();
      expect(component.destinationAccounts().map(a => a.id)).toEqual(['a-1', 'a-3']);
    });

    it('selectDestination sets the destination and resolves the account', () => {
      init();

      component['selectDestination']('a-3');

      expect(component.destinationAccount()?.id).toBe('a-3');
    });

    it('swapAccounts exchanges both sides and no-ops without a destination', () => {
      init();

      component['swapAccounts']();
      expect(component.transferForm.value.sourceAccountId).toBe('a-1');

      component.transferForm.patchValue({ destinyAccountId: 'a-2' });
      component['swapAccounts']();

      expect(component.transferForm.value.sourceAccountId).toBe('a-2');
      expect(component.transferForm.value.destinyAccountId).toBe('a-1');
    });

    it('transferAll copies the source balance into the amount', () => {
      init();

      component['transferAll']();

      expect(component.transferForm.value.amount).toBe(1000);
    });
  });

});
