import { Component, ChangeDetectionStrategy, HostBinding, input } from '@angular/core';

export type TileSize = 'base' | 'sm';

@Component({
  selector: 'mg-tile',
  template: '<ng-content></ng-content>',
  styleUrl: './tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class TileComponent {
  readonly color = input<string>();
  readonly size = input<TileSize>('base');
  readonly neutral = input(false);

  @HostBinding('class')
  get hostClasses(): string {
    return `${this.size() === 'sm' ? 'sm' : ''} ${this.neutral() ? 'neutral' : ''}`;
  }

  @HostBinding('style.--tc')
  get tileColor(): string | null {
    return this.color() || null;
  }
}
