import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { DashboardToday, DashboardAttention, DashboardWeek } from './hoy.models';

/** Hoy dashboard data (design-spec §4.1). Three read-only aggregates keyed by date. */
@Injectable({ providedIn: 'root' })
export class HoyService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  getToday(date: string): Observable<DashboardToday> {
    return this.http.get<DashboardToday>(`${this.API_URL}/dashboard/today`, { params: { date } });
  }

  getAttention(date: string): Observable<DashboardAttention> {
    return this.http.get<DashboardAttention>(`${this.API_URL}/dashboard/attention`, { params: { date } });
  }

  getWeek(date: string): Observable<DashboardWeek> {
    return this.http.get<DashboardWeek>(`${this.API_URL}/dashboard/week`, { params: { date } });
  }
}
