import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Single-date field for the Producción pageheads (design-spec §4.6–§4.9).
 *  A native `type="date"` styled like `.mg-field`; its value is already the
 *  `yyyy-MM-dd` the API expects, so no formatting round-trip is needed.
 *  Presentational: the parent owns the signal and reloads on `valueChange`. */
@Component({
  selector: 'app-produccion-date-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <label
      class="flex h-10 w-[200px] items-center gap-2 rounded-field border border-line-strong bg-surface px-3 text-[13px] text-ink focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/15">
      <mat-icon class="icon-size-4 text-ink-3" [svgIcon]="'heroicons_outline:calendar-days'"></mat-icon>
      <input
        type="date"
        class="w-full border-0 bg-transparent tabular-nums outline-none"
        [value]="value()"
        (change)="onChange($event)"
        aria-label="Fecha" />
    </label>
  `,
})
export class DateFieldComponent {
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected onChange(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    if (next) {
      this.valueChange.emit(next);
    }
  }
}
