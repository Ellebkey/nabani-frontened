import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { es } from 'date-fns/locale';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { of, throwError } from 'rxjs';

import { MerchantsListComponent } from './merchants-list.component';
import { CreateMerchantModalComponent } from '../create-merchant-modal/create-merchant-modal.component';
import { MerchantsService } from '../../merchants.service';
import { PaginationService } from '@shared/services/pagination.service';
import { CommonService } from '@shared/services/common.service';
import { AlertService } from '@shared/services/alert.service';
import { IMerchant } from '@shared/interfaces/merchant.model';

describe('MerchantsListComponent', () => {
  let fixture: ComponentFixture<MerchantsListComponent>;
  let component: MerchantsListComponent;

  let merchantsApi: { getMerchantsList: jest.Mock; updateMerchantsState: jest.Mock; destroyMerchant: jest.Mock };
  let paginationService: { getDefaultPagination: jest.Mock };
  let toast: { observe: jest.Mock; info: jest.Mock };
  let dialog: { open: jest.Mock };
  let common: { getDefaultDeleteConfirmation: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let alertService: { error: jest.Mock };
  let dialogResult: unknown;
  let confirmResult: unknown;

  const deleteConfig = { title: 'Remove beneficiario' };

  const costco: IMerchant = { id: 1, name: 'Costco', isEnabled: true };
  const soriana: IMerchant = { id: 2, name: 'Soriana', isEnabled: false };

  const baseParams = { limit: 25, offset: 0, searchText: null, fetchAll: 'true' };

  beforeEach(() => {
    dialogResult = undefined;
    confirmResult = undefined;

    merchantsApi = {
      getMerchantsList: jest.fn().mockReturnValue(of({ rows: [costco, soriana], count: 2 })),
      updateMerchantsState: jest.fn().mockReturnValue(of([])),
      destroyMerchant: jest.fn().mockReturnValue(of(void 0))
    };
    paginationService = {
      getDefaultPagination: jest.fn((showInput = false) => ({
        limit: 25,
        offset: 0,
        searchText: null,
        count: 0,
        showInputSearch: showInput
      }))
    };
    toast = { observe: jest.fn(() => (source: unknown) => source), info: jest.fn() };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    common = { getDefaultDeleteConfirmation: jest.fn(() => deleteConfig) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    alertService = { error: jest.fn() };

    TestBed.configureTestingModule({
    imports: [CommonModule, MatMenuModule, MatIconTestingModule, EmptyStateComponent, MerchantsListComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        provideRouter([]), provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: es },
        provideNoopAnimations(),
        { provide: MerchantsService, useValue: merchantsApi },
        { provide: PaginationService, useValue: paginationService },
        { provide: HotToastService, useValue: toast },
        { provide: MatDialog, useValue: dialog },
        { provide: CommonService, useValue: common },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: AlertService, useValue: alertService }
    ]
});
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(MerchantsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('initial load', () => {
    it('should load the merchant list with search-enabled pagination and fetchAll', () => {
      createComponent();

      expect(paginationService.getDefaultPagination).toHaveBeenCalledWith(true);
      expect(component.pagination().showInputSearch).toBe(true);
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledWith(baseParams);
      expect(component.merchants()).toEqual([costco, soriana]);
      expect(component.pagination().count).toBe(2);
    });

    it('should only log when the load fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const failure = new Error('boom');
      merchantsApi.getMerchantsList.mockReturnValue(throwError(() => failure));

      createComponent();

      expect(consoleSpy).toHaveBeenCalledWith(failure);
      expect(component.merchants()).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should show the Spanish empty state when there are no merchants', () => {
      merchantsApi.getMerchantsList.mockReturnValue(of({ rows: [], count: 0 }));

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay comercios registrados');
      expect(text).toContain('Crear primer comercio');
      expect(text).not.toContain('Listado de comercios');
    });

    it('should show the list header when merchants exist', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Listado de comercios');
      expect(text).not.toContain('No hay comercios registrados');
    });
  });

  describe('pagination and search', () => {
    it('should reload with the new limit and offset', () => {
      createComponent();

      component.onPageChange({ limit: 50, offset: 25 });

      expect(component.pagination().limit).toBe(50);
      expect(component.pagination().offset).toBe(25);
      expect(merchantsApi.getMerchantsList).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 50, offset: 25, fetchAll: 'true' })
      );
    });

    it('should reset the offset and reload with the debounced search text', fakeAsync(() => {
      createComponent();
      component.pagination.update(p => ({ ...p, offset: 75 }));

      component.searchControl.setValue('  cost  ');
      tick(350);

      expect(component.pagination().searchText).toBe('cost');
      expect(component.pagination().offset).toBe(0);
      expect(merchantsApi.getMerchantsList).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchText: 'cost', offset: 0 })
      );
    }));
  });

  describe('create and edit modals', () => {
    it('should open the create modal and reload when it closes with a result', () => {
      dialogResult = { id: 99 };

      createComponent();
      component.openCreateMerchant();

      expect(dialog.open).toHaveBeenCalledWith(CreateMerchantModalComponent, {
        disableClose: true,
        width: '440px'
      });
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(2);
    });

    it('should not reload when the create modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component.openCreateMerchant();

      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(1);
    });

    it('should open the edit modal with the merchant as data', () => {
      dialogResult = { id: 1 };

      createComponent();
      component.editMerchant(costco);

      expect(dialog.open).toHaveBeenCalledWith(CreateMerchantModalComponent, {
        disableClose: true,
        width: '500px',
        data: costco
      });
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(2);
    });
  });

  describe('enable/disable flow', () => {
    it('should mutate the merchant state and track it in the selection', () => {
      createComponent();

      component.toggleStatus(false, costco);

      expect(costco.isEnabled).toBe(false);
      expect(component.selection.selected).toEqual([costco]);
    });

    it('should keep a single selection entry when the same merchant is toggled twice', () => {
      createComponent();

      component.toggleStatus(false, costco);
      component.toggleStatus(true, costco);

      expect(costco.isEnabled).toBe(true);
      expect(component.selection.selected).toHaveLength(1);
    });

    it('should show the singular and plural Spanish selection headers', () => {
      createComponent();

      component.toggleStatus(false, costco);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('1 cambio pendiente');

      component.toggleStatus(true, soriana);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('2 cambios pendientes');
    });

    it('should submit the selected merchants, clear the selection and reload', () => {
      createComponent();
      component.toggleStatus(false, costco);
      component.toggleStatus(true, soriana);

      component.submitChanges();

      expect(merchantsApi.updateMerchantsState).toHaveBeenCalledWith([costco, soriana]);
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Guardando...',
        success: 'Beneficiarios actualizados exitosamente',
        error: 'Error al guardar los beneficiarios'
      });
      expect(component.selection.selected).toHaveLength(0);
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(2);
    });

    it('should also clear the selection when the update fails (catchError swallows the error)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      createComponent();
      component.toggleStatus(false, costco);
      merchantsApi.updateMerchantsState.mockReturnValue(throwError(() => new Error('boom')));

      component.submitChanges();

      // Source finding: catchError maps the failure into a next emission, so the
      // subscriber's error branch (which would keep the selection) is unreachable.
      expect(component.selection.selected).toHaveLength(0);
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('should clear the selection and reload on manual clear', () => {
      createComponent();
      component.toggleStatus(false, costco);

      component.clearSelection();

      expect(component.selection.selected).toHaveLength(0);
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(2);
    });
  });

  describe('delete merchant', () => {
    it('should delete after confirmation, reload and toast in Spanish', () => {
      confirmResult = 'confirmed';

      createComponent();
      component.deleteMerchant(costco);

      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'beneficiario' });
      expect(magueyConfirmation.open).toHaveBeenCalledWith(deleteConfig);
      expect(merchantsApi.destroyMerchant).toHaveBeenCalledWith(1);
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(2);
      expect(toast.info).toHaveBeenCalledWith('El registro fue eliminado correctamente.');
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component.deleteMerchant(costco);

      expect(merchantsApi.destroyMerchant).not.toHaveBeenCalled();
    });

    it('should surface the backend message through the alert service on failure', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      confirmResult = 'confirmed';
      const failure = { error: { message: 'El beneficiario está en uso' } };
      merchantsApi.destroyMerchant.mockReturnValue(throwError(() => failure));

      createComponent();
      component.deleteMerchant(costco);

      expect(alertService.error).toHaveBeenCalledWith('El beneficiario está en uso', {
        duration: 10000,
        appearance: 'outline'
      });
      expect(toast.info).not.toHaveBeenCalled();
      expect(merchantsApi.getMerchantsList).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });
});
