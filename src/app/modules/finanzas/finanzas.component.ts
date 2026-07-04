import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Finanzas section shell — thin passthrough that hosts the child screens
 *  (Cobranza / Ingresos / Gastos / Balance / Paquetes). Each child owns its own
 *  pagehead + chip sub-navigation (design-spec §4.12–§4.16). */
@Component({
  selector: 'app-finanzas',
  template: '<router-outlet></router-outlet>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export class FinanzasComponent {}
