import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Catálogos section shell — thin passthrough that hosts the child screens
 *  (Ingredientes / Equipo / Usuarios). Each child owns its own pagehead +
 *  chip sub-navigation (design-spec §4.17–§4.19). */
@Component({
  selector: 'app-catalogos',
  template: '<router-outlet></router-outlet>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export class CatalogosComponent {}
