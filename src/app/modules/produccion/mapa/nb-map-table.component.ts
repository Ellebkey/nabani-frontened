import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MapColumnView, MapHeaderDish, MapRow } from '../produccion.models';

/** The dense production-map grid (design-spec §4.6, §2.13). Presentational:
 *  the parent builds the ordered column list + header dishes once and feeds
 *  them in, so every body row is a flat `cells[col.key]` lookup. Wrap this in an
 *  `overflow-auto` card — the table has a 1760px min-width. */
@Component({
  selector: 'app-nb-map-table',
  templateUrl: './nb-map-table.component.html',
  styleUrl: './nb-map-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NbMapTableComponent {
  readonly headerDishes = input<MapHeaderDish[]>([]);
  readonly columns = input<MapColumnView[]>([]);
  readonly rows = input<MapRow[]>([]);

  protected patientName(row: MapRow): string {
    return `${row.patient?.firstName ?? ''} ${row.patient?.lastName ?? ''}`.trim() || '—';
  }
}
