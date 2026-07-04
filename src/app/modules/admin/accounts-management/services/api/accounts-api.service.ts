import { Injectable, inject } from '@angular/core';
import { toMutedColor } from '@shared/services/maguey-palette';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { IAccount, IAccountCreate, IAccountUpdate, AccountsResponse } from '@shared/interfaces/account.model';
import { Query } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';

/**
 * API Service Layer - Handles all HTTP operations for accounts
 *
 * Responsibilities:
 * - Pure HTTP communications with backend
 * - Request/response transformations
 * - No state management
 * - Returns Observables for reactive programming
 */
@Injectable({ providedIn: 'root' })
export class AccountsApiService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch all accounts from the API with pagination
   * @returns Observable of accounts response with count
   * @param query
   */
  getAccounts(query: Query): Observable<AccountsResponse> {
    const params = this.createHttpParams(query);

    return this.http.get<AccountsResponse>(`${this.API_URL}/accounts`, { params }).pipe(
      map(response => ({
        ...response,
        rows: response.rows?.map(account => ({ ...account, colorPalette: toMutedColor(account.colorPalette) })),
      }))
    );
  }

  /**
   * Fetch a single account by ID
   * @param id - Account ID
   * @returns Observable of account
   */
  getAccount(id: string): Observable<IAccount> {
    return this.http.get<IAccount>(`${this.API_URL}/accounts/${id}`);
  }

  /**
   * Create a new account
   * @param accountData - Account creation data
   * @returns Observable of created account
   */
  createAccount(accountData: IAccountCreate): Observable<IAccount> {
    const payload = {
      name: accountData.name,
      currentAmount: accountData.currentAmount,
      colorPalette: accountData.colorPalette
    };

    return this.http.post<IAccount>(`${this.API_URL}/accounts`, payload);
  }

  /**
   * Update an existing account
   * @param id - Account ID
   * @param accountData - Account update data
   * @returns Observable of updated account
   */
  updateAccount(id: string, accountData: IAccountUpdate): Observable<IAccount> {
    const payload = {
      name: accountData.name,
      colorPalette: accountData.colorPalette,
    };

    return this.http.put<IAccount>(`${this.API_URL}/accounts/${id}`, payload);
  }

  toggleAccountStatus(id: string, disable: boolean): Observable<IAccount> {
    return this.http.put<IAccount>(`${this.API_URL}/accounts/${id}`, { disable });
  }
}
