import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of, throwError } from 'rxjs';

import { AccountSectionModalComponent } from './account-section-modal.component';
import { AccountsService } from '../accounts.service';
import { CommonService } from '@shared/services/common.service';
import { IAccount, IAccountSection } from '@shared/interfaces/account.model';

const makeAccount = (overrides: Partial<IAccount> = {}): IAccount => ({
  id: 'a-1',
  name: 'BBVA',
  currentAmount: 5697.43,
  value: 5697.43,
  showSection: true,
  colorPalette: '#3570B4',
  isPrimary: true,
  disable: false,
  ownerId: 'u-1',
  ...overrides
});

const makeSection = (overrides: Partial<IAccountSection> = {}): IAccountSection => ({
  id: 's-1',
  name: 'Fondo de emergencia',
  comments: '',
  currentAmount: 3500,
  targetAmount: 5000,
  ...overrides
});

describe('AccountSectionModalComponent', () => {
  let fixture: ComponentFixture<AccountSectionModalComponent>;
  let component: AccountSectionModalComponent;

  let accountsApi: {
    getAccountSections: jest.Mock;
    updateSection: jest.Mock;
    createSection: jest.Mock;
    updateSectionDetails: jest.Mock;
    deleteSection: jest.Mock;
  };
  let common: { combineDateAndTime: jest.Mock; getDefaultDeleteConfirmation: jest.Mock };
  let confirmation: { open: jest.Mock };
  let dialogRef: { close: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };

  let accounts: IAccount[];
  let sections: IAccountSection[];

  function init(): void {
    accounts = [makeAccount(), makeAccount({ id: 'a-2', name: 'Nu' })];
    sections = [
      makeSection(),
      makeSection({ id: 's-2', name: 'Vacaciones diciembre', currentAmount: 1600, targetAmount: 5000 }),
      makeSection({ id: 's-3', name: 'Servicio del auto', currentAmount: 600, targetAmount: null })
    ];
    accountsApi = {
      getAccountSections: jest.fn().mockReturnValue(of(sections)),
      updateSection: jest.fn(),
      createSection: jest.fn(),
      updateSectionDetails: jest.fn(),
      deleteSection: jest.fn()
    };
    common = {
      combineDateAndTime: jest.fn().mockReturnValue('2026-07-02T12:00:00.000Z'),
      getDefaultDeleteConfirmation: jest.fn().mockReturnValue({ title: 'Eliminar apartado' })
    };
    confirmation = { open: jest.fn().mockReturnValue({ afterClosed: () => of('confirmed') }) };
    dialogRef = { close: jest.fn() };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, AccountSectionModalComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: AccountsService, useValue: accountsApi },
        { provide: CommonService, useValue: common },
        { provide: MagueyConfirmationService, useValue: confirmation },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: { accounts, preSelectedAccountId: 'a-1' } }
    ]
});

    fixture = TestBed.createComponent(AccountSectionModalComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  }

  describe('initialization', () => {
    it('should resolve the account and load its sections', () => {
      init();

      expect(component.account()).toBe(accounts[0]);
      expect(accountsApi.getAccountSections).toHaveBeenCalledWith('a-1');
      expect(component.sections()).toHaveLength(3);
      expect(component.isLoading()).toBe(false);
    });

    it('should compute apartado, disponible and saldo totals', () => {
      init();

      expect(component.apartadoTotal()).toBe(5700);
      expect(component.disponible()).toBe(5697.43);
      expect(component.saldoTotal()).toBeCloseTo(11397.43);
    });

    it('should build split segments proportional to the total saldo', () => {
      init();

      const segments = component.splitSegments();
      expect(segments).toHaveLength(3);
      expect(segments[0].width).toBeCloseTo((3500 / 11397.43) * 100);
    });
  });

  describe('progress', () => {
    it('should compute percent capped at 100 and describe the goal', () => {
      init();

      expect(component.progressPercent(sections[0])).toBe(70);
      expect(component.progressMeta(sections[0])).toBe('$3,500.00 de $5,000.00 · 70%');
      expect(component.progressMeta(makeSection({ currentAmount: 600, targetAmount: 600 }))).toBe('$600.00 de $600.00 · completo');
    });

    it('should handle sections without a goal', () => {
      init();

      expect(component.progressPercent(sections[2])).toBeNull();
      expect(component.progressMeta(sections[2])).toBe('$600.00 · sin objetivo');
    });
  });

  describe('adjust (deposit / withdrawal)', () => {
    it('should limit deposits to the disponible and withdrawals to the section balance', () => {
      init();
      component.toggleAdjust(sections[0]);

      component.setAdjustType('deposit');
      expect(component.adjustMax(sections[0])).toBe(5697.43);

      component.setAdjustType('withdrawal');
      expect(component.adjustMax(sections[0])).toBe(3500);
    });

    it('should register a deposit, update local balances and close the panel', () => {
      init();
      accountsApi.updateSection.mockReturnValue(of({ ...sections[1], currentAmount: 2100 }));
      component.toggleAdjust(sections[1]);
      component.adjustForm.patchValue({ movementType: 'deposit', amount: 500 });

      component.confirmAdjust(sections[1]);

      expect(accountsApi.updateSection).toHaveBeenCalledWith(expect.objectContaining({
        subAccountId: 's-2',
        accountId: 'a-1',
        amount: 500,
        movementType: 'deposit'
      }));
      expect(component.sections()[1].currentAmount).toBe(2100);
      expect(component.account().currentAmount).toBeCloseTo(5197.43);
      expect(component.adjustingId()).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Depósito registrado');
    });

    it('should not call the API when the amount exceeds the maximum', () => {
      init();
      component.toggleAdjust(sections[0]);
      component.adjustForm.patchValue({ movementType: 'withdrawal', amount: 9999 });

      component.confirmAdjust(sections[0]);

      expect(accountsApi.updateSection).not.toHaveBeenCalled();
    });
  });

  describe('edit details', () => {
    it('should save the new name and goal', () => {
      init();
      accountsApi.updateSectionDetails.mockReturnValue(of({ ...sections[0], name: 'Emergencias', targetAmount: 8000 }));
      component.toggleEdit(sections[0]);
      component.editForm.patchValue({ name: 'Emergencias', targetAmount: 8000 });

      component.saveEdit(sections[0]);

      expect(accountsApi.updateSectionDetails).toHaveBeenCalledWith('s-1', { name: 'Emergencias', targetAmount: 8000 });
      expect(component.sections()[0].name).toBe('Emergencias');
      expect(component.sections()[0].targetAmount).toBe(8000);
      expect(component.editingId()).toBeNull();
    });
  });

  describe('delete', () => {
    it('should ask for confirmation and return the balance to the disponible', () => {
      init();
      accountsApi.deleteSection.mockReturnValue(of(void 0));

      component.deleteSection(sections[2]);

      expect(confirmation.open).toHaveBeenCalled();
      expect(accountsApi.deleteSection).toHaveBeenCalledWith('s-3');
      expect(component.sections().map(s => s.id)).toEqual(['s-1', 's-2']);
      expect(component.account().currentAmount).toBeCloseTo(6297.43);
    });

    it('should do nothing when the confirmation is dismissed', () => {
      init();
      confirmation.open.mockReturnValue({ afterClosed: () => of('cancelled') });

      component.deleteSection(sections[0]);

      expect(accountsApi.deleteSection).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create the section with goal and initial deposit and update the disponible', () => {
      init();
      const created = makeSection({ id: 's-4', name: 'Aguinaldo', currentAmount: 700, targetAmount: 2000 });
      accountsApi.createSection.mockReturnValue(of(created));
      component.createForm.patchValue({ name: 'Aguinaldo', targetAmount: 2000, initialDeposit: 700 });

      component.createSection();

      expect(accountsApi.createSection).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'a-1',
        name: 'Aguinaldo',
        targetAmount: 2000,
        initialDeposit: 700
      }));
      expect(component.sections()).toHaveLength(4);
      expect(component.account().currentAmount).toBeCloseTo(4997.43);
      expect(toast.success).toHaveBeenCalledWith('Apartado "Aguinaldo" creado');
    });

    it('should reject an initial deposit above the disponible', () => {
      init();
      component.createForm.patchValue({ name: 'Aguinaldo', initialDeposit: 99999 });

      component.createSection();

      expect(accountsApi.createSection).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('El depósito inicial excede el disponible');
    });

    it('should surface API failures without mutating state', () => {
      init();
      accountsApi.createSection.mockReturnValue(throwError(() => new Error('offline')));
      component.createForm.patchValue({ name: 'Aguinaldo' });

      component.createSection();

      expect(component.sections()).toHaveLength(3);
      expect(toast.error).toHaveBeenCalledWith('Error al crear el apartado');
    });
  });

  describe('close', () => {
    it('should close without result when nothing changed', () => {
      init();

      component.closeDialog();

      expect(dialogRef.close).toHaveBeenCalledWith(undefined);
    });

    it('should close with true after a change so the dashboard reloads', () => {
      init();
      accountsApi.deleteSection.mockReturnValue(of(void 0));
      component.deleteSection(sections[0]);

      component.closeDialog();

      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });
  });

  describe('error paths and toggles', () => {
    it('toasts and clears loading when sections fail to load', () => {
      init();
      accountsApi.getAccountSections.mockReturnValue(throwError(() => new Error('boom')));

      component['loadSections']();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar los apartados');
      expect(component.isLoading()).toBe(false);
    });

    it('toasts when a movement fails and re-enables saving', () => {
      init();
      accountsApi.updateSection.mockReturnValue(throwError(() => new Error('boom')));
      component.toggleAdjust(sections[0]);
      component.adjustForm.patchValue({ amount: 100 });

      component.confirmAdjust(sections[0]);

      expect(toast.error).toHaveBeenCalledWith('Error al registrar el movimiento');
      expect(component.isSaving()).toBe(false);
    });

    it('toggleAdjust closes an open panel and closes the edit panel when opening', () => {
      init();

      component.toggleEdit(sections[0]);
      component.toggleAdjust(sections[0]);
      expect(component.editingId()).toBeNull();
      expect(component.adjustingId()).toBe(sections[0].id);

      component.toggleAdjust(sections[0]);
      expect(component.adjustingId()).toBeNull();

      component.toggleEdit(sections[0]);
      component.toggleEdit(sections[0]);
      expect(component.editingId()).toBeNull();
    });

    it('previews deposits and withdrawals against the section balance', () => {
      init();
      component.toggleAdjust(sections[0]);

      component.adjustForm.patchValue({ movementType: 'deposit', amount: 300 });
      expect(component.adjustPreview(sections[0])).toBe(Number(sections[0].currentAmount) + 300);

      component.adjustForm.patchValue({ movementType: 'withdrawal', amount: 200 });
      expect(component.adjustPreview(sections[0])).toBe(Number(sections[0].currentAmount) - 200);
    });

    it('splitSegments returns nothing without balance and weighted widths with one', () => {
      init();

      const segments = component.splitSegments();
      expect(segments.length).toBeGreaterThan(0);
      const totalWidth = segments.reduce((sum, seg) => sum + seg.width, 0);
      expect(totalWidth).toBeLessThanOrEqual(100.01);
    });
  });

});
