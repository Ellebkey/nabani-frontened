import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import {
  PaymentsList,
  IPayment,
  PaymentUpdateDTO,
  IDailyIncomes,
  ExpensesList,
  IExpense,
  ExpenseDTO,
  IBeneficiary,
  IBalance,
  IPackage,
  PackageDTO,
} from './finanzas.models';

@Injectable({
  providedIn: 'root',
})
export class FinanzasService extends HttpHelpersService {
  private http = inject(HttpClient);

  // ---- Cobranza (design-spec §4.12) ---------------------------------------
  getPayments(query: Query): Observable<PaymentsList> {
    const params = this.createHttpParams(query);
    return this.http.get<PaymentsList>(`${this.API_URL}/payments`, { params });
  }

  registerPayment(id: number, dto: PaymentUpdateDTO): Observable<IPayment> {
    return this.http.put<IPayment>(`${this.API_URL}/payments/${id}`, { ...dto });
  }

  deletePayment(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/payments/${id}`);
  }

  // ---- Ingresos Diarios (design-spec §4.13) -------------------------------
  getDailyIncomes(query: Query): Observable<IDailyIncomes> {
    const params = this.createHttpParams(query);
    return this.http.get<IDailyIncomes>(`${this.API_URL}/daily-incomes`, { params });
  }

  // ---- Gastos (design-spec §4.14) -----------------------------------------
  getExpenses(query: Query): Observable<ExpensesList> {
    const params = this.createHttpParams(query);
    return this.http.get<ExpensesList>(`${this.API_URL}/expenses`, { params });
  }

  saveExpense(dto: ExpenseDTO): Observable<IExpense> {
    return this.http.post<IExpense>(`${this.API_URL}/expenses`, { ...dto });
  }

  updateExpense(id: number, dto: ExpenseDTO): Observable<IExpense> {
    return this.http.put<IExpense>(`${this.API_URL}/expenses/${id}`, { ...dto });
  }

  deleteExpense(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/expenses/${id}`);
  }

  getBeneficiaries(query: Query = {}): Observable<RecordsList<IBeneficiary>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IBeneficiary>>(`${this.API_URL}/beneficiaries`, { params });
  }

  // ---- Balance General (design-spec §4.15) --------------------------------
  getBalance(query: Query): Observable<IBalance> {
    const params = this.createHttpParams(query);
    return this.http.get<IBalance>(`${this.API_URL}/balance`, { params });
  }

  // ---- Paquetes (design-spec §4.16) ---------------------------------------
  getPackages(query: Query): Observable<RecordsList<IPackage>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IPackage>>(`${this.API_URL}/packages`, { params });
  }

  savePackage(dto: PackageDTO): Observable<IPackage> {
    return this.http.post<IPackage>(`${this.API_URL}/packages`, { ...dto });
  }

  updatePackage(id: number, dto: PackageDTO): Observable<IPackage> {
    return this.http.put<IPackage>(`${this.API_URL}/packages/${id}`, { ...dto });
  }

  deletePackage(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/packages/${id}`);
  }
}
