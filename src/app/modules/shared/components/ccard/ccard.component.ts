import { Component, ChangeDetectionStrategy, HostBinding, input } from '@angular/core';

@Component({
  selector: 'mg-ccard',
  template: `
    <div class="chip"></div>
    <div class="num4">•••• {{ lastDigits() || '0000' }}</div>
    <div class="nm">
      <span>{{ name() }}</span>
      <span>{{ subtitle() }}</span>
    </div>
  `,
  styleUrl: './ccard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class CcardComponent {
  readonly name = input('');
  readonly subtitle = input('Crédito');
  readonly lastDigits = input<string | null>('');
  readonly color = input<string>();

  @HostBinding('style.--cc')
  get cardColor(): string {
    return this.color() || '#3B5F82';
  }
}
