import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { MerchantsService } from './merchants.service';
import { IMerchant } from '@shared/interfaces/merchant.model';
import { RecordsList } from '@shared/interfaces/shared.model';
import { environment } from '@root/environments/environment';

const API_URL = environment.url;

describe('MerchantsService', () => {
  let service: MerchantsService;
  let httpMock: HttpTestingController;

  const merchant: IMerchant = { id: 4, name: 'Soriana', isEnabled: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(MerchantsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getMerchantsList', () => {
    it('should GET merchants from the recipients endpoint with pagination and search params', () => {
      const list: RecordsList<IMerchant> = { rows: [merchant], count: 1 };
      let result: RecordsList<IMerchant> | undefined;

      service
        .getMerchantsList({ limit: 25, offset: 75, searchText: 'soriana' })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/recipients`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('75');
      expect(req.request.params.get('searchText')).toBe('soriana');
      req.flush(list);

      expect(result).toEqual(list);
    });

    it('should omit empty-string search params', () => {
      service.getMerchantsList({ limit: 10, offset: 0, searchText: '' }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/recipients`);
      expect(req.request.params.keys().sort()).toEqual(['limit', 'offset']);
      req.flush({ rows: [], count: 0 });
    });

    it('should propagate a server error to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getMerchantsList({ limit: 10 }).subscribe({
        error: (err: HttpErrorResponse) => (error = err)
      });

      httpMock
        .expectOne(r => r.url === `${API_URL}/recipients`)
        .flush({ message: 'falló' }, { status: 500, statusText: 'Internal Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('createMerchant', () => {
    it('should POST a copy of the merchant payload', () => {
      let result: IMerchant | undefined;

      service.createMerchant(merchant).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/recipients`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(merchant);
      expect(req.request.body).not.toBe(merchant);
      req.flush(merchant);

      expect(result).toEqual(merchant);
    });
  });

  describe('updateMerchantsState', () => {
    it('should PUT the merchants wrapped in a merchants property', () => {
      const merchants: IMerchant[] = [
        { id: 4, name: 'Soriana', isEnabled: false },
        { id: 5, name: 'Oxxo', isEnabled: true }
      ];
      let result: IMerchant[] | undefined;

      service.updateMerchantsState(merchants).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/recipients`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ merchants });
      req.flush(merchants);

      expect(result).toEqual(merchants);
    });
  });

  describe('updateMerchant', () => {
    it('should PUT the partial merchant to the id route', () => {
      const changes: Partial<IMerchant> = { name: 'Soriana Híper' };
      let result: IMerchant | undefined;

      service.updateMerchant(4, changes).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/recipients/4`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(changes);
      req.flush({ ...merchant, name: 'Soriana Híper' });

      expect(result?.name).toBe('Soriana Híper');
    });
  });

  describe('destroyMerchant', () => {
    it('should DELETE the merchant by id', () => {
      let completed = false;

      service.destroyMerchant(4).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${API_URL}/recipients/4`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      expect(completed).toBe(true);
    });
  });
});
