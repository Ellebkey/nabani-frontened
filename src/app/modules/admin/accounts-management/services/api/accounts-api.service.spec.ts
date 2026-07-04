import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AccountsApiService } from './accounts-api.service';
import { environment } from '@root/environments/environment';
import { IAccount, IAccountCreate, IAccountUpdate, AccountsResponse } from '@shared/interfaces/account.model';

describe('AccountsApiService', () => {
  let service: AccountsApiService;
  let httpMock: HttpTestingController;

  const API = environment.url;

  const makeAccount = (overrides: Partial<IAccount> = {}): IAccount => ({
    id: 'acc-1',
    name: 'BBVA Nómina',
    currentAmount: 1500,
    value: 1500,
    showSection: false,
    colorPalette: '#3570B4',
    isPrimary: true,
    disable: false,
    ownerId: 'u-1',
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AccountsApiService]
    });

    service = TestBed.inject(AccountsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAccounts', () => {
    it('should GET /accounts with the pagination query as params', () => {
      const response: AccountsResponse = { rows: [makeAccount()], count: 12 };
      let result: AccountsResponse | undefined;

      service.getAccounts({ limit: 25, offset: 50, includeDisabled: true }).subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API}/accounts`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('50');
      expect(req.request.params.get('includeDisabled')).toBe('true');
      req.flush(response);

      expect(result).toEqual({
        ...response,
        rows: response.rows.map(account => ({ ...account, colorPalette: '#3B5F82' })),
      });
    });

    it('should keep zero values but skip empty-string params', () => {
      service.getAccounts({ limit: 10, offset: 0, searchText: '' }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API}/accounts`);
      expect(req.request.params.get('offset')).toBe('0');
      expect(req.request.params.has('searchText')).toBe(false);
      req.flush({ rows: [], count: 0 });
    });

    it('should propagate HTTP errors to the subscriber', () => {
      let status: number | undefined;

      service.getAccounts({ limit: 25, offset: 0 }).subscribe({
        error: (err) => (status = err.status)
      });

      const req = httpMock.expectOne(r => r.url === `${API}/accounts`);
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(status).toBe(500);
    });
  });

  describe('getAccount', () => {
    it('should GET /accounts/:id', () => {
      const account = makeAccount();
      let result: IAccount | undefined;

      service.getAccount('acc-1').subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/accounts/acc-1`);
      expect(req.request.method).toBe('GET');
      req.flush(account);

      expect(result).toEqual(account);
    });
  });

  describe('createAccount', () => {
    it('should POST /accounts with only name, currentAmount and colorPalette', () => {
      const dto: IAccountCreate = { name: 'Efectivo', currentAmount: 200, colorPalette: '#ffcc00' };
      const created = makeAccount({ id: 'acc-9', name: 'Efectivo', currentAmount: 200 });
      let result: IAccount | undefined;

      // extra fields must be stripped by the payload whitelist
      service.createAccount({ ...dto, disable: true } as IAccountCreate).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/accounts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Efectivo', currentAmount: 200, colorPalette: '#ffcc00' });
      req.flush(created);

      expect(result).toEqual(created);
    });
  });

  describe('updateAccount', () => {
    it('should PUT /accounts/:id with only name and colorPalette', () => {
      const updated = makeAccount({ name: 'Renombrada', colorPalette: '#10b981' });
      let result: IAccount | undefined;

      // currentAmount must never be sent on update
      service.updateAccount('acc-1', {
        name: 'Renombrada',
        colorPalette: '#10b981',
        currentAmount: 999
      } as IAccountUpdate).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/accounts/acc-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'Renombrada', colorPalette: '#10b981' });
      req.flush(updated);

      expect(result).toEqual(updated);
    });
  });

  describe('toggleAccountStatus', () => {
    it('should PUT /accounts/:id with the disable flag only', () => {
      let result: IAccount | undefined;

      service.toggleAccountStatus('acc-1', true).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/accounts/acc-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ disable: true });
      req.flush(makeAccount({ disable: true }));

      expect(result?.disable).toBe(true);
    });
  });
});
