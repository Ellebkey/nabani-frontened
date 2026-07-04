import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'mg-date-row',
  template: `
    <span>{{ label() }}</span>
    @if (sum) {
      <span class="ml-auto text-[12px] font-semibold tracking-normal tabular-nums">{{ sum }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  host: {
    class: 'flex items-baseline gap-2.5 px-5 pt-3.5 pb-2 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3',
  },
})
export class DateRowComponent {
  // Both inputs accept null so date/currency pipe results (string | null) bind directly;
  // null renders the same as the '' default (label interpolates empty, sum row is hidden)
  readonly label = input<string | null>('');
  @Input() sum?: string | null;
}
