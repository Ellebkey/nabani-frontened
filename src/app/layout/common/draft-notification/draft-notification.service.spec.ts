import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Observable, of, throwError } from 'rxjs';

import { DraftListItem, DraftNotificationService } from './draft-notification.service';
import { ReceiptDraftApiService } from '@app/modules/expenses/receipt-scan/services/receipt-draft-api.service';
import { ReceiptDraftSummary } from '@app/modules/expenses/receipt-scan/models/receipt-draft.model';
import { RecordsList } from '@shared/interfaces/shared.model';

const DRAFTS_URL = 'http://localhost:4040/api/expenses?isDraft=true&limit=50&offset=0';

describe('DraftNotificationService', () => {
  let service: DraftNotificationService;
  let httpMock: HttpTestingController;
  let receiptDraftApi: { list: jest.Mock };
  let consoleError: jest.SpyInstance;

  const draft: DraftListItem = {
    id: 7,
    expenseDate: '2026-06-01',
    totalAmount: 350.5,
    recipientName: 'Costco',
    paymentMethodName: 'BBVA Oro'
  };

  const receiptDraft: ReceiptDraftSummary = {
    id: 3,
    store: 'Soriana',
    expenseDate: '2026-06-02',
    total: 120,
    status: 'pending',
    itemCount: 4
  };

  const read = <T>(stream: Observable<T>): T => {
    let value!: T;
    stream.subscribe(emitted => (value = emitted)).unsubscribe();
    return value;
  };

  beforeEach(() => {
    receiptDraftApi = { list: jest.fn() };
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ReceiptDraftApiService, useValue: receiptDraftApi }]
    });

    service = TestBed.inject(DraftNotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    consoleError.mockRestore();
  });

  describe('loadDrafts', () => {
    it('should GET the drafts list and publish rows and count', () => {
      let result: RecordsList<DraftListItem> | undefined;
      service.loadDrafts().subscribe(response => (result = response));

      const req = httpMock.expectOne(DRAFTS_URL);
      expect(req.request.method).toBe('GET');
      req.flush({ rows: [draft], count: 1 });

      expect(result).toEqual({ rows: [draft], count: 1 });
      expect(read(service.drafts$)).toEqual([draft]);
      expect(read(service.count$)).toBe(1);
    });

    it('should default to an empty list and zero count when the response has no rows', () => {
      service.loadDrafts().subscribe();

      httpMock.expectOne(DRAFTS_URL).flush({});

      expect(read(service.drafts$)).toEqual([]);
      expect(read(service.count$)).toBe(0);
    });

    it('should recover with an empty fallback and keep prior state on error', () => {
      service.loadDrafts().subscribe();
      httpMock.expectOne(DRAFTS_URL).flush({ rows: [draft], count: 1 });

      let result: RecordsList<DraftListItem> | undefined;
      service.loadDrafts().subscribe(response => (result = response));
      httpMock.expectOne(DRAFTS_URL).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(result).toEqual({ rows: [], count: 0 });
      expect(consoleError).toHaveBeenCalled();
      expect(read(service.drafts$)).toEqual([draft]);
      expect(read(service.count$)).toBe(1);
    });
  });

  describe('loadReceiptDrafts', () => {
    it('should publish pending receipt drafts from the api', () => {
      receiptDraftApi.list.mockReturnValue(of({ rows: [receiptDraft], count: 1 }));

      service.loadReceiptDrafts();

      expect(read(service.receiptDrafts$)).toEqual([receiptDraft]);
    });

    it('should default to an empty list when the response has no rows', () => {
      receiptDraftApi.list.mockReturnValue(of({ rows: null, count: 0 }));

      service.loadReceiptDrafts();

      expect(read(service.receiptDrafts$)).toEqual([]);
    });

    it('should log and keep state intact on error', () => {
      receiptDraftApi.list.mockReturnValue(of({ rows: [receiptDraft], count: 1 }));
      service.loadReceiptDrafts();

      receiptDraftApi.list.mockReturnValue(throwError(() => new Error('boom')));
      service.loadReceiptDrafts();

      expect(consoleError).toHaveBeenCalled();
      expect(read(service.receiptDrafts$)).toEqual([receiptDraft]);
    });
  });

  describe('refreshCount', () => {
    it('should reload both draft expenses and receipt drafts', () => {
      receiptDraftApi.list.mockReturnValue(of({ rows: [receiptDraft], count: 1 }));

      service.refreshCount();

      httpMock.expectOne(DRAFTS_URL).flush({ rows: [draft], count: 1 });

      expect(receiptDraftApi.list).toHaveBeenCalledTimes(1);
      expect(read(service.drafts$)).toEqual([draft]);
      expect(read(service.count$)).toBe(1);
      expect(read(service.receiptDrafts$)).toEqual([receiptDraft]);
    });
  });

  describe('clearDrafts', () => {
    it('should reset all streams to their empty state', () => {
      receiptDraftApi.list.mockReturnValue(of({ rows: [receiptDraft], count: 1 }));
      service.refreshCount();
      httpMock.expectOne(DRAFTS_URL).flush({ rows: [draft], count: 1 });

      service.clearDrafts();

      expect(read(service.drafts$)).toEqual([]);
      expect(read(service.count$)).toBe(0);
      expect(read(service.receiptDrafts$)).toEqual([]);
    });
  });
});
