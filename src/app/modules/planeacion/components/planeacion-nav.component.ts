import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

/** Section sub-navigation for Planeación (design-spec §4.2). Reuses the shared
 *  mg-chip-row / mg-chip vocabulary; routerLinkActive drives the active state. */
@Component({
  selector: 'app-planeacion-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ChipRowComponent, ChipComponent],
  template: `
    <mg-chip-row class="mb-5">
      <mg-chip routerLink="/planeacion/semana" routerLinkActive #r1="routerLinkActive" [active]="r1.isActive">
        Semana
      </mg-chip>
      <mg-chip routerLink="/planeacion/dia" routerLinkActive #r2="routerLinkActive" [active]="r2.isActive">
        Menú del día
      </mg-chip>
      <mg-chip routerLink="/planeacion/ajustes" routerLinkActive #r3="routerLinkActive" [active]="r3.isActive">
        Ajustes por paciente
      </mg-chip>
      <mg-chip routerLink="/planeacion/platillos" routerLinkActive #r4="routerLinkActive" [active]="r4.isActive">
        Biblioteca
      </mg-chip>
    </mg-chip-row>
  `,
})
export class PlaneacionNavComponent {}
