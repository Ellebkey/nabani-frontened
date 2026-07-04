import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { RecordsList } from '@shared/interfaces/shared.model';
import { IExpense } from '@shared/interfaces/expense.model';
import {
  CreateDraftExpenseDto,
  CompleteDraftDto,
} from '../models/receipt-scan.model';

@Injectable({ providedIn: 'root' })
export class ReceiptScanApiService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  /**
   * Create a draft expense from processed receipt items
   * @param dto - Draft expense data
   * @returns Observable with created expense
   */
  createDraftExpense(dto: CreateDraftExpenseDto): Observable<IExpense> {
    return this.http.post<IExpense>(
      `${this.API_URL}/expenses`,
      { ...dto, isDraft: true }
    );
  }

  /**
   * Get all draft expenses
   * @returns Observable with list of draft expenses
   */
  getDraftExpenses(): Observable<RecordsList<IExpense>> {
    const params = this.createHttpParams({ isDraft: true });
    return this.http.get<RecordsList<IExpense>>(
      `${this.API_URL}/expenses`,
      { params }
    );
  }

  /**
   * Complete a draft expense
   * @param id - Draft expense ID
   * @param dto - Completion data
   * @returns Observable with updated expense
   */
  completeDraft(id: number, dto: CompleteDraftDto): Observable<IExpense> {
    return this.http.put<IExpense>(
      `${this.API_URL}/expenses/${id}`,
      { ...dto, isDraft: false }
    );
  }

  /**
   * Delete a draft expense
   * @param id - Draft expense ID
   * @returns Observable
   */
  deleteDraft(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/expenses/${id}`
    );
  }
}
