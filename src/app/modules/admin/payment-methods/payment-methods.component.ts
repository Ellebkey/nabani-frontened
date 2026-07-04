import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { PaymentMethodCardGridComponent } from './components/payment-method-card-grid/payment-method-card-grid.component';
import { PaymentMethodFormModalComponent } from './modals/payment-method-form-modal/payment-method-form-modal.component';
import { PaymentMethodsStateService } from './services/state/payment-methods-state.service';
import { CommonService } from '@shared/services/common.service';
import { IPaymentMethod } from '@shared/interfaces/payment-method.model';

@Component({
    selector: 'app-payment-methods',
    templateUrl: './payment-methods.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        PaymentMethodCardGridComponent,
        RouterLink,
        EmptyStateComponent
    ]
})
export class PaymentMethodsComponent implements OnInit {
  private readonly paymentMethodsState = inject(PaymentMethodsStateService);
  private readonly dialog = inject(MatDialog);
  private readonly magueyConfirmationService = inject(MagueyConfirmationService);
  private readonly common = inject(CommonService);

  // Direct access to service signals - no subscriptions needed!
  protected readonly paymentMethods = this.paymentMethodsState.paymentMethods;
  protected readonly isLoading = this.paymentMethodsState.loading;
  protected readonly error = this.paymentMethodsState.error;
  protected readonly isEmpty = this.paymentMethodsState.isEmpty;

  ngOnInit(): void {
    this.paymentMethodsState.loadPaymentMethods();
  }

  protected openCreateModal(): void {
    const dialogRef = this.dialog.open(PaymentMethodFormModalComponent, {
      width: '460px',
      disableClose: true,
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.paymentMethodsState.createPaymentMethod(result);
      }
    });
  }

  protected openEditModal(paymentMethod: IPaymentMethod): void {
    const dialogRef = this.dialog.open(PaymentMethodFormModalComponent, {
      width: '460px',
      disableClose: true,
      data: paymentMethod
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.paymentMethodsState.updatePaymentMethod(paymentMethod.id, result);
      }
    });
  }

  protected onToggleStatus(paymentMethod: IPaymentMethod): void {
    this.paymentMethodsState.togglePaymentMethodStatus(paymentMethod.id);
  }

  protected onDeletePaymentMethod(paymentMethod: IPaymentMethod): void {
    const dialogData = this.common.getDefaultDeleteConfirmation({
      objectName: 'payment method'
    });
    const confirmDialog = this.magueyConfirmationService.open(dialogData);

    confirmDialog.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        this.paymentMethodsState.deletePaymentMethod(paymentMethod.id);
      }
    });
  }
}