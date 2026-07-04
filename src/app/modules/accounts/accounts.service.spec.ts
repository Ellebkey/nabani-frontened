import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { AccountsService } from './accounts.service';
import {
  IAccounts,
  IAccountSection,
  IAccountSectionDTO,
  ITransferDTO,
  MonthlyTrendDto
} from '@shared/interfaces/account.model';
import { RecordsList } from '@shared/interfaces/shared.model';
import { environment } from '@root/environments/environment';

const API_URL = environment.url;

describe('AccountsService', () => {
  let service: AccountsService;
  let httpMock: HttpTestingController;

  const accountsFixture: IAccounts = {
    rows: [
      {
        id: 'acc-1',
        name: 'BBVA',
        currentAmount: 1250.75,
        value: 1250.75,
        showSection: true,
        colorPalette: '#3570B4',
        isPrimary: true,
        disable: false,
        ownerId: 'u-1'
      }
    ],
    graphics: {
      series: [{ name: 'Saldo', data: [{ x: 'Enero', y: 1250.75 }] }]
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(AccountsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAccounts', () => {
    it('should GET the accounts list', () => {
      let result: IAccounts | undefined;

      service.getAccounts().subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/accounts`);
      expect(req.request.method).toBe('GET');
      req.flush(accountsFixture);

      // Raw colors migrate to the muted palette at load time (Maguey 2.0)
      expect(result).toEqual({
        ...accountsFixture,
        rows: accountsFixture.rows.map(account => ({ ...account, colorPalette: '#3B5F82' })),
      });
      expect(result?.rows[0].name).toBe('BBVA');
    });

    it('should propagate a server error to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getAccounts().subscribe({
        error: (err: HttpErrorResponse) => (error = err)
      });

      httpMock
        .expectOne(`${API_URL}/accounts`)
        .flush({ message: 'falló' }, { status: 500, statusText: 'Internal Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('getAccountsWithGraphics', () => {
    it('should GET accounts with graphics', () => {
      let result: IAccounts | undefined;

      service.getAccountsWithGraphics().subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/accounts/with-graphics`);
      expect(req.request.method).toBe('GET');
      req.flush(accountsFixture);

      expect(result?.graphics.series[0].name).toBe('Saldo');
    });
  });

  describe('getMonthlyTrend', () => {
    const trend: MonthlyTrendDto = {
      months: ['2026-01', '2026-02'],
      incomes: [1000, 1200],
      expenses: [400, 650]
    };

    it('should default to 6 months', () => {
      service.getMonthlyTrend().subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/monthly-trend`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('months')).toBe('6');
      req.flush(trend);
    });

    it('should propagate an explicit months value', () => {
      let result: MonthlyTrendDto | undefined;

      service.getMonthlyTrend(12).subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/monthly-trend`);
      expect(req.request.params.get('months')).toBe('12');
      req.flush(trend);

      expect(result).toEqual(trend);
    });
  });

  describe('getAccountSections', () => {
    it('should GET the sections of the given account', () => {
      const sections: IAccountSection[] = [
        { id: 's-1', name: 'Ahorro', comments: 'Fondo de emergencia', currentAmount: 300 }
      ];
      let result: IAccountSection[] | undefined;

      service.getAccountSections('acc-1').subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/account-section/account/acc-1`);
      expect(req.request.method).toBe('GET');
      req.flush(sections);

      expect(result).toEqual(sections);
    });
  });

  describe('updateSection', () => {
    it('should PUT a copy of the section payload', () => {
      const dto: IAccountSectionDTO = {
        accountId: 'acc-1',
        amount: 150,
        movementType: 'deposit',
        movementDate: '2026-06-10'
      };
      const updated: IAccountSection = {
        id: 's-1',
        name: 'Ahorro',
        comments: '',
        currentAmount: 450
      };
      let result: IAccountSection | undefined;

      service.updateSection(dto).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/account-section`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      expect(req.request.body).not.toBe(dto);
      req.flush(updated);

      expect(result).toEqual(updated);
    });
  });

  describe('accountTransfer', () => {
    it('should POST the transfer payload', () => {
      const transfer: ITransferDTO = {
        sourceAccountId: 'acc-1',
        destinyAccountId: 'acc-2',
        amount: 500,
        movementType: 'transfer',
        movementDate: '2026-06-10'
      };
      let result: unknown;

      service.accountTransfer(transfer).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/accounts/transfer`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(transfer);
      req.flush({ success: true });

      expect(result).toEqual({ success: true });
    });
  });

  describe('getAccountLedger', () => {
    it('should GET the ledger with pagination, search and date-range params', () => {
      const ledger: RecordsList<any> = {
        rows: [{ id: 't-1', concept: 'Café', amount: 120 }],
        count: 1
      };
      let result: RecordsList<any> | undefined;

      service
        .getAccountLedger('acc-1', {
          limit: 25,
          offset: 50,
          searchText: 'cafe',
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/acc-1/ledger`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('50');
      expect(req.request.params.get('searchText')).toBe('cafe');
      expect(req.request.params.get('startDate')).toBe('2026-01-01');
      expect(req.request.params.get('endDate')).toBe('2026-01-31');
      req.flush(ledger);

      expect(result).toEqual(ledger);
    });

    it('should omit empty-string params from the ledger query', () => {
      service.getAccountLedger('acc-1', { limit: 10, searchText: '' }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/accounts/acc-1/ledger`);
      expect(req.request.params.keys()).toEqual(['limit']);
      req.flush({ rows: [], count: 0 });
    });
  });

  describe('section management endpoints', () => {
    it('creates, updates and deletes sections against /account-section', () => {
      service.createSection({ accountId: 'a-1', name: 'Meta', targetAmount: 100, initialDeposit: 50 }).subscribe();
      const create = httpMock.expectOne(`${API_URL}/account-section`);
      expect(create.request.method).toBe('POST');
      expect(create.request.body).toEqual(expect.objectContaining({ name: 'Meta' }));
      create.flush({});

      service.updateSectionDetails('s-1', { name: 'Nuevo', targetAmount: null }).subscribe();
      const update = httpMock.expectOne(`${API_URL}/account-section/s-1`);
      expect(update.request.method).toBe('PUT');
      update.flush({});

      service.deleteSection('s-1').subscribe();
      const del = httpMock.expectOne(`${API_URL}/account-section/s-1`);
      expect(del.request.method).toBe('DELETE');
      del.flush(null);
    });
  });

});
