import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { CreateMerchantModalComponent } from './create-merchant-modal.component';
import { MerchantsService } from '@app/modules/inventory/merchants.service';
import { IMerchant } from '@shared/interfaces/merchant.model';

describe('CreateMerchantModalComponent', () => {
  let fixture: ComponentFixture<CreateMerchantModalComponent>;
  let component: CreateMerchantModalComponent;

  let merchantsApi: { createMerchant: jest.Mock; updateMerchant: jest.Mock };
  let dialogRef: { close: jest.Mock };
  let toast: { observe: jest.Mock };

  const merchant: IMerchant = { id: 1, name: 'Costco', isEnabled: true };

  function setup(data: IMerchant | null = null): void {
    merchantsApi = {
      createMerchant: jest.fn(),
      updateMerchant: jest.fn()
    };
    dialogRef = { close: jest.fn() };
    toast = { observe: jest.fn(() => (source: unknown) => source) };

    TestBed.configureTestingModule({
    imports: [CommonModule, ReactiveFormsModule, CreateMerchantModalComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        { provide: MerchantsService, useValue: merchantsApi },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: data }
    ]
});

    fixture = TestBed.createComponent(CreateMerchantModalComponent);
    component = fixture.componentInstance;
  }

  function init(data: IMerchant | null = null): void {
    setup(data);
    component.ngOnInit();
  }

  describe('create mode (no dialog data)', () => {
    it('should initialize an empty required form', () => {
      init(null);

      expect(component.isEditMode).toBe(false);
      expect(component.title()).toBe('Registrar Beneficiario');
      expect(component.createMerchantForm.value).toEqual({ name: null });
      expect(component.createMerchantForm.invalid).toBe(true);
    });

    it('should become valid once the name is set', () => {
      init(null);

      component.createMerchantForm.get('name')!.setValue('Soriana');

      expect(component.createMerchantForm.valid).toBe(true);
    });
  });

  describe('edit mode', () => {
    it('should switch the title and prefill the name', () => {
      init(merchant);

      expect(component.isEditMode).toBe(true);
      expect(component.title()).toBe('Actualizar Beneficiario');
      expect(component.createMerchantForm.value).toEqual({ name: 'Costco' });
      expect(component.createMerchantForm.valid).toBe(true);
    });
  });

  describe('save', () => {
    it('should not call the API when the form is invalid', () => {
      init(null);

      component.save();

      expect(merchantsApi.createMerchant).not.toHaveBeenCalled();
      expect(merchantsApi.updateMerchant).not.toHaveBeenCalled();
      expect(component.createMerchantForm.disabled).toBe(false);
    });

    it('should create the merchant and close with the response', fakeAsync(() => {
      init(null);
      component.createMerchantForm.get('name')!.setValue('Soriana');
      merchantsApi.createMerchant.mockReturnValue(of({ id: 9, name: 'Soriana' }));

      component.save();

      expect(component.createMerchantForm.disabled).toBe(true);
      expect(merchantsApi.createMerchant).toHaveBeenCalledWith({ name: 'Soriana' });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando...',
        success: 'Beneficiario creado exitosamente',
        error: 'Error al guardar el beneficiario'
      });

      expect(dialogRef.close).not.toHaveBeenCalled();
      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 9, name: 'Soriana' });
    }));

    it('should update the merchant in edit mode with the update success message', fakeAsync(() => {
      init(merchant);
      component.createMerchantForm.get('name')!.setValue('Costco Wholesale');
      merchantsApi.updateMerchant.mockReturnValue(of({ id: 1, name: 'Costco Wholesale' }));

      component.save();

      expect(merchantsApi.updateMerchant).toHaveBeenCalledWith(1, { name: 'Costco Wholesale' });
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando...',
        success: 'Beneficiario actualizado exitosamente',
        error: 'Error al guardar el beneficiario'
      });
      expect(merchantsApi.createMerchant).not.toHaveBeenCalled();

      tick(500);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 1, name: 'Costco Wholesale' });
    }));

    it('should log the failure and still close the dialog with the error', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      init(null);
      component.createMerchantForm.get('name')!.setValue('Soriana');
      const failure = new Error('offline');
      merchantsApi.createMerchant.mockReturnValue(throwError(() => failure));

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
});
