import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { RecordsList } from '@shared/interfaces/shared.model';
import { IExpense } from '@shared/interfaces/expense.model';
import {
  ReceiptDraft,
  ReceiptDraftSummary,
  CreateReceiptDraftPayload,
  UpdateReceiptDraftPayload,
  ConfirmReceiptDraftPayload,
} from '../models/receipt-draft.model';

@Injectable({ providedIn: 'root' })
export class ReceiptDraftApiService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  /** Create a staged draft from extracted items (the matcher runs server-side). */
  create(payload: CreateReceiptDraftPayload): Observable<ReceiptDraft> {
    return this.http.post<ReceiptDraft>(`${this.API_URL}/receipt-drafts`, payload);
  }

  /** Scan a receipt image (premium/admin): Gemini extracts + stages a draft in one call. */
  scanToDraft(file: File): Observable<ReceiptDraft> {
    const formData = new FormData();
    formData.append('receipt', file);
    return this.http.post<ReceiptDraft>(`${this.API_URL}/receipt-drafts/scan`, formData);
  }

  /** List pending drafts (summary). */
  list(): Observable<RecordsList<ReceiptDraftSummary>> {
    return this.http.get<RecordsList<ReceiptDraftSummary>>(`${this.API_URL}/receipt-drafts`);
  }

  /** Load a full draft (items + candidates) for verification. */
  getById(id: number): Observable<ReceiptDraft> {
    return this.http.get<ReceiptDraft>(`${this.API_URL}/receipt-drafts/${id}`);
  }

  /** Persist the user's resolutions. */
  update(id: number, payload: UpdateReceiptDraftPayload): Observable<ReceiptDraft> {
    return this.http.put<ReceiptDraft>(`${this.API_URL}/receipt-drafts/${id}`, payload);
  }

  /** Confirm into a draft expense (then completed via the existing draft flow). */
  confirm(id: number, payload: ConfirmReceiptDraftPayload = {}): Observable<IExpense> {
    return this.http.post<IExpense>(`${this.API_URL}/receipt-drafts/${id}/confirm`, payload);
  }

  /** Discard a draft. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/receipt-drafts/${id}`);
  }
}
