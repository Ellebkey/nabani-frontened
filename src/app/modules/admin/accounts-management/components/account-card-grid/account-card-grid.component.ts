import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { TileComponent } from '@shared/components/tile/tile.component';
import { DotComponent } from '@shared/components/dot/dot.component';
import { PillComponent } from '@shared/components/pill/pill.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IAccount } from '@shared/interfaces/account.model';

@Component({
    selector: 'app-account-card-grid',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CurrencyPipe,
        NgTemplateOutlet,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        TileComponent,
        DotComponent,
        PillComponent,
        EmptyStateComponent
    ],
    templateUrl: './account-card-grid.component.html',
    styleUrl: './account-card-grid.component.scss'
})
export class AccountCardGridComponent {
  readonly accounts = input.required<IAccount[]>();
  readonly editAccount = output<IAccount>();
  readonly toggleStatus = output<IAccount>();

  protected readonly activeAccounts = computed(() =>
    this.accounts().filter(a => !a.disable)
  );

  protected readonly inactiveAccounts = computed(() =>
    this.accounts().filter(a => a.disable)
  );

  protected getCardColor(account: IAccount): string {
    return account.disable ? '#6B7280' : account.colorPalette;
  }
}
