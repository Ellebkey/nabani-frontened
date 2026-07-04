import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAGUEY_USER_COLORS } from '../../services/maguey-palette';

/**
 * Handoff color picker (modal-admin.html): the system's 16 muted colors,
 * 30px radius-9 swatch, selected = white check + same-color ring.
 * One component for categories, tags, accounts and payment methods.
 */
@Component({
    selector: 'mg-color-swatches',
    templateUrl: './color-swatches.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule]
})
export class ColorSwatchesComponent {
  readonly colors = input<string[]>(MAGUEY_USER_COLORS);
  readonly value = input<string | null>(null);
  readonly valueChange = output<string>();

  protected isSelected(color: string): boolean {
    return (this.value() ?? '').toLowerCase() === color.toLowerCase();
  }
}
