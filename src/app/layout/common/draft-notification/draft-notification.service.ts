import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';

import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { RecordsList } from '@shared/interfaces/shared.model';
import { ReceiptDraftApiService } from '@app/modules/expenses/receipt-scan/services/receipt-draft-api.service';
import { ReceiptDraftSummary } from '@app/modules/expenses/receipt-scan/models/receipt-draft.model';

/** Minimal draft info for notification list */
export interface DraftListItem {
  id: number;
  expenseDate: string;
  totalAmount: number;
  recipientName?: string;
  paymentMethodName?: string;
}

@Injectable({ providedIn: 'root' })
export class DraftNotificationService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  private readonly receiptDraftApi = inject(ReceiptDraftApiService);

  private readonly draftsSubject = new BehaviorSubject<DraftListItem[]>([]);
  private readonly countSubject = new BehaviorSubject<number>(0);
  private readonly receiptDraftsSubject = new BehaviorSubject<ReceiptDraftSummary[]>([]);

  readonly drafts$ = this.draftsSubject.asObservable();
  readonly count$ = this.countSubject.asObservable();
  readonly receiptDrafts$ = this.receiptDraftsSubject.asObservable();

  loadDrafts(): Observable<RecordsList<DraftListItem>> {
    const params = this.createHttpParams({ isDraft: true, limit: 50, offset: 0 });
    return this.http.get<RecordsList<DraftListItem>>(
      `${this.API_URL}/expenses`,
      { params }
    ).pipe(
      tap((response) => {
        this.draftsSubject.next(response.rows || []);
        this.countSubject.next(response.count || 0);
      }),
      catchError((error) => {
        console.error('Error loading drafts:', error);
        return of({ rows: [], count: 0 });
      })
    );
  }

  /** Pending receipt drafts ("Recibos por revisar"). */
  loadReceiptDrafts(): void {
    this.receiptDraftApi.list().subscribe({
      next: (res) => this.receiptDraftsSubject.next(res.rows || []),
      error: (error) => console.error('Error loading receipt drafts:', error),
    });
  }

  /** Refresh both lists: draft expenses ("Borradores") and pending receipt drafts. */
  refreshCount(): void {
    this.loadDrafts().subscribe();
    this.loadReceiptDrafts();
  }

  clearDrafts(): void {
    this.draftsSubject.next([]);
    this.countSubject.next(0);
    this.receiptDraftsSubject.next([]);
  }
}
