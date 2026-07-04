import { Component, ChangeDetectionStrategy } from '@angular/core';

/** .mg-chiprow — horizontal flow container for `<mg-chip>` (agave.css §2.6).
 *  Marked `.nb-noprint`-friendly: hidden by the global print stylesheet. */
@Component({
  selector: 'mg-chip-row',
  template: '<ng-content></ng-content>',
  styleUrl: './chip-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ChipRowComponent {}
