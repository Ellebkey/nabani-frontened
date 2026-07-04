import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

/** Section sub-navigation for Producción (design-spec §4.6–§4.9). Reuses the
 *  shared mg-chip-row / mg-chip vocabulary; routerLinkActive drives the active
 *  state. The chip row is `.nb-noprint` (hidden by the global print stylesheet). */
@Component({
  selector: 'app-produccion-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ChipRowComponent, ChipComponent],
  template: `
    <mg-chip-row class="nb-noprint mb-5">
      <mg-chip routerLink="/produccion/mapa" routerLinkActive #r1="routerLinkActive" [active]="r1.isActive">
        Mapa de producción
      </mg-chip>
      <mg-chip routerLink="/produccion/etiquetas" routerLinkActive #r2="routerLinkActive" [active]="r2.isActive">
        Etiquetas de entrega
      </mg-chip>
      <mg-chip routerLink="/produccion/cocina" routerLinkActive #r3="routerLinkActive" [active]="r3.isActive">
        Vista cocina
      </mg-chip>
      <mg-chip routerLink="/produccion/compras" routerLinkActive #r4="routerLinkActive" [active]="r4.isActive">
        Compras y costos
      </mg-chip>
    </mg-chip-row>
  `,
})
export class ProduccionNavComponent {}
