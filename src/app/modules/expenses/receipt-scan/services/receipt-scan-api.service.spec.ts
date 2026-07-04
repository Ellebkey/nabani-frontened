import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { ReceiptScanApiService } from './receipt-scan-api.service';
import { CreateDraftExpenseDto, CompleteDraftDto } from '../models/receipt-scan.model';

const API = 'http://localhost:4040/api';

describe('ReceiptScanApiService', () => {
  let service: ReceiptScanApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(ReceiptScanApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createDraftExpense', () => {
    it('should POST the dto to /expenses flagged as draft and return the created expense', () => {
      const dto: CreateDraftExpenseDto = {
        expenseDate: '2026-06-09T13:00:00',
        totalAmount: 450,
        items: [
          { articleId: 4, quantity: 2, price: 75, subtotal: 150 },
          { newArticle: { concept: 'Pan integral' }, quantity: 1, price: 300, subtotal: 300 }
        ],
        comment: 'Ticket Costco'
      };
      let result: unknown;

      service.createDraftExpense(dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/expenses`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ...dto, isDraft: true });
      req.flush({ id: 31, isDraft: true, totalAmount: 450 });

      expect(result).toEqual({ id: 31, isDraft: true, totalAmount: 450 });
    });
  });

  describe('getDraftExpenses', () => {
    it('should GET /expenses?isDraft=true and return the list', () => {
      const response = { rows: [{ id: 31, isDraft: true }], count: 1 };
      let result: unknown;

      service.getDraftExpenses().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/expenses?isDraft=true`);
      expect(req.request.method).toBe('GET');
      req.flush(response);

      expect(result).toEqual(response);
    });

    it('should propagate server errors', () => {
      let error: HttpErrorResponse | undefined;

      service.getDraftExpenses().subscribe({
        next: () => fail('should not emit'),
        error: (err: HttpErrorResponse) => (error = err)
      });

      const req = httpMock.expectOne(`${API}/expenses?isDraft=true`);
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
    });
  });

  describe('completeDraft', () => {
    it('should PUT the completion dto to /expenses/:id clearing the draft flag', () => {
      const dto: CompleteDraftDto = {
        paymentMethodId: 'pm-1',
        recipientId: 9,
        expenseDate: '2026-06-09T13:00:00',
        tagIds: [1, 2]
      };
      let result: unknown;

      service.completeDraft(8, dto).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/expenses/8`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ ...dto, isDraft: false });
      req.flush({ id: 8, isDraft: false });

      expect(result).toEqual({ id: 8, isDraft: false });
    });
  });

  describe('deleteDraft', () => {
    it('should DELETE /expenses/:id', () => {
      let completed = false;

      service.deleteDraft(8).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/expenses/8`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });
  });
});
