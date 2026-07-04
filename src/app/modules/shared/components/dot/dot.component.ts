import { Component, ChangeDetectionStrategy, HostBinding, input } from '@angular/core';

@Component({
  selector: 'mg-dot',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  host: {
    class: 'inline-block w-[7px] h-[7px] rounded-full flex-none',
  },
})
export class DotComponent {
  readonly color = input<string>();

  @HostBinding('style.background-color')
  get bg(): string {
    return this.color() || '#5F7386';
  }
}
