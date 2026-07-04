import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PaymentMethodsApiService } from './payment-methods-api.service';
import { environment } from '@root/environments/environment';
import {
  IPaymentMethod,
  IPaymentMethodCreate,
  IPaymentMethodUpdate,
  PaymentMethodsResponse,
  CARD_GRADIENTS
} from '@shared/interfaces/payment-method.model';

interface BackendItem {
  id: string;
  name: string;
  shortName: string;
  method: string;
  cardNumber: string | null;
  accountId: string;
  accountName: string;
  isActive: boolean;
  backgroundColor?: string;
}

describe('PaymentMethodsApiService', () => {
  let service: PaymentMethodsApiService;
  let httpMock: HttpTestingController;

  const API = environment.url;
  const DEFAULT_COLOR = CARD_GRADIENTS[0].primary;

  const makeBackendItem = (overrides: Partial<BackendItem> = {}): BackendItem => ({
    id: 'pm-1',
    name: 'BBVA Crédito Oro',
    shortName: 'BBVA Oro',
    method: 'credit',
    cardNumber: '4152',
    accountId: 'acc-1',
    accountName: 'BBVA Nómina',
    isActive: true,
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentMethodsApiService]
    });

    service = TestBed.inject(PaymentMethodsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getPaymentMethods', () => {
    it('should GET /payment-methods with params and map the backend array to rows + count', () => {
      let result: PaymentMethodsResponse | undefined;

      service.getPaymentMethods({ limit: 25, offset: 0, includeDisabled: true }).subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API}/payment-methods`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('includeDisabled')).toBe('true');
      req.flush([
        makeBackendItem({ backgroundColor: '#222e3d' }),
        makeBackendItem({ id: 'pm-2', shortName: 'Efectivo', method: 'cash', cardNumber: null })
      ]);

      expect(result?.count).toBe(2);
      expect(result?.rows[0].backgroundColor).toBe('#2E3A46'); // crudo #222e3d → Grafito
      expect(result?.rows[1].backgroundColor).toBe(DEFAULT_COLOR); // default when backend omits it
      expect(result?.rows[1].cardNumber).toBeNull();
    });

    it('should map a backend item to the full IPaymentMethod shape', () => {
      let result: PaymentMethodsResponse | undefined;

      service.getPaymentMethods({ limit: 1, offset: 0 }).subscribe(r => (result = r));

      httpMock.expectOne(r => r.url === `${API}/payment-methods`).flush([makeBackendItem()]);

      const expected: IPaymentMethod = {
        id: 'pm-1',
        shortName: 'BBVA Oro',
        method: 'credit',
        cardType: null,
        backgroundColor: DEFAULT_COLOR,
        cardIcon: null,
        cardNumber: '4152',
        cardCVV: null,
        cardExpiry: null,
        creditLimit: null,
        cutOffDay: null,
        isActive: true,
        accountId: 'acc-1',
        accountName: 'BBVA Nómina',
        account: undefined
      };
      expect(result?.rows[0]).toEqual(expected);
    });
  });

  describe('getPaymentMethod', () => {
    it('should GET /payment-methods/:id and map the single item', () => {
      let result: IPaymentMethod | undefined;

      service.getPaymentMethod('pm-1').subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/payment-methods/pm-1`);
      expect(req.request.method).toBe('GET');
      req.flush(makeBackendItem());

      expect(result?.id).toBe('pm-1');
      expect(result?.accountName).toBe('BBVA Nómina');
      expect(result?.backgroundColor).toBe(DEFAULT_COLOR);
    });
  });

  describe('createPaymentMethod', () => {
    it('should POST a minimal payload without optional keys and default isActive to true', () => {
      const dto: IPaymentMethodCreate = { shortName: 'Efectivo', method: 'cash', accountId: 'acc-1' };

      service.createPaymentMethod(dto).subscribe();

      const req = httpMock.expectOne(`${API}/payment-methods`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        shortName: 'Efectivo',
        method: 'cash',
        accountId: 'acc-1',
        isActive: true
      });
      expect(req.request.body).not.toHaveProperty('backgroundColor');
      expect(req.request.body).not.toHaveProperty('cardNumber');
      req.flush(makeBackendItem({ id: 'pm-9', shortName: 'Efectivo', method: 'cash', cardNumber: null }));
    });

    it('should include optional fields and preserve an explicit isActive=false', () => {
      const dto: IPaymentMethodCreate = {
        shortName: 'BBVA Oro',
        method: 'credit',
        accountId: 'acc-1',
        backgroundColor: '#222e3d',
        cardNumber: '4152',
        isActive: false
      };
      let result: IPaymentMethod | undefined;

      service.createPaymentMethod(dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/payment-methods`);
      expect(req.request.body).toEqual({
        shortName: 'BBVA Oro',
        method: 'credit',
        accountId: 'acc-1',
        backgroundColor: '#222e3d',
        cardNumber: '4152',
        isActive: false
      });
      req.flush(makeBackendItem({ isActive: false, backgroundColor: '#222e3d' }));

      expect(result?.isActive).toBe(false);
      expect(result?.backgroundColor).toBe('#222e3d');
    });
  });

  describe('updatePaymentMethod', () => {
    it('should PUT /payment-methods/:id including cardNumber when provided', () => {
      const dto: IPaymentMethodUpdate = {
        id: 'pm-1',
        shortName: 'BBVA Platino',
        method: 'credit',
        accountId: 'acc-1',
        cardNumber: '9999'
      };

      service.updatePaymentMethod('pm-1', dto).subscribe();

      const req = httpMock.expectOne(`${API}/payment-methods/pm-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        shortName: 'BBVA Platino',
        method: 'credit',
        accountId: 'acc-1',
        cardNumber: '9999',
        isActive: true
      });
      req.flush(makeBackendItem({ shortName: 'BBVA Platino', cardNumber: '9999' }));
    });

    it('should omit cardNumber when it is undefined', () => {
      const dto: IPaymentMethodUpdate = {
        id: 'pm-1',
        shortName: 'BBVA Platino',
        method: 'credit',
        accountId: 'acc-1'
      };

      service.updatePaymentMethod('pm-1', dto).subscribe();

      const req = httpMock.expectOne(`${API}/payment-methods/pm-1`);
      expect(req.request.body).not.toHaveProperty('cardNumber');
      req.flush(makeBackendItem());
    });
  });

  describe('deletePaymentMethod', () => {
    it('should DELETE /payment-methods/:id', () => {
      let completed = false;

      service.deletePaymentMethod('pm-1').subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/payment-methods/pm-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });
  });

  describe('togglePaymentMethodStatus', () => {
    it('should PUT only the isActive flag and map the response', () => {
      let result: IPaymentMethod | undefined;

      service.togglePaymentMethodStatus('pm-1', false).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/payment-methods/pm-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush(makeBackendItem({ isActive: false }));

      expect(result?.isActive).toBe(false);
      expect(result?.backgroundColor).toBe(DEFAULT_COLOR);
    });
  });
});
