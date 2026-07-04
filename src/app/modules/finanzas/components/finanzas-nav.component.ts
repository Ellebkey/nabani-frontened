import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChipComponent } from '@shared/components/chip/chip.component';
import { ChipRowComponent } from '@shared/components/chip/chip-row.component';

/** Section sub-navigation for Finanzas (design-spec §4.12–§4.16). Reuses the shared
 *  mg-chip-row / mg-chip vocabulary; routerLinkActive drives the active state. */
@Component({
  selector: 'app-finanzas-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ChipRowComponent, ChipComponent],
  template: `
    <mg-chip-row class="mb-5">
      <mg-chip routerLink="/finanzas/cobranza" routerLinkActive #r1="routerLinkActive" [active]="r1.isActive">
        Cobranza
      </mg-chip>
      <mg-chip routerLink="/finanzas/ingresos" routerLinkActive #r2="routerLinkActive" [active]="r2.isActive">
        Ingresos
      </mg-chip>
      <mg-chip routerLink="/finanzas/gastos" routerLinkActive #r3="routerLinkActive" [active]="r3.isActive">
        Gastos
      </mg-chip>
      <mg-chip routerLink="/finanzas/balance" routerLinkActive #r4="routerLinkActive" [active]="r4.isActive">
        Balance
      </mg-chip>
      <mg-chip routerLink="/finanzas/paquetes" routerLinkActive #r5="routerLinkActive" [active]="r5.isActive">
        Paquetes
      </mg-chip>
    </mg-chip-row>
  `,
})
export class FinanzasNavComponent {}
