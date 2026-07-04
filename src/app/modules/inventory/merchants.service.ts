import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';
import { Query, RecordsList } from '@shared/interfaces/shared.model';
import { IMerchant } from '@shared/interfaces/merchant.model';


@Injectable({
  providedIn: 'root'
})
export class MerchantsService extends HttpHelpersService {
  private http = inject(HttpClient);


  getMerchantsList (query: Query): Observable<RecordsList<IMerchant>> {
    const params = this.createHttpParams(query);

    return this.http.get<RecordsList<IMerchant>>(`${this.API_URL}/recipients`, {params});
  }

  createMerchant(merchant: IMerchant): Observable<IMerchant> {
    return this.http.post<IMerchant>(`${this.API_URL}/recipients`, { ...merchant });
  }

  updateMerchantsState(merchants: IMerchant[]): Observable<IMerchant[]> {
    return this.http.put<IMerchant[]>(`${this.API_URL}/recipients`, { merchants });
  }

  updateMerchant(id: number, merchant: Partial<IMerchant>): Observable<IMerchant> {
    return this.http.put<IMerchant>(`${this.API_URL}/recipients/${id}`, merchant);
  }

  destroyMerchant(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.API_URL}/recipients/${id}`);
  }
}
