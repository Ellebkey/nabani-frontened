import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@root/environments/environment';
import {
  IPartnership,
  IPartnershipInvite,
  IPartnershipInviteCreated,
  IExcludedCategory,
  ISharedSpending,
  ISharedTicket,
  IFamilyBudget,
  IFamilyBudgetCreate,
  IBudgetStatus
} from '../../models/family.model';

@Injectable({ providedIn: 'root' })
export class FamilyApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.url;

  getMyPartnership(): Observable<IPartnership | null> {
    return this.http.get<IPartnership | null>(`${this.API_URL}/partnerships/me`);
  }

  createPartnership(data: { name?: string }): Observable<IPartnership> {
    return this.http.post<IPartnership>(`${this.API_URL}/partnerships`, data);
  }

  dissolvePartnership(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/partnerships/me`);
  }

  getInvites(): Observable<IPartnershipInvite[]> {
    return this.http.get<IPartnershipInvite[]>(`${this.API_URL}/partnerships/invites`);
  }

  createInvite(email: string): Observable<IPartnershipInviteCreated> {
    return this.http.post<IPartnershipInviteCreated>(`${this.API_URL}/partnerships/invites`, { email });
  }

  revokeInvite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/partnerships/invites/${id}`);
  }

  acceptInvite(token: string): Observable<IPartnership> {
    return this.http.post<IPartnership>(`${this.API_URL}/partnerships/invites/accept`, { token });
  }

  removeMember(memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/partnerships/members/${memberId}`);
  }

  getExcludedCategories(): Observable<IExcludedCategory[]> {
    return this.http.get<IExcludedCategory[]>(`${this.API_URL}/partnerships/excluded-categories`);
  }

  setExcludedCategories(categoryIds: number[]): Observable<IExcludedCategory[]> {
    return this.http.put<IExcludedCategory[]>(`${this.API_URL}/partnerships/excluded-categories`, { categoryIds });
  }

  getSharedSpending(periodMonth: string): Observable<ISharedSpending> {
    return this.http.get<ISharedSpending>(`${this.API_URL}/partnerships/shared/spending`, { params: { periodMonth } });
  }

  getSharedExpenses(periodMonth: string): Observable<ISharedTicket[]> {
    return this.http.get<ISharedTicket[]>(`${this.API_URL}/partnerships/shared/expenses`, { params: { periodMonth } });
  }

  getBudgets(periodMonth: string): Observable<IFamilyBudget[]> {
    return this.http.get<IFamilyBudget[]>(`${this.API_URL}/partnerships/budgets`, { params: { periodMonth } });
  }

  createBudget(data: IFamilyBudgetCreate): Observable<IFamilyBudget> {
    return this.http.post<IFamilyBudget>(`${this.API_URL}/partnerships/budgets`, data);
  }

  updateBudget(id: string, amount: number): Observable<IFamilyBudget> {
    return this.http.put<IFamilyBudget>(`${this.API_URL}/partnerships/budgets/${id}`, { amount });
  }

  deleteBudget(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/partnerships/budgets/${id}`);
  }

  getBudgetStatus(periodMonth: string): Observable<IBudgetStatus> {
    return this.http.get<IBudgetStatus>(`${this.API_URL}/partnerships/budgets/status`, { params: { periodMonth } });
  }
}
