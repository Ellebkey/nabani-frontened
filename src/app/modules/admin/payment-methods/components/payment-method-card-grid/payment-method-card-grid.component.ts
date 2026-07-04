import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { TileComponent } from '@shared/components/tile/tile.component';
import { CcardComponent } from '@shared/components/ccard/ccard.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { DotComponent } from '@shared/components/dot/dot.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgTemplateOutlet } from '@angular/common';

import {
  IPaymentMethod,
  PAYMENT_METHODS
} from '@shared/interfaces/payment-method.model';

@Component({
    selector: 'app-payment-method-card-grid',
    templateUrl: './payment-method-card-grid.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        MatDividerModule,
        NgTemplateOutlet,
        CcardComponent,
        TileComponent,
        PillComponent,
        DotComponent,
        SkeletonComponent
    ]
})
export class PaymentMethodCardGridComponent {
  readonly paymentMethods = input<IPaymentMethod[]>([]);
  readonly loading = input(false);

  readonly edit = output<IPaymentMethod>();
  readonly delete = output<IPaymentMethod>();
  readonly toggleStatus = output<IPaymentMethod>();

  protected readonly PAYMENT_METHODS = PAYMENT_METHODS;

  protected readonly activeMethods = computed(() =>
    this.paymentMethods().filter(m => m.isActive)
  );

  protected readonly inactiveMethods = computed(() =>
    this.paymentMethods().filter(m => !m.isActive)
  );

  protected onEdit(paymentMethod: IPaymentMethod): void {
    this.edit.emit(paymentMethod);
  }

  protected onDelete(paymentMethod: IPaymentMethod): void {
    this.delete.emit(paymentMethod);
  }

  protected onToggleStatus(paymentMethod: IPaymentMethod): void {
    this.toggleStatus.emit(paymentMethod);
  }

  protected getCardColor(paymentMethod: IPaymentMethod): string {
    // If payment method is inactive, always use default gray
    if (!paymentMethod.isActive) {
      return '#6B7280'; // Default gray for inactive cards
    }

    // For active cards, use backgroundColor from backend if available
    if (paymentMethod.backgroundColor) {
      return paymentMethod.backgroundColor;
    }
    
    // Default color for active cards when no backgroundColor is provided
    return '#2a4c3c'; // Default primary color
  }

  protected getCardIcon(paymentMethod: IPaymentMethod): string {
    if (paymentMethod.cardIcon) {
      return paymentMethod.cardIcon;
    }

    const iconMap: Record<string, string> = {
      [PAYMENT_METHODS.CREDIT_CARD]: 'heroicons_outline:credit-card',
      [PAYMENT_METHODS.DEBIT_CARD]: 'heroicons_outline:credit-card',
      [PAYMENT_METHODS.CASH]: 'heroicons_outline:banknotes',
      [PAYMENT_METHODS.BANK_TRANSFER]: 'heroicons_outline:building-library',
      [PAYMENT_METHODS.DIGITAL_WALLET]: 'heroicons_outline:wallet'
    };

    return iconMap[paymentMethod.method] || 'heroicons_outline:credit-card';
  }

  protected getMaskedCardNumber(cardNumber: string | null): string {
    if (!cardNumber) return '';
    
    const lastFour = cardNumber.slice(-4);
    return `•••• •••• •••• ${lastFour}`;
  }

  protected isCardExpiringSoon(cardExpiry: string | null): boolean {
    if (!cardExpiry) return false;
    
    const expiryDate = new Date(cardExpiry);
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    
    return expiryDate <= threeMonthsFromNow && expiryDate >= now;
  }

  protected isCardExpired(cardExpiry: string | null): boolean {
    if (!cardExpiry) return false;
    
    const expiryDate = new Date(cardExpiry);
    const now = new Date();
    
    return expiryDate < now;
  }

  protected getCreditUtilization(_paymentMethod: IPaymentMethod): number {
    return 0;
  }

  protected isCardMethod(method: { method: string }): boolean {
    return method.method === PAYMENT_METHODS.CREDIT_CARD || method.method === PAYMENT_METHODS.DEBIT_CARD;
  }

  protected getMethodIcon(method: string): string {
    const iconMap: Record<string, string> = {
      [PAYMENT_METHODS.CASH]: 'heroicons_outline:banknotes',
      [PAYMENT_METHODS.BANK_TRANSFER]: 'heroicons_outline:arrows-right-left',
      [PAYMENT_METHODS.DIGITAL_WALLET]: 'heroicons_outline:credit-card',
    };
    return iconMap[method] || 'heroicons_outline:credit-card';
  }

  protected getMethodDisplayName(method: string): string {
    const nameMap: Record<string, string> = {
      [PAYMENT_METHODS.CREDIT_CARD]: 'Tarjeta de Crédito',
      [PAYMENT_METHODS.DEBIT_CARD]: 'Tarjeta de Débito',
      [PAYMENT_METHODS.CASH]: 'Efectivo',
      [PAYMENT_METHODS.BANK_TRANSFER]: 'Transferencia',
      [PAYMENT_METHODS.DIGITAL_WALLET]: 'Billetera Digital'
    };

    return nameMap[method] || method;
  }
}