import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of } from 'rxjs';

import { PaymentMethodsComponent } from './payment-methods.component';
import { PaymentMethodCardGridComponent } from './components/payment-method-card-grid/payment-method-card-grid.component';
import { PaymentMethodFormModalComponent } from './modals/payment-method-form-modal/payment-method-form-modal.component';
import { PaymentMethodsStateService } from './services/state/payment-methods-state.service';
import { CommonService } from '@shared/services/common.service';
import { IPaymentMethod } from '@shared/interfaces/payment-method.model';

const paymentMethodFixture: IPaymentMethod = {
  id: 'pm-1',
  shortName: 'Visa Oro',
  method: 'credit',
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

const deleteConfirmationConfig = { title: 'Remove payment method' };

const createPaymentMethodsStateMock = () => ({
  paymentMethods: signal<IPaymentMethod[]>([paymentMethodFixture]),
  loading: signal(false),
  error: signal<string | null>(null),
  isEmpty: signal(false),
  loadPaymentMethods: jest.fn(),
  createPaymentMethod: jest.fn(),
  updatePaymentMethod: jest.fn(),
  deletePaymentMethod: jest.fn(),
  togglePaymentMethodStatus: jest.fn()
});

describe('PaymentMethodsComponent', () => {
  let fixture: ComponentFixture<PaymentMethodsComponent>;
  let component: PaymentMethodsComponent;
  let paymentMethodsState: ReturnType<typeof createPaymentMethodsStateMock>;
  let dialog: { open: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let common: { getDefaultDeleteConfirmation: jest.Mock };
  let dialogResult: unknown;
  let confirmResult: unknown;

  beforeEach(() => {
    dialogResult = undefined;
    confirmResult = undefined;

    paymentMethodsState = createPaymentMethodsStateMock();
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    common = { getDefaultDeleteConfirmation: jest.fn().mockReturnValue(deleteConfirmationConfig) };

    TestBed.configureTestingModule({
      imports: [PaymentMethodsComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: PaymentMethodsStateService, useValue: paymentMethodsState },
        { provide: MatDialog, useValue: dialog },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: CommonService, useValue: common }
      ]
    });

    // MatDialogModule (imported by the component) provides its own MatDialog,
    // which shadows TestBed-level providers; overrideProvider wins everywhere.
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(PaymentMethodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('initialization', () => {
    it('should load the payment methods on init and render the Spanish header', () => {
      createComponent();

      expect(paymentMethodsState.loadPaymentMethods).toHaveBeenCalledTimes(1);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Cuentas y métodos de pago');
      expect(text).toContain('métodos de pago');
      expect(text).toContain('Nuevo método');
    });
  });

  describe('view states', () => {
    it('should show the loading skeleton instead of the grid while loading', () => {
      paymentMethodsState.loading.set(true);
      paymentMethodsState.isEmpty.set(false);

      createComponent();

      expect(fixture.nativeElement.querySelector('.animate-pulse')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-payment-method-card-grid')).toBeNull();
    });

    it('should show the empty state with its create call to action', () => {
      paymentMethodsState.paymentMethods.set([]);
      paymentMethodsState.isEmpty.set(true);

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay métodos de pago registrados');
      expect(text).toContain('Comienza agregando tu primer método de pago');
      expect(text).toContain('Crear primer método');
      expect(fixture.nativeElement.querySelector('app-payment-method-card-grid')).toBeNull();
    });

    it('should render the card grid with the payment methods bound when there is data', () => {
      createComponent();

      const grid = fixture.debugElement.query(By.directive(PaymentMethodCardGridComponent));
      expect(grid).not.toBeNull();
      const gridInstance = grid.componentInstance as PaymentMethodCardGridComponent;
      expect(gridInstance.paymentMethods()).toEqual([paymentMethodFixture]);
      expect(gridInstance.loading()).toBe(false);
    });
  });

  describe('create flow', () => {
    it('should open the form modal from the header button with a null payload', () => {
      createComponent();

      const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      buttons.find(b => (b.textContent ?? '').includes('Nuevo método'))!.click();

      expect(dialog.open).toHaveBeenCalledWith(PaymentMethodFormModalComponent, {
        width: '460px',
        disableClose: true,
        data: null
      });
    });

    it('should create the payment method with the modal result', () => {
      dialogResult = { shortName: 'Nu Débito', method: 'debit', accountId: 'acc-1', backgroundColor: '#222e3d', cardNumber: '' };

      createComponent();
      component['openCreateModal']();

      expect(paymentMethodsState.createPaymentMethod).toHaveBeenCalledWith(dialogResult);
    });

    it('should not create anything when the modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component['openCreateModal']();

      expect(paymentMethodsState.createPaymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('edit flow', () => {
    it('should open the form modal with the payment method and update on close', () => {
      dialogResult = { id: 'pm-1', shortName: 'Visa Platino', method: 'credit', accountId: 'acc-1', backgroundColor: '#222222', cardNumber: '4521' };

      createComponent();
      component['openEditModal'](paymentMethodFixture);

      expect(dialog.open).toHaveBeenCalledWith(PaymentMethodFormModalComponent, {
        width: '460px',
        disableClose: true,
        data: paymentMethodFixture
      });
      expect(paymentMethodsState.updatePaymentMethod).toHaveBeenCalledWith('pm-1', dialogResult);
    });

    it('should not update anything when the edit modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component['openEditModal'](paymentMethodFixture);

      expect(paymentMethodsState.updatePaymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('toggle status', () => {
    it('should delegate to the state service with the payment method id', () => {
      createComponent();

      component['onToggleStatus'](paymentMethodFixture);

      expect(paymentMethodsState.togglePaymentMethodStatus).toHaveBeenCalledWith('pm-1');
    });
  });

  describe('delete flow', () => {
    it('should open the shared delete confirmation and delete after "confirmed"', () => {
      confirmResult = 'confirmed';

      createComponent();
      component['onDeletePaymentMethod'](paymentMethodFixture);

      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'payment method' });
      expect(magueyConfirmation.open).toHaveBeenCalledWith(deleteConfirmationConfig);
      expect(paymentMethodsState.deletePaymentMethod).toHaveBeenCalledWith('pm-1');
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component['onDeletePaymentMethod'](paymentMethodFixture);

      expect(magueyConfirmation.open).toHaveBeenCalledTimes(1);
      expect(paymentMethodsState.deletePaymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('grid output wiring', () => {
    it('should route the grid outputs to the edit, delete and toggle handlers', () => {
      confirmResult = 'confirmed';

      createComponent();
      const grid = fixture.debugElement.query(By.directive(PaymentMethodCardGridComponent))
        .componentInstance as PaymentMethodCardGridComponent;

      grid.edit.emit(paymentMethodFixture);
      expect(dialog.open).toHaveBeenCalledWith(PaymentMethodFormModalComponent, expect.objectContaining({
        data: paymentMethodFixture
      }));

      grid.toggleStatus.emit(paymentMethodFixture);
      expect(paymentMethodsState.togglePaymentMethodStatus).toHaveBeenCalledWith('pm-1');

      grid.delete.emit(paymentMethodFixture);
      expect(paymentMethodsState.deletePaymentMethod).toHaveBeenCalledWith('pm-1');
    });
  });
});
