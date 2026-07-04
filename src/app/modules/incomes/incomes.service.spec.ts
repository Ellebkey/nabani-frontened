import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { IncomesService } from './incomes.service';
import { IIncome, IncomeDTO } from '@shared/interfaces/income.model';
import { RecordsList } from '@shared/interfaces/shared.model';
import { environment } from '@root/environments/environment';

const API_URL = environment.url;

describe('IncomesService', () => {
  let service: IncomesService;
  let httpMock: HttpTestingController;

  const income: IIncome = {
    id: 7,
    totalAmount: 15000.5,
    incomeDate: '2026-06-01',
    comment: 'Primera quincena',
    concept: 'Nómina',
    accountId: 'acc-1',
    accountName: 'BBVA',
    accountColor: '#3570B4'
  };

  // The service migrates raw colors to the muted palette at load time
  const incomeMuted = { ...income, accountColor: '#3B5F82' };

  const incomeDto: IncomeDTO = {
    totalAmount: 15000.5,
    incomeDate: '2026-06-01',
    concept: 'Nómina',
    accountId: 'acc-1'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(IncomesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getIncomes', () => {
    it('should GET incomes with pagination, search and date-range params', () => {
      const list: RecordsList<IIncome> = { rows: [income], count: 1 };
      let result: RecordsList<IIncome> | undefined;

      service
        .getIncomes({
          limit: 25,
          offset: 0,
          searchText: 'nomina',
          startDate: '2026-06-01',
          endDate: '2026-06-30'
        })
        .subscribe(res => (result = res));

      const req = httpMock.expectOne(r => r.url === `${API_URL}/incomes`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('0');
      expect(req.request.params.get('searchText')).toBe('nomina');
      expect(req.request.params.get('startDate')).toBe('2026-06-01');
      expect(req.request.params.get('endDate')).toBe('2026-06-30');
      req.flush(list);

      expect(result).toEqual({ ...list, rows: [incomeMuted] });
      expect(result?.rows[0].concept).toBe('Nómina');
    });

    it('should omit empty-string params from the query', () => {
      service.getIncomes({ limit: 10, offset: 0, searchText: '' }).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/incomes`);
      expect(req.request.params.keys().sort()).toEqual(['limit', 'offset']);
      req.flush({ rows: [], count: 0 });
    });

    it('should propagate a server error to the subscriber', () => {
      let error: HttpErrorResponse | undefined;

      service.getIncomes({ limit: 10 }).subscribe({
        error: (err: HttpErrorResponse) => (error = err)
      });

      httpMock
        .expectOne(r => r.url === `${API_URL}/incomes`)
        .flush({ message: 'falló' }, { status: 500, statusText: 'Internal Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('saveIncome', () => {
    it('should POST a copy of the income payload', () => {
      let result: IIncome | undefined;

      service.saveIncome(incomeDto).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/incomes`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(incomeDto);
      expect(req.request.body).not.toBe(incomeDto);
      req.flush(income);

      expect(result).toEqual(income);
    });

    it('should surface validation errors', () => {
      let error: HttpErrorResponse | undefined;

      service.saveIncome(incomeDto).subscribe({
        error: (err: HttpErrorResponse) => (error = err)
      });

      httpMock
        .expectOne(`${API_URL}/incomes`)
        .flush({ message: 'Monto inválido' }, { status: 400, statusText: 'Bad Request' });

      expect(error?.status).toBe(400);
      expect(error?.error.message).toBe('Monto inválido');
    });
  });

  describe('deleteIncome', () => {
    it('should DELETE the income by id', () => {
      let completed = false;

      service.deleteIncome(7).subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${API_URL}/incomes/7`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toBeNull();
      req.flush({});

      expect(completed).toBe(true);
    });
  });

  describe('getIncomeDetails', () => {
    it('should GET the income details by id', () => {
      let result: unknown;

      service.getIncomeDetails(7).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/incomes/7`);
      expect(req.request.method).toBe('GET');
      req.flush(income);

      expect(result).toEqual(income);
    });
  });

  describe('updateIncome', () => {
    it('should PUT the income payload to the id route', () => {
      let result: IIncome | undefined;

      service.updateIncome(7, incomeDto).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${API_URL}/incomes/7`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(incomeDto);
      req.flush({ ...income, comment: 'actualizado' });

      expect(result?.comment).toBe('actualizado');
    });
  });
});
