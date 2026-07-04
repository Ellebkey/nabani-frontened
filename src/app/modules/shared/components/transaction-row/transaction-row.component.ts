import { Component, Input, ChangeDetectionStrategy, HostBinding, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TileComponent } from '../tile/tile.component';

export type AmountTone = 'default' | 'in' | 'out';

@Component({
    selector: 'mg-transaction-row',
    templateUrl: './transaction-row.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, TileComponent]
})
export class TransactionRowComponent {
  readonly title = input('');
  @Input() rid?: string;
  @Input() icon?: string;
  readonly color = input<string>();
  readonly noIcon = input(false);
  // Accepts null so currency pipe results (string | null) bind directly; renders empty like the '' default
  readonly amount = input<string | null>('');
  readonly amountTone = input<AmountTone>('default');
  @Input() amountMeta?: string;
  readonly active = input(false);

  @HostBinding('class')
  get hostClasses(): string {
    return `grid gap-x-3.5 items-center px-5 py-[13px] hover:bg-ink/[.025] ${
      this.noIcon() ? 'grid-cols-[1fr_auto]' : 'grid-cols-[42px_1fr_auto]'
    } ${this.active() ? 'bg-ink/[.025]' : ''}`;
  }
}
