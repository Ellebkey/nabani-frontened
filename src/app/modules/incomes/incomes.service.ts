import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Query, RecordsList } from '@shared/interfaces/shared.model'
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { IIncome, IIncomeStats, IncomeDTO } from '@shared/interfaces/income.model';
import { toMutedColor } from '@shared/services/maguey-palette';

@Injectable({
  providedIn: 'root'
})
export class IncomesService extends HttpHelpersService{
  private http = inject(HttpClient);


  getIncomeStats(): Observable<IIncomeStats> {
    return this.http.get<IIncomeStats>(`${this.API_URL}/incomes/stats`);
  }

  getIncomes(query: Query): Observable<RecordsList<IIncome>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IIncome>>(`${this.API_URL}/incomes`, {params}).pipe(
      map(response => ({
        ...response,
        rows: response.rows?.map(income => ({ ...income, accountColor: toMutedColor((income as any).accountColor) })),
      }))
    );
  }

  saveIncome(income: IncomeDTO): Observable<IIncome> {
    return this.http.post<IIncome>(`${this.API_URL}/incomes`, { ...income });
  }

  deleteIncome(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/incomes/${id}`);
  }

  getIncomeDetails(id: number): Observable<unknown> {
    return this.http.get(`${this.API_URL}/incomes/${id}`);
  }

  updateIncome(id: number, income: IncomeDTO): Observable<any> {
    return this.http.put(`${this.API_URL}/incomes/${id}`, { ...income });
  }
}
