import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { PaymentMethodsStateService } from './payment-methods-state.service';
import { PaymentMethodsApiService } from '../api/payment-methods-api.service';
import { IPaymentMethod, PaymentMethodsResponse } from '@shared/interfaces/payment-method.model';

describe('PaymentMethodsStateService', () => {
  let service: PaymentMethodsStateService;
  let api: {
    getPaymentMethods: jest.Mock;
    createPaymentMethod: jest.Mock;
    updatePaymentMethod: jest.Mock;
    deletePaymentMethod: jest.Mock;
    togglePaymentMethodStatus: jest.Mock;
  };
  let toast: { success: jest.Mock; error: jest.Mock };

  const makePaymentMethod = (overrides: Partial<IPaymentMethod> = {}): IPaymentMethod => ({
    id: 'pm-1',
    shortName: 'BBVA Oro',
    method: 'credit',
    cardType: null,
    backgroundColor: '#ed0722',
    cardIcon: null,
    cardNumber: '4152',
    cardCVV: null,
    cardExpiry: null,
    creditLimit: null,
    cutOffDay: null,
    isActive: true,
    accountId: 'acc-1',
    accountName: 'BBVA Nómina',
    ...overrides
  });

  const seed = (rows: IPaymentMethod[], count = rows.length): void => {
    api.getPaymentMethods.mockReturnValue(of({ rows, count }));
    service.loadPaymentMethods();
  };

  beforeEach(() => {
    api = {
      getPaymentMethods: jest.fn(),
      createPaymentMethod: jest.fn(),
      updatePaymentMethod: jest.fn(),
      deletePaymentMethod: jest.fn(),
      togglePaymentMethodStatus: jest.fn()
    };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        PaymentMethodsStateService,
        { provide: PaymentMethodsApiService, useValue: api },
        { provide: HotToastService, useValue: toast }
      ]
    });

    service = TestBed.inject(PaymentMethodsStateService);
  });

  describe('loadPaymentMethods', () => {
    it('should request with pagination + includeDisabled (no searchText when null) and set rows + count', () => {
      seed([makePaymentMethod()], 9);

      expect(api.getPaymentMethods).toHaveBeenCalledWith({ limit: 25, offset: 0, includeDisabled: true });
      expect(service.paymentMethods()).toHaveLength(1);
      expect(service.pagination().count).toBe(9);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should forward the searchText once it is set in pagination', () => {
      api.getPaymentMethods.mockReturnValue(of({ rows: [], count: 0 }));

      service.updatePagination({ searchText: 'visa' });

      expect(api.getPaymentMethods).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        includeDisabled: true,
        searchText: 'visa'
      });
    });

    it('should only update signals AFTER the api resolves (signal golden rule)', () => {
      const response$ = new Subject<PaymentMethodsResponse>();
      api.getPaymentMethods.mockReturnValue(response$.asObservable());

      service.loadPaymentMethods();

      expect(service.loading()).toBe(true);
      expect(service.paymentMethods()).toEqual([]);

      response$.next({ rows: [makePaymentMethod()], count: 1 });
      response$.complete();

      expect(service.paymentMethods()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
      expect(service.loading()).toBe(false);
    });

    it('should toast in Spanish and set the error signal on failure', () => {
      api.getPaymentMethods.mockReturnValue(throwError(() => new Error('boom')));

      service.loadPaymentMethods();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar los métodos de pago');
      expect(service.error()).toBe('Error al cargar los métodos de pago');
      expect(service.paymentMethods()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('createPaymentMethod', () => {
    it('should append the new method and increment the pagination count after the server responds', () => {
      seed([makePaymentMethod()], 1);
      const created = makePaymentMethod({ id: 'pm-2', shortName: 'Efectivo', method: 'cash' });
      api.createPaymentMethod.mockReturnValue(of(created));

      service.createPaymentMethod({ shortName: 'Efectivo', method: 'cash', accountId: 'acc-1' });

      expect(service.paymentMethods().map(pm => pm.id)).toEqual(['pm-1', 'pm-2']);
      expect(service.pagination().count).toBe(2); // count bookkeeping
      expect(toast.success).toHaveBeenCalledWith('Método de pago creado exitosamente');
      expect(service.loading()).toBe(false);
    });

    it('should not touch the list or count until the api resolves (signal golden rule)', () => {
      seed([makePaymentMethod()], 1);
      const response$ = new Subject<IPaymentMethod>();
      api.createPaymentMethod.mockReturnValue(response$.asObservable());

      service.createPaymentMethod({ shortName: 'Efectivo', method: 'cash', accountId: 'acc-1' });

      expect(service.paymentMethods()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
      expect(service.loading()).toBe(true);

      response$.next(makePaymentMethod({ id: 'pm-2' }));
      response$.complete();

      expect(service.paymentMethods()).toHaveLength(2);
      expect(service.pagination().count).toBe(2);
    });

    it('should toast and leave list + count intact on failure', () => {
      seed([makePaymentMethod()], 1);
      api.createPaymentMethod.mockReturnValue(throwError(() => new Error('boom')));

      service.createPaymentMethod({ shortName: 'Efectivo', method: 'cash', accountId: 'acc-1' });

      expect(toast.error).toHaveBeenCalledWith('Error al crear el método de pago');
      expect(service.paymentMethods()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
      expect(service.loading()).toBe(false);
    });
  });

  describe('updatePaymentMethod', () => {
    it('should replace the matching method after the server responds', () => {
      const pm1 = makePaymentMethod();
      const pm2 = makePaymentMethod({ id: 'pm-2', shortName: 'Efectivo' });
      seed([pm1, pm2]);

      const updated = makePaymentMethod({ shortName: 'BBVA Platino' });
      api.updatePaymentMethod.mockReturnValue(of(updated));

      service.updatePaymentMethod('pm-1', {
        id: 'pm-1', shortName: 'BBVA Platino', method: 'credit', accountId: 'acc-1'
      });

      expect(service.paymentMethods()).toEqual([updated, pm2]);
      expect(toast.success).toHaveBeenCalledWith('Método de pago actualizado exitosamente');
    });

    it('should toast and keep the previous data on failure', () => {
      const pm1 = makePaymentMethod();
      seed([pm1]);
      api.updatePaymentMethod.mockReturnValue(throwError(() => new Error('boom')));

      service.updatePaymentMethod('pm-1', {
        id: 'pm-1', shortName: 'X', method: 'credit', accountId: 'acc-1'
      });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar el método de pago');
      expect(service.paymentMethods()).toEqual([pm1]);
    });
  });

  describe('deletePaymentMethod', () => {
    it('should remove the method and decrement the count after the server confirms', () => {
      seed([makePaymentMethod(), makePaymentMethod({ id: 'pm-2' })], 2);
      api.deletePaymentMethod.mockReturnValue(of(void 0));

      service.deletePaymentMethod('pm-1');

      expect(service.paymentMethods().map(pm => pm.id)).toEqual(['pm-2']);
      expect(service.pagination().count).toBe(1);
      expect(toast.success).toHaveBeenCalledWith('Método de pago eliminado exitosamente');
    });

    it('should floor the pagination count at zero', () => {
      seed([makePaymentMethod()], 0); // backend count already at 0
      api.deletePaymentMethod.mockReturnValue(of(void 0));

      service.deletePaymentMethod('pm-1');

      expect(service.pagination().count).toBe(0);
    });

    it('should toast and keep the method on failure', () => {
      seed([makePaymentMethod()], 1);
      api.deletePaymentMethod.mockReturnValue(throwError(() => new Error('boom')));

      service.deletePaymentMethod('pm-1');

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar el método de pago');
      expect(service.paymentMethods()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
    });
  });

  describe('togglePaymentMethodStatus', () => {
    it('should do nothing when the method is not in state', () => {
      service.togglePaymentMethodStatus('missing');

      expect(api.togglePaymentMethodStatus).not.toHaveBeenCalled();
    });

    it('should deactivate an active method and toast "desactivado"', () => {
      seed([makePaymentMethod({ isActive: true })]);
      api.togglePaymentMethodStatus.mockReturnValue(of(makePaymentMethod({ isActive: false })));

      service.togglePaymentMethodStatus('pm-1');

      expect(api.togglePaymentMethodStatus).toHaveBeenCalledWith('pm-1', false);
      expect(service.paymentMethods()[0].isActive).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Método de pago desactivado exitosamente');
    });

    it('should activate an inactive method and toast "activado"', () => {
      seed([makePaymentMethod({ isActive: false })]);
      api.togglePaymentMethodStatus.mockReturnValue(of(makePaymentMethod({ isActive: true })));

      service.togglePaymentMethodStatus('pm-1');

      expect(api.togglePaymentMethodStatus).toHaveBeenCalledWith('pm-1', true);
      expect(toast.success).toHaveBeenCalledWith('Método de pago activado exitosamente');
    });

    it('should toast and keep the previous status on failure', () => {
      seed([makePaymentMethod({ isActive: true })]);
      api.togglePaymentMethodStatus.mockReturnValue(throwError(() => new Error('boom')));

      service.togglePaymentMethodStatus('pm-1');

      expect(toast.error).toHaveBeenCalledWith('Error al cambiar el estado del método de pago');
      expect(service.paymentMethods()[0].isActive).toBe(true);
    });
  });

  describe('updatePagination', () => {
    it('should merge the partial settings and reload with them', () => {
      api.getPaymentMethods.mockReturnValue(of({ rows: [], count: 0 }));

      service.updatePagination({ offset: 50, limit: 10 });

      expect(service.pagination().offset).toBe(50);
      expect(api.getPaymentMethods).toHaveBeenCalledWith({ limit: 10, offset: 50, includeDisabled: true });
    });
  });

  describe('computed signals', () => {
    it('should derive count, hasPaymentMethods and isEmpty', () => {
      expect(service.isEmpty()).toBe(true);
      expect(service.hasPaymentMethods()).toBe(false);

      seed([makePaymentMethod(), makePaymentMethod({ id: 'pm-2' })]);

      expect(service.paymentMethodCount()).toBe(2);
      expect(service.hasPaymentMethods()).toBe(true);
      expect(service.isEmpty()).toBe(false);
    });
  });
});
