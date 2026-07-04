import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotToastService } from '@ngxpert/hot-toast';

import { IPaymentMethod, IPaymentMethodCreate, IPaymentMethodUpdate } from '@shared/interfaces/payment-method.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';
import { PaymentMethodsApiService } from '../api/payment-methods-api.service';

@Injectable({ providedIn: 'root' })
export class PaymentMethodsStateService {
  private readonly paymentMethodsApi = inject(PaymentMethodsApiService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paymentMethodsSignal = signal<IPaymentMethod[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly paginationSignal = signal<PaginationSetting>({
    limit: 25,
    offset: 0,
    searchText: null,
    count: 0,
    showInputSearch: true
  });

  readonly paymentMethods = this.paymentMethodsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();

  readonly paymentMethodCount = computed(() => this.paymentMethodsSignal().length);
  readonly isEmpty = computed(() => !this.loadingSignal() && this.paymentMethodCount() === 0);
  readonly hasPaymentMethods = computed(() => this.paymentMethodCount() > 0);

  loadPaymentMethods(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const currentPagination = this.paginationSignal();

    this.paymentMethodsApi.getPaymentMethods({
      limit: currentPagination.limit,
      offset: currentPagination.offset,
      includeDisabled: true,
      ...(currentPagination.searchText && { searchText: currentPagination.searchText })
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.paymentMethodsSignal.set(response.rows);
          this.paginationSignal.update(p => ({ ...p, count: response.count }));
          this.loadingSignal.set(false);
        },
        error: () => {
          this.errorSignal.set('Error al cargar los métodos de pago');
          this.toast.error('Error al cargar los métodos de pago');
          this.loadingSignal.set(false);
        }
      });
  }

  createPaymentMethod(paymentMethodData: IPaymentMethodCreate): void {
    this.loadingSignal.set(true);

    this.paymentMethodsApi.createPaymentMethod(paymentMethodData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newPaymentMethod) => {
          this.paymentMethodsSignal.update(methods => [...methods, newPaymentMethod]);
          this.paginationSignal.update(p => ({ ...p, count: (p.count ?? 0) + 1 }));
          this.toast.success('Método de pago creado exitosamente');
          this.loadingSignal.set(false);
        },
        error: () => {
          this.toast.error('Error al crear el método de pago');
          this.loadingSignal.set(false);
        }
      });
  }

  updatePaymentMethod(id: string, paymentMethodData: IPaymentMethodUpdate): void {
    this.loadingSignal.set(true);

    this.paymentMethodsApi.updatePaymentMethod(id, paymentMethodData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedPaymentMethod) => {
          this.paymentMethodsSignal.update(methods =>
            methods.map(m => m.id === id ? updatedPaymentMethod : m)
          );
          this.toast.success('Método de pago actualizado exitosamente');
          this.loadingSignal.set(false);
        },
        error: () => {
          this.toast.error('Error al actualizar el método de pago');
          this.loadingSignal.set(false);
        }
      });
  }

  deletePaymentMethod(id: string): void {
    this.loadingSignal.set(true);

    this.paymentMethodsApi.deletePaymentMethod(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.paymentMethodsSignal.update(methods => methods.filter(pm => pm.id !== id));
          this.paginationSignal.update(p => ({ ...p, count: Math.max(0, (p.count ?? 0) - 1) }));
          this.toast.success('Método de pago eliminado exitosamente');
          this.loadingSignal.set(false);
        },
        error: () => {
          this.toast.error('Error al eliminar el método de pago');
          this.loadingSignal.set(false);
        }
      });
  }

  togglePaymentMethodStatus(id: string): void {
    const paymentMethod = this.paymentMethodsSignal().find(pm => pm.id === id);
    if (!paymentMethod) return;

    const newStatus = !paymentMethod.isActive;

    this.paymentMethodsApi.togglePaymentMethodStatus(id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedPaymentMethod) => {
          this.paymentMethodsSignal.update(methods =>
            methods.map(m => m.id === id ? updatedPaymentMethod : m)
          );
          this.toast.success(
            `Método de pago ${newStatus ? 'activado' : 'desactivado'} exitosamente`
          );
        },
        error: () => {
          this.toast.error('Error al cambiar el estado del método de pago');
        }
      });
  }

  updatePagination(paginationUpdate: Partial<PaginationSetting>): void {
    this.paginationSignal.update(current => ({ ...current, ...paginationUpdate }));
    this.loadPaymentMethods();
  }
}
