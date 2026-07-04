import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Planeación section shell — thin passthrough that hosts the child screens
 *  (Semana / Menú del día / Ajustes por paciente / Biblioteca de platillos).
 *  Each child owns its own pagehead + chip sub-navigation (design-spec §4.2–§4.5). */
@Component({
  selector: 'app-planeacion',
  template: '<router-outlet></router-outlet>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export class PlaneacionComponent {}
