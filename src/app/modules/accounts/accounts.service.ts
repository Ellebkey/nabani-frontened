import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { toMutedColor } from '@shared/services/maguey-palette';
import { IAccounts, IAccountSection, IAccountSectionDTO, ICreateAccountSection, IUpdateAccountSectionDetails, ITransferDTO, MonthlyTrendDto } from '@shared/interfaces/account.model';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';

@Injectable({
  providedIn: 'root'
})
export class AccountsService extends HttpHelpersService {
  private http = inject(HttpClient);


  public getAccounts(): Observable<IAccounts> {
    return this.http.get<IAccounts>(`${this.API_URL}/accounts`).pipe(map(response => this.withMutedColors(response)));
  }

  public getAccountsWithGraphics(): Observable<IAccounts> {
    return this.http.get<IAccounts>(`${this.API_URL}/accounts/with-graphics`).pipe(map(response => this.withMutedColors(response)));
  }

  // Maguey 2.0 migration: raw stored colors → muted palette, at load time, DB untouched
  private withMutedColors(response: IAccounts): IAccounts {
    const rows = response.rows?.map(account => ({ ...account, colorPalette: toMutedColor(account.colorPalette) }));
    const rawGraphics = response.graphics as any;
    const graphics = rawGraphics?.colors
      ? { ...rawGraphics, colors: rawGraphics.colors.map((color: string) => toMutedColor(color)) }
      : rawGraphics;
    return { ...response, rows, graphics } as IAccounts;
  }

  public getMonthlyTrend(months: number = 6): Observable<MonthlyTrendDto> {
    const params = this.createHttpParams({ months });
    return this.http.get<MonthlyTrendDto>(`${this.API_URL}/accounts/monthly-trend`, { params });
  }

  public getAccountSections(accountId: string): Observable<IAccountSection[]> {
    return this.http.get<IAccountSection[]>(`${this.API_URL}/account-section/account/${accountId}`);
  }

  public updateSection(section: IAccountSectionDTO): Observable<IAccountSection> {
    return this.http.put<IAccountSection>(`${this.API_URL}/account-section`, { ...section });
  }

  public createSection(section: ICreateAccountSection): Observable<IAccountSection> {
    return this.http.post<IAccountSection>(`${this.API_URL}/account-section`, { ...section });
  }

  public updateSectionDetails(id: string, details: IUpdateAccountSectionDetails): Observable<IAccountSection> {
    return this.http.put<IAccountSection>(`${this.API_URL}/account-section/${id}`, { ...details });
  }

  public deleteSection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/account-section/${id}`);
  }

  public accountTransfer(transfer: ITransferDTO): Observable<unknown> {
    return this.http.post(`${this.API_URL}/accounts/transfer`, { ...transfer });
  }

  public getAccountLedger(accountId: string, query: Query): Observable<RecordsList<any>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<any>>(`${this.API_URL}/accounts/${accountId}/ledger`, {params} ).pipe(
      map(response => ({
        ...response,
        rows: response.rows?.map(row => ({
          ...row,
          originAccount: this.withMutedCounterparty(row.originAccount),
          destinationAccount: this.withMutedCounterparty(row.destinationAccount),
        })),
      }))
    );
  }

  private withMutedCounterparty(ref?: { kind: string; colorPalette?: string | null } | null) {
    if (!ref) {
      return ref;
    }
    return ref.kind === 'account' ? { ...ref, colorPalette: toMutedColor(ref.colorPalette) } : ref;
  }
}


