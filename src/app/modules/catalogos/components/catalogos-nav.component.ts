import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

/** Section sub-navigation for Catálogos (design-spec §4.17). Reuses the shared
 *  mg-chip-row / mg-chip vocabulary; routerLinkActive drives the active state. */
@Component({
  selector: 'app-catalogos-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ChipRowComponent, ChipComponent],
  template: `
    <mg-chip-row class="mb-5">
      <mg-chip routerLink="/catalogos/ingredientes" routerLinkActive #r1="routerLinkActive" [active]="r1.isActive">
        Ingredientes
      </mg-chip>
      <mg-chip routerLink="/catalogos/equipo" routerLinkActive #r2="routerLinkActive" [active]="r2.isActive">
        Equipo
      </mg-chip>
      <mg-chip routerLink="/catalogos/usuarios" routerLinkActive #r3="routerLinkActive" [active]="r3.isActive">
        Usuarios
      </mg-chip>
    </mg-chip-row>
  `,
})
export class CatalogosNavComponent {}
