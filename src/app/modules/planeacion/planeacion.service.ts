import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import {
  ICalorieLevel,
  IWeekResponse,
  IMenuDaySummary,
  IMenuDay,
  IMenuDish,
  DishDTO,
  MenuDayAssignDTO,
  IDishOption,
  IIngredientOption,
  AdjustmentFilter,
  IAdjustmentsResponse,
  IAdjustmentDetail,
  ISwapSuggestion,
} from './planeacion.models';

/** Planeación section data (design-spec §4.2–§4.5, §8). */
@Injectable({ providedIn: 'root' })
export class PlaneacionService extends HttpHelpersService {
  private http = inject(HttpClient);

  // ---- Semana (§4.2) ------------------------------------------------------
  getWeek(date: string): Observable<IWeekResponse> {
    return this.http.get<IWeekResponse>(`${this.API_URL}/dashboard/week`, { params: { date } });
  }

  getMenuDays(startDate: string, endDate: string): Observable<RecordsList<IMenuDaySummary>> {
    const params = this.createHttpParams({ startDate, endDate });
    return this.http.get<RecordsList<IMenuDaySummary>>(`${this.API_URL}/menu-days`, { params });
  }

  // Optional convenience endpoint; disabled in the UI when unavailable.
  copyPreviousWeek(date: string): Observable<unknown> {
    return this.http.post(`${this.API_URL}/menu-days/copy-week`, { date });
  }

  // ---- Menú del día (§4.3) ------------------------------------------------
  getMenuDay(date: string): Observable<IMenuDay> {
    return this.http.get<IMenuDay>(`${this.API_URL}/menu-days/by-date/${date}`);
  }

  getCalorieLevels(): Observable<RecordsList<ICalorieLevel>> {
    return this.http.get<RecordsList<ICalorieLevel>>(`${this.API_URL}/calorie-levels`);
  }

  saveDish(dishId: number, dto: DishDTO): Observable<IMenuDish> {
    return this.http.put<IMenuDish>(`${this.API_URL}/dishes/${dishId}`, { ...dto });
  }

  createDish(dto: DishDTO): Observable<IMenuDish> {
    return this.http.post<IMenuDish>(`${this.API_URL}/dishes`, { ...dto });
  }

  assignMenuDay(menuDayId: number, dto: MenuDayAssignDTO): Observable<IMenuDay> {
    return this.http.put<IMenuDay>(`${this.API_URL}/menu-days/${menuDayId}`, { ...dto });
  }

  applyMenuToPatients(date: string): Observable<unknown> {
    return this.http.post(`${this.API_URL}/apply-menu-to-patients`, { date });
  }

  getDishes(query: Query = {}): Observable<RecordsList<IDishOption>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IDishOption>>(`${this.API_URL}/dishes`, { params });
  }

  getIngredients(query: Query = {}): Observable<RecordsList<IIngredientOption>> {
    const params = this.createHttpParams(query);
    return this.http.get<RecordsList<IIngredientOption>>(`${this.API_URL}/ingredients`, { params });
  }

  // ---- Ajustes por paciente (§4.4) ----------------------------------------
  getAdjustments(date: string, filter: AdjustmentFilter): Observable<IAdjustmentsResponse> {
    const params = this.createHttpParams({ date, filter });
    return this.http.get<IAdjustmentsResponse>(`${this.API_URL}/adjustments`, { params });
  }

  getAdjustmentDetail(deliveryDayId: number): Observable<IAdjustmentDetail> {
    return this.http.get<IAdjustmentDetail>(`${this.API_URL}/adjustments/${deliveryDayId}`);
  }

  getSwapSuggestions(
    deliveryDayId: number,
    deliveryMealIngredientId: number,
  ): Observable<RecordsList<ISwapSuggestion>> {
    const params = this.createHttpParams({ deliveryMealIngredientId });
    return this.http.get<RecordsList<ISwapSuggestion>>(
      `${this.API_URL}/adjustments/${deliveryDayId}/swap-suggestions`,
      { params },
    );
  }

  swapIngredient(
    deliveryDayId: number,
    deliveryMealIngredientId: number,
    newIngredientId: number,
  ): Observable<unknown> {
    return this.http.post(`${this.API_URL}/adjustments/${deliveryDayId}/swap`, {
      deliveryMealIngredientId,
      newIngredientId,
    });
  }

  eliminateIngredient(deliveryDayId: number, deliveryMealIngredientId: number): Observable<unknown> {
    return this.http.post(`${this.API_URL}/adjustments/${deliveryDayId}/eliminate`, {
      deliveryMealIngredientId,
    });
  }

  authorize(deliveryDayIds: number[]): Observable<unknown> {
    return this.http.post(`${this.API_URL}/authorize`, { deliveryDayIds });
  }
}
