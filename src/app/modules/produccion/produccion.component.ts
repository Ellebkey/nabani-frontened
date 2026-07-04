import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Producción section shell — thin passthrough that hosts the child screens
 *  (Mapa · Etiquetas · Vista cocina · Compras y costos). Each child owns its own
 *  pagehead + date field + chip sub-navigation (design-spec §4.6–§4.9). */
@Component({
  selector: 'app-produccion',
  template: '<router-outlet></router-outlet>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export class ProduccionComponent {}
