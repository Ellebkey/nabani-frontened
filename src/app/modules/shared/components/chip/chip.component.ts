import { Component, ChangeDetectionStrategy, HostBinding, input } from '@angular/core';

/** Agave chip (design-spec §2.6, agave.css .mg-chip) — h28 rounded-full pill used
 *  as section sub-navigation AND as filters. Default = bg-card + line-strong border;
 *  active (`[active]`) = brand solid white. Presentational: the consumer supplies
 *  (click)/routerLink and drives the active state. */
@Component({
  selector: 'mg-chip',
  template: '<ng-content></ng-content>',
  styleUrl: './chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ChipComponent {
  readonly active = input(false);

  @HostBinding('class.on')
  get isOn(): boolean {
    return this.active();
  }

  @HostBinding('attr.role') readonly role = 'button';
  @HostBinding('attr.tabindex') readonly tabindex = '0';
}
