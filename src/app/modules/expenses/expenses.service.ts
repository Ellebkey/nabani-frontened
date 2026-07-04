import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { AuthService } from '@app/core/auth/auth.service';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { toMutedColor } from '@shared/services/maguey-palette';
import { IExpense, Category, IExpenseDateGroup } from '@shared/interfaces/expense.model';
import { PaymentMethod } from '@shared/interfaces/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpensesService extends HttpHelpersService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);


  getExpenses(query: Query): Observable<RecordsList<IExpenseDateGroup>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IExpenseDateGroup>>(`${this.API_URL}/expenses`, {params} ).pipe(
      map(response => ({
        ...response,
        rows: response.rows?.map(group => ({
          ...group,
          expenses: group.expenses?.map(expense => ({ ...expense, backgroundColor: toMutedColor(expense.backgroundColor) })),
        })),
      }))
    );
  }

  saveExpense(expense: IExpense): Observable<any> {
    return this.http.post(`${this.API_URL}/expenses`, { ...expense });
  }

  updateExpense(id: number, expense: IExpense): Observable<any> {
    return this.http.put(`${this.API_URL}/expenses/${id}`, { ...expense });
  }

  getExpensesByCategory(query: Query) {
    const params = this.createHttpParams(query);

    return this.http.get<any>(`${this.API_URL}/total-expenses-by-category`, {params} );
  }

  getExpenseById(id: number): Observable<IExpense> {
    return this.http.get<IExpense>(`${this.API_URL}/expenses/${id}`);
  }

  getPaymentMethods(query: Query): Observable<PaymentMethod[]> {
    const params = this.createHttpParams(query);
    return this.http.get<PaymentMethod[]>(`${this.API_URL}/payment-methods`, { params }).pipe(
      map(methods => methods.map(method => ({
        ...method,
        backgroundColor: toMutedColor((method as any).backgroundColor),
      })))
    );
  }

  getCreditDebt(paymentMethodId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/credit-cards/${paymentMethodId}/debt-summary`).pipe(
      map(card => (card ? { ...card, backgroundColor: toMutedColor(card.backgroundColor) } : card))
    );
  }

  getCreditCards() {
    return this.http.get<any>(`${this.API_URL}/credit-cards`).pipe(
      map((cards: any[]) => cards?.map(card => ({ ...card, backgroundColor: toMutedColor(card.backgroundColor) })))
    );
  }

  getCreditCardStatement(query: Query) {
    const params = this.createHttpParams(query);
    return this.http.get<any>(`${this.API_URL}/credit-cards/statement`, {params});
  }

  createCreditCardStatement(expense: any): Observable<any> {
    return this.http.post(`${this.API_URL}/credit-cards/statement/payment`, { ...expense });
  }

  // ###########################################3

  // Refactor all services correctly
  deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/expenses/${id}`);
  }

  getExpenseItems(query: Query): Observable<any> {
    const params = this.createHttpParams(query);
    return this.http.get<any>(`${this.API_URL}/purchased-items`, { params });
  }

  /* Categories */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.API_URL}/categories`);
  }

  getCategoriesForUser(): Observable<Category[]> {
    return this.getCategories().pipe(map(categories => this.filterCategoriesByTier(categories)));
  }

  private filterCategoriesByTier(categories: Category[]): Category[] {
    if (this.authService.isAdmin()) {
      return categories;
    }
    const userRoles = this.authService.getUserRoles() || [];
    return categories
      .filter(cat => cat.enabledTiers?.some(tier => userRoles.includes(tier)) ?? true)
      .map(cat => ({
        ...cat,
        subcategories: cat.subcategories.filter(sub =>
          sub.enabledTiers?.some(tier => userRoles.includes(tier)) ?? true
        ),
      }));
  }

  /* Payment Methods */
  updatePaymentMethod(id: string, paymentMethod: any): Observable<any> {
    return this.http.put(`${this.API_URL}/payment-methods/${id}`, paymentMethod);
  }
}
