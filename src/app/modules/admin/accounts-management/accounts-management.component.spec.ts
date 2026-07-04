import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of } from 'rxjs';

import { AccountsManagementComponent } from './accounts-management.component';
import { AccountCardGridComponent } from './components/account-card-grid/account-card-grid.component';
import { AccountFormModalComponent } from './modals/account-form-modal/account-form-modal.component';
import { AccountsStateService } from './services/state/accounts-state.service';
import { IAccount, IAccountCreate } from '@shared/interfaces/account.model';

const accountFixture: IAccount = {
  id: 'a-1',
  name: 'Bancomer',
  currentAmount: 1500,
  value: 0,
  showSection: false,
  colorPalette: '#3570B4',
  isPrimary: false,
  disable: false,
  ownerId: 'u-1'
};

const createPayload: IAccountCreate = {
  name: 'Nu',
  currentAmount: 500,
  colorPalette: '#6200a3'
};

const createAccountsStateMock = () => ({
  accounts: signal<IAccount[]>([accountFixture]),
  loading: signal(false),
  error: signal<string | null>(null),
  isEmpty: signal(false),
  loadAccounts: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  toggleAccountStatus: jest.fn()
});

describe('AccountsManagementComponent', () => {
  let fixture: ComponentFixture<AccountsManagementComponent>;
  let component: AccountsManagementComponent;
  let accountsState: ReturnType<typeof createAccountsStateMock>;
  let dialog: { open: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let dialogResult: unknown;
  let confirmResult: unknown;

  beforeEach(() => {
    dialogResult = undefined;
    confirmResult = undefined;

    accountsState = createAccountsStateMock();
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };

    TestBed.configureTestingModule({
      imports: [AccountsManagementComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AccountsStateService, useValue: accountsState },
        { provide: MatDialog, useValue: dialog },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation }
      ]
    });

    // MatDialogModule (imported by the component) provides its own MatDialog,
    // which shadows TestBed-level providers; overrideProvider wins everywhere.
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(AccountsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('initialization', () => {
    it('should load the accounts on init and render the Spanish header', () => {
      createComponent();

      expect(accountsState.loadAccounts).toHaveBeenCalledTimes(1);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Cuentas y métodos de pago');
      expect(text).toContain('cuentas');
      expect(text).toContain('Nueva cuenta');
    });
  });

  describe('view states', () => {
    it('should show the loading skeleton instead of the grid while loading', () => {
      accountsState.loading.set(true);
      accountsState.isEmpty.set(false);

      createComponent();

      expect(fixture.nativeElement.querySelector('.animate-pulse')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-account-card-grid')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('No hay cuentas registradas');
    });

    it('should show the empty state with its create call to action', () => {
      accountsState.accounts.set([]);
      accountsState.isEmpty.set(true);

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay cuentas registradas');
      expect(text).toContain('Comienza creando tu primera cuenta financiera');
      expect(text).toContain('Crear primera cuenta');
      expect(fixture.nativeElement.querySelector('app-account-card-grid')).toBeNull();
    });

    it('should render the card grid with the accounts bound when there is data', () => {
      createComponent();

      const grid = fixture.debugElement.query(By.directive(AccountCardGridComponent));
      expect(grid).not.toBeNull();
      expect((grid.componentInstance as AccountCardGridComponent).accounts()).toEqual([accountFixture]);
    });
  });

  describe('create flow', () => {
    it('should open the form modal from the header button with a null payload', () => {
      createComponent();

      const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      buttons.find(b => (b.textContent ?? '').includes('Nueva cuenta'))!.click();

      expect(dialog.open).toHaveBeenCalledWith(AccountFormModalComponent, {
        width: '420px',
        disableClose: true,
        data: null
      });
    });

    it('should ask for the Spanish balance confirmation and create after "confirmed"', () => {
      dialogResult = createPayload;
      confirmResult = 'confirmed';

      createComponent();
      component['openCreateModal']();

      expect(magueyConfirmation.open).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Confirmar saldo inicial',
        message: expect.stringContaining('saldo inicial no podrá ser modificado manualmente'),
        actions: expect.objectContaining({
          confirm: expect.objectContaining({ label: 'Confirmar y crear' }),
          cancel: expect.objectContaining({ label: 'Cancelar' })
        })
      }));
      expect(accountsState.createAccount).toHaveBeenCalledWith(createPayload);
    });

    it('should not create the account when the confirmation is cancelled', () => {
      dialogResult = createPayload;
      confirmResult = 'cancelled';

      createComponent();
      component['openCreateModal']();

      expect(magueyConfirmation.open).toHaveBeenCalledTimes(1);
      expect(accountsState.createAccount).not.toHaveBeenCalled();
    });

    it('should skip the confirmation entirely when the modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component['openCreateModal']();

      expect(magueyConfirmation.open).not.toHaveBeenCalled();
      expect(accountsState.createAccount).not.toHaveBeenCalled();
    });
  });

  describe('edit flow', () => {
    it('should open the form modal with the account and update on close', () => {
      dialogResult = { name: 'Bancomer Azul', colorPalette: '#009ee3' };

      createComponent();
      component['openEditModal'](accountFixture);

      expect(dialog.open).toHaveBeenCalledWith(AccountFormModalComponent, {
        width: '420px',
        disableClose: true,
        data: accountFixture
      });
      expect(accountsState.updateAccount).toHaveBeenCalledWith('a-1', {
        name: 'Bancomer Azul',
        colorPalette: '#009ee3'
      });
    });

    it('should not update anything when the edit modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component['openEditModal'](accountFixture);

      expect(accountsState.updateAccount).not.toHaveBeenCalled();
    });
  });

  describe('toggle status', () => {
    it('should delegate to the state service with the account id', () => {
      createComponent();

      component['onToggleStatus'](accountFixture);

      expect(accountsState.toggleAccountStatus).toHaveBeenCalledWith('a-1');
    });
  });

  describe('grid output wiring', () => {
    it('should open the edit modal when the grid emits editAccount', () => {
      createComponent();

      const grid = fixture.debugElement.query(By.directive(AccountCardGridComponent))
        .componentInstance as AccountCardGridComponent;
      grid.editAccount.emit(accountFixture);

      expect(dialog.open).toHaveBeenCalledWith(AccountFormModalComponent, expect.objectContaining({
        data: accountFixture
      }));
    });

    it('should toggle the account status when the grid emits toggleStatus', () => {
      createComponent();

      const grid = fixture.debugElement.query(By.directive(AccountCardGridComponent))
        .componentInstance as AccountCardGridComponent;
      grid.toggleStatus.emit(accountFixture);

      expect(accountsState.toggleAccountStatus).toHaveBeenCalledWith('a-1');
    });
  });
});
