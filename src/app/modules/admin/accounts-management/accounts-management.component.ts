import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { AccountCardGridComponent } from './components/account-card-grid/account-card-grid.component';
import { AccountFormModalComponent } from './modals/account-form-modal/account-form-modal.component';
import { AccountsStateService } from './services/state/accounts-state.service';
import { IAccount, IAccountCreate } from '@shared/interfaces/account.model';

@Component({
    selector: 'app-accounts-management',
    templateUrl: './accounts-management.component.html',
    styleUrl: './accounts-management.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        AccountCardGridComponent,
        RouterLink,
        EmptyStateComponent
    ]
})
export class AccountsManagementComponent implements OnInit {
  private readonly accountsState = inject(AccountsStateService);
  private readonly dialog = inject(MatDialog);
  private readonly magueyConfirmationService = inject(MagueyConfirmationService);

  // Direct access to service signals - no subscriptions needed!
  protected readonly accounts = this.accountsState.accounts;
  protected readonly isLoading = this.accountsState.loading;
  protected readonly error = this.accountsState.error;
  protected readonly isEmpty = this.accountsState.isEmpty;

  ngOnInit(): void {
    this.accountsState.loadAccounts();
  }

  protected openCreateModal(): void {
    const dialogRef = this.dialog.open(AccountFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showCreateConfirmation(result);
      }
    });
  }

  private showCreateConfirmation(accountData: IAccountCreate): void {
    const confirmDialog = this.magueyConfirmationService.open({
      title: 'Confirmar saldo inicial',
      message: 'Una vez creada la cuenta, el <b>saldo inicial no podrá ser modificado manualmente</b>. Solo cambiará a través de gastos, ingresos y transferencias.',
      icon: {
        show: true,
        name: 'heroicons_outline:exclamation-triangle',
        color: 'info',
      },
      actions: {
        confirm: {
          show: true,
          label: 'Confirmar y crear',
          color: 'primary',
        },
        cancel: {
          show: true,
          label: 'Cancelar',
        },
      },
      dismissible: false,
    });

    confirmDialog.afterClosed().subscribe((confirmResult) => {
      if (confirmResult === 'confirmed') {
        this.accountsState.createAccount(accountData);
      }
    });
  }

  protected onToggleStatus(account: IAccount): void {
    this.accountsState.toggleAccountStatus(account.id);
  }

  protected openEditModal(account: IAccount): void {
    const dialogRef = this.dialog.open(AccountFormModalComponent, {
      width: '420px',
      disableClose: true,
      data: account
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.accountsState.updateAccount(account.id, result);
      }
    });
  }

}
