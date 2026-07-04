import { Component, ChangeDetectionStrategy, HostBinding, input } from '@angular/core';

export type PillVariant = 'tint' | 'neutral' | 'solid' | 'teal' | 'rose' | 'amber' | 'outline' | 'brand';
export type PillSize = 'base' | 'sm';

@Component({
  selector: 'mg-pill',
  template: `
    @if (showDot) {
      <span class="dot"></span>
    }
    <span class="tx"><ng-content></ng-content></span>
  `,
  styleUrl: './pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class PillComponent {
  readonly variant = input<PillVariant>('neutral');
  readonly size = input<PillSize>('base');
  readonly color = input<string>();
  readonly dot = input<boolean>();

  @HostBinding('class')
  get hostClasses(): string {
    return `${this.variant()} ${this.size() === 'sm' ? 'sm' : ''}`;
  }

  @HostBinding('style.--pc')
  get pillColor(): string | null {
    return this.color() || null;
  }

  protected get showDot(): boolean {
    return this.dot() ?? (this.variant() === 'tint' && !!this.color());
  }
}
