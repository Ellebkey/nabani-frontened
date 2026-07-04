import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { ReceiptDraftApiService } from './receipt-draft-api.service';
import {
  ReceiptDraft,
  ReceiptDraftSummary,
  CreateReceiptDraftPayload,
  UpdateReceiptDraftPayload
} from '../models/receipt-draft.model';
import { RecordsList } from '@shared/interfaces/shared.model';

const API = 'http://localhost:4040/api';

describe('ReceiptDraftApiService', () => {
  let service: ReceiptDraftApiService;
  let httpMock: HttpTestingController;

  const draft: ReceiptDraft = {
    id: 12,
    store: 'Costco',
    expenseDate: '2026-06-09',
    total: 845.5,
    status: 'pending',
    data: {
      store: 'Costco',
      date: '2026-06-09',
      items: [
        {
          name: 'LECHE KIRKLAND',
          unitPrice: 75.5,
          quantity: 2,
          barcode: null,
          sku: '123',
          status: 'matched',
          candidates: [{ articleId: 4, concept: 'Leche', score: 0.95 }],
          selectedArticleId: 4,
          newArticle: null
        }
      ]
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(ReceiptDraftApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('create', () => {
    it('should POST the payload to /receipt-drafts and return the staged draft', () => {
      const payload: CreateReceiptDraftPayload = {
        store: 'Costco',
        date: '2026-06-09',
        items: [{ name: 'LECHE KIRKLAND', unitPrice: 75.5, quantity: 2 }]
      };
      let result: ReceiptDraft | undefined;

      service.create(payload).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/receipt-drafts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBe(payload);
      req.flush(draft);

      expect(result).toEqual(draft);
    });
  });

  describe('scanToDraft', () => {
    it('should POST the file as FormData under the "receipt" key', () => {
      const file = new File(['fake-bytes'], 'ticket.jpg', { type: 'image/jpeg' });
      let result: ReceiptDraft | undefined;

      service.scanToDraft(file).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/receipt-drafts/scan`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);
      expect((req.request.body as FormData).get('receipt')).toBe(file);
      req.flush(draft);

      expect(result).toEqual(draft);
    });
  });

  describe('list', () => {
    it('should GET /receipt-drafts and return the summaries', () => {
      const response: RecordsList<ReceiptDraftSummary> = {
        rows: [{ id: 12, store: 'Costco', expenseDate: '2026-06-09', total: 845.5, status: 'pending', itemCount: 14 }],
        count: 1
      };
      let result: RecordsList<ReceiptDraftSummary> | undefined;

      service.list().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/receipt-drafts`);
      expect(req.request.method).toBe('GET');
      req.flush(response);

      expect(result).toEqual(response);
    });
  });

  describe('getById', () => {
    it('should GET /receipt-drafts/:id and return the full draft', () => {
      let result: ReceiptDraft | undefined;

      service.getById(12).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/receipt-drafts/12`);
      expect(req.request.method).toBe('GET');
      req.flush(draft);

      expect(result).toEqual(draft);
    });
  });

  describe('update', () => {
    it('should PUT the resolutions to /receipt-drafts/:id', () => {
      const payload: UpdateReceiptDraftPayload = {
        store: 'Costco',
        items: draft.data.items,
        costcoMode: true
      };

      service.update(12, payload).subscribe();

      const req = httpMock.expectOne(`${API}/receipt-drafts/12`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBe(payload);
      req.flush(draft);
    });
  });

  describe('confirm', () => {
    it('should POST the payload to /receipt-drafts/:id/confirm and return the expense', () => {
      let result: unknown;

      service.confirm(12, { comment: 'Despensa quincenal' }).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/receipt-drafts/12/confirm`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ comment: 'Despensa quincenal' });
      req.flush({ id: 77, isDraft: true });

      expect(result).toEqual({ id: 77, isDraft: true });
    });

    it('should default to an empty payload when none is given', () => {
      service.confirm(12).subscribe();

      const req = httpMock.expectOne(`${API}/receipt-drafts/12/confirm`);
      expect(req.request.body).toEqual({});
      req.flush({ id: 77 });
    });

    it('should propagate confirmation errors', () => {
      let error: HttpErrorResponse | undefined;

      service.confirm(12).subscribe({
        next: () => fail('should not emit'),
        error: (err: HttpErrorResponse) => (error = err)
      });

      const req = httpMock.expectOne(`${API}/receipt-drafts/12/confirm`);
      req.flush({ message: 'draft incompleto' }, { status: 422, statusText: 'Unprocessable Entity' });

      expect(error?.status).toBe(422);
    });
  });

  describe('delete', () => {
    it('should DELETE /receipt-drafts/:id', () => {
      let completed = false;

      service.delete(12).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/receipt-drafts/12`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });
  });
});
