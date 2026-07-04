import { Injectable, inject } from '@angular/core';
import { toMutedColor } from '@shared/services/maguey-palette';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  IPaymentMethod,
  IPaymentMethodCreate,
  IPaymentMethodUpdate,
  PaymentMethodsResponse,
  CARD_GRADIENTS
} from '@shared/interfaces/payment-method.model';
import { Query } from '@shared/interfaces/shared.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';

interface BackendListItem {
  id: string;
  name: string;
  shortName: string;
  method: string;
  cardNumber: string | null;
  accountId: string;
  accountName: string;
  isActive: boolean;
  backgroundColor?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodsApiService extends HttpHelpersService {
  private readonly http = inject(HttpClient);

  getPaymentMethods(query: Query): Observable<PaymentMethodsResponse> {
    const params = this.createHttpParams(query);

    return this.http.get<BackendListItem[]>(`${this.API_URL}/payment-methods`, { params })
      .pipe(
        map((items: BackendListItem[]) => ({
          rows: items.map(item => {
            const mapped = this.mapListItem(item);
            return { ...mapped, backgroundColor: toMutedColor(mapped.backgroundColor) };
          }),
          count: items.length
        }))
      );
  }

  getPaymentMethod(id: string): Observable<IPaymentMethod> {
    return this.http.get<BackendListItem>(`${this.API_URL}/payment-methods/${id}`)
      .pipe(
        map(this.mapListItem)
      );
  }

  createPaymentMethod(paymentMethodData: IPaymentMethodCreate): Observable<IPaymentMethod> {
    const payload = {
      shortName: paymentMethodData.shortName,
      method: paymentMethodData.method,
      accountId: paymentMethodData.accountId,
      ...(paymentMethodData.backgroundColor && { backgroundColor: paymentMethodData.backgroundColor }),
      ...(paymentMethodData.cardNumber && { cardNumber: paymentMethodData.cardNumber }),
      isActive: paymentMethodData.isActive ?? true
    };

    return this.http.post<BackendListItem>(`${this.API_URL}/payment-methods`, payload)
      .pipe(map(this.mapListItem));
  }

  updatePaymentMethod(id: string, paymentMethodData: IPaymentMethodUpdate): Observable<IPaymentMethod> {
    const payload = {
      shortName: paymentMethodData.shortName,
      method: paymentMethodData.method,
      accountId: paymentMethodData.accountId,
      ...(paymentMethodData.backgroundColor && { backgroundColor: paymentMethodData.backgroundColor }),
      ...(paymentMethodData.cardNumber !== undefined ? { cardNumber: paymentMethodData.cardNumber } : {}),
      isActive: paymentMethodData.isActive ?? true
    };

    return this.http.put<BackendListItem>(`${this.API_URL}/payment-methods/${id}`, payload)
      .pipe(map(this.mapListItem));
  }

  deletePaymentMethod(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/payment-methods/${id}`);
  }

  togglePaymentMethodStatus(id: string, isActive: boolean): Observable<IPaymentMethod> {
    return this.http.put<BackendListItem>(`${this.API_URL}/payment-methods/${id}`, { isActive })
      .pipe(
        map(this.mapListItem)
      );
  }

  private mapListItem = (item: BackendListItem): IPaymentMethod => {
    const defaultColor = CARD_GRADIENTS[0].primary;

    return {
      id: item.id,
      shortName: item.shortName,
      method: item.method,
      cardType: null,
      backgroundColor: item.backgroundColor || defaultColor,
      cardIcon: null,
      cardNumber: item.cardNumber,
      cardCVV: null,
      cardExpiry: null,
      creditLimit: null,
      cutOffDay: null,
      isActive: item.isActive,
      accountId: item.accountId,
      accountName: item.accountName,
      account: undefined
    };
  };
}
