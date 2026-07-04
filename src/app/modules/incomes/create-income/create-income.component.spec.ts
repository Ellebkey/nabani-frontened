import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { es } from 'date-fns/locale';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { CreateIncomeComponent } from './create-income.component';
import { IncomesService } from '../incomes.service';
import { AccountsService } from '@app/modules/accounts/accounts.service';
import { CommonService } from '@shared/services/common.service';

describe('CreateIncomeComponent', () => {
  let fixture: ComponentFixture<CreateIncomeComponent>;
  let component: CreateIncomeComponent;

  let incomesApi: { saveIncome: jest.Mock; updateIncome: jest.Mock };
  let accountsApi: { getAccounts: jest.Mock };
  let common: { combineDateAndTime: jest.Mock };
  let dialogRef: { close: jest.Mock };
  let toast: { observe: jest.Mock };

  const combinedDate = '2026-06-08T18:45:00.000Z';

  const templateData = () => ({
    id: 12,
    accountId: 'acc-1',
    concept: 'Nomina',
    totalAmount: 1500,
    comment: 'Quincena',
    incomeDate: '2026-06-08T18:45:00'
  });

  function setup(data: unknown = null): void {
    incomesApi = {
      saveIncome: jest.fn(),
      updateIncome: jest.fn()
    };
    accountsApi = {
      getAccounts: jest.fn().mockReturnValue(of({ rows: [{ id: 'acc-1', name: 'BBVA' }] }))
    };
    common = { combineDateAndTime: jest.fn().mockReturnValue(combinedDate) };
    dialogRef = { close: jest.fn() };
    toast = { observe: jest.fn(() => (source: unknown) => source) };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, FormsModule, CreateIncomeComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: es },
        { provide: IncomesService, useValue: incomesApi },
        { provide: AccountsService, useValue: accountsApi },
        { provide: CommonService, useValue: common },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: data }
    ]
});

    fixture = TestBed.createComponent(CreateIncomeComponent);
    component = fixture.componentInstance;
  }

  function init(data: unknown = null): void {
    setup(data);
    component.ngOnInit();
  }

  describe('create mode (no dialog data)', () => {
    it('should initialize an empty form with the current time and load the accounts', () => {
      init(null);

      expect(component.isEditMode()).toBe(false);
      expect(component.title()).toBe('Registrar ingreso');
      expect(component.createIncomeForm.value).toEqual(
        expect.objectContaining({
          accountId: null,
          concept: null,
          incomeDate: null,
          totalAmount: null,
          comment: null
        })
      );
      expect(component.createIncomeForm.value.incomeTime).toMatch(/^\d{2}:\d{2}$/);
      expect(component.createIncomeForm.invalid).toBe(true);
      expect(accountsApi.getAccounts).toHaveBeenCalledTimes(1);
      expect(component.accounts()).toEqual([{ id: 'acc-1', name: 'BBVA' }]);
    });

    it('should expose the fixed Spanish concept catalog', () => {
      init(null);

      expect(component.concepts.map(concept => concept.id)).toEqual(['Nomina', 'Freelance', 'Otros']);
    });

    it('should require every field before becoming valid', () => {
      init(null);
      const form = component.createIncomeForm;

      form.patchValue({
        accountId: 'acc-1',
        concept: 'Nomina',
        incomeDate: new Date(2026, 5, 8),
        incomeTime: '18:45',
        totalAmount: 1500
      });
      // El comentario es opcional (mockup modal-registro: "Opcional")
      expect(form.valid).toBe(true);

      form.get('comment')!.setValue('Quincena');
      expect(form.valid).toBe(true);

      form.get('totalAmount')!.setValue(null);
      expect(form.invalid).toBe(true);
    });
  });

  describe('template mode (data without isEditMode)', () => {
    it('should stay in create mode but patch the form from the template income', () => {
      init(templateData());

      expect(component.isEditMode()).toBe(false);
      expect(component.title()).toBe('Registrar ingreso');
      expect(component.createIncomeForm.value).toEqual(
        expect.objectContaining({
          accountId: 'acc-1',
          concept: 'Nomina',
          totalAmount: 1500,
          comment: 'Quincena',
          incomeDate: new Date('2026-06-08T18:45:00'),
          incomeTime: '18:45'
        })
      );
    });

    it('should keep the current time and a null date when the template has no incomeDate', () => {
      init({ ...templateData(), incomeDate: null });

      expect(component.createIncomeForm.value.incomeDate).toBeNull();
      expect(component.createIncomeForm.value.incomeTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('edit mode', () => {
    it('should switch the title and flag when the data is marked as edit', () => {
      init({ ...templateData(), isEditMode: true });

      expect(component.isEditMode()).toBe(true);
      expect(component.title()).toBe('Actualizar ingreso');
      expect(component.createIncomeForm.value.accountId).toBe('acc-1');
      expect(component.createIncomeForm.valid).toBe(true);
    });
  });

  describe('save', () => {
    function fillValidForm(): void {
      component.createIncomeForm.patchValue({
        accountId: 'acc-1',
        concept: 'Nomina',
        incomeDate: new Date(2026, 5, 8),
        incomeTime: '18:45',
        totalAmount: 1500,
        comment: 'Quincena'
      });
    }

    it('should not call the API nor disable the form when invalid', () => {
      init(null);

      component.save();

      expect(incomesApi.saveIncome).not.toHaveBeenCalled();
      expect(incomesApi.updateIncome).not.toHaveBeenCalled();
      expect(component.createIncomeForm.disabled).toBe(false);
    });

    it('should create the income with the combined date and close with the response', fakeAsync(() => {
      init(null);
      fillValidForm();
      incomesApi.saveIncome.mockReturnValue(of({ id: 99 }));

      component.save();

      expect(component.createIncomeForm.disabled).toBe(true);
      expect(common.combineDateAndTime).toHaveBeenCalledWith(new Date(2026, 5, 8), '18:45');
      expect(incomesApi.saveIncome).toHaveBeenCalledWith({
        accountId: 'acc-1',
        concept: 'Nomina',
        incomeDate: combinedDate,
        incomeTime: '18:45',
        totalAmount: 1500,
        comment: 'Quincena'
      });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando...',
        success: 'Ingreso creado exitosamente',
        error: 'Error al guardar el ingreso'
      });

      expect(dialogRef.close).not.toHaveBeenCalled();
      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 99 });
    }));

    it('should update the existing income in edit mode with the update messages', fakeAsync(() => {
      init({ ...templateData(), isEditMode: true });
      incomesApi.updateIncome.mockReturnValue(of({ id: 12 }));

      component.save();

      expect(incomesApi.updateIncome).toHaveBeenCalledTimes(1);
      const [id, payload] = incomesApi.updateIncome.mock.calls[0];
      expect(id).toBe(12);
      expect(payload).toEqual(
        expect.objectContaining({
          accountId: 'acc-1',
          concept: 'Nomina',
          incomeDate: combinedDate,
          totalAmount: 1500,
          comment: 'Quincena'
        })
      );
      expect(common.combineDateAndTime).toHaveBeenCalledWith(new Date('2026-06-08T18:45:00'), '18:45');
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Actualizando...',
        success: 'Ingreso actualizado exitosamente',
        error: 'Error al actualizar el ingreso'
      });
      expect(incomesApi.saveIncome).not.toHaveBeenCalled();

      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 12 });
    }));

    it('should log the failure and still close the dialog with the error', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init(null);
      fillValidForm();
      const failure = new Error('offline');
      incomesApi.saveIncome.mockReturnValue(throwError(() => failure));

      component.save();
      tick(500);

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(dialogRef.close).toHaveBeenCalledWith(failure);
      consoleSpy.mockRestore();
    }));
  });

  it('should close the dialog without a result on cancel', () => {
    init(null);

    component.closeDialog();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  describe('select options and inline errors', () => {
    it('maps accounts and concepts into compact-select options', () => {
      init();

      expect(component.accountOptions()).toEqual([
        expect.objectContaining({ value: 'acc-1', label: expect.any(String) }),
      ]);
      expect(component.conceptOptions().length).toBeGreaterThan(0);
      expect(component.conceptOptions()[0]).toEqual({ value: expect.anything(), label: expect.any(String) });
    });

    it('shows an inline error only for touched invalid controls', () => {
      init();
      const control = component['createIncomeForm'].get('accountId')!;

      expect(component.showError('accountId')).toBe(false);

      control.markAsTouched();
      expect(component.showError('accountId')).toBe(true);

      control.setValue('acc-1');
      expect(component.showError('accountId')).toBe(false);
      expect(component.showError('nope')).toBe(false);
    });
  });

});
