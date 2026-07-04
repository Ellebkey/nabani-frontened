import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import {
  ProductionMap,
  DeliveryLabels,
  KitchenView,
  ShoppingList,
} from './produccion.models';

/** Producción section data access (design-spec §4.6–§4.9). Every endpoint is
 *  read-only, derived from the daily menu, and keyed by `?date=YYYY-MM-DD`
 *  (Compras also accepts `?week=`). JWT is attached by the app interceptor. */
@Injectable({
  providedIn: 'root',
})
export class ProduccionService extends HttpHelpersService {
  private http = inject(HttpClient);

  // ---- Mapa de producción (design-spec §4.6) ------------------------------
  getProductionMap(date: string): Observable<ProductionMap> {
    const params = this.createHttpParams({ date });
    return this.http.get<ProductionMap>(`${this.API_URL}/production-map`, { params });
  }

  // ---- Etiquetas de entrega (design-spec §4.7) ----------------------------
  getDeliveryLabels(date: string): Observable<DeliveryLabels> {
    const params = this.createHttpParams({ date });
    return this.http.get<DeliveryLabels>(`${this.API_URL}/delivery-labels`, { params });
  }

  // ---- Vista cocina (design-spec §4.8) ------------------------------------
  getKitchenView(date: string): Observable<KitchenView> {
    const params = this.createHttpParams({ date });
    return this.http.get<KitchenView>(`${this.API_URL}/kitchen-view`, { params });
  }

  // ---- Compras y costos (design-spec §4.9) --------------------------------
  // Hoy → { date }, Semana → { week }; createHttpParams drops the empty one.
  getShoppingList(query: { date?: string; week?: string }): Observable<ShoppingList> {
    const params = this.createHttpParams(query);
    return this.http.get<ShoppingList>(`${this.API_URL}/shopping-list`, { params });
  }
}
