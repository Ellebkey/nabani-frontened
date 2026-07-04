import { Routes } from '@angular/router';

import { FinanzasComponent } from './finanzas.component';
import { CobranzaComponent } from './cobranza/cobranza.component';
import { IngresosComponent } from './ingresos/ingresos.component';
import { GastosComponent } from './gastos/gastos.component';
import { BalanceComponent } from './balance/balance.component';
import { PaquetesComponent } from './paquetes/paquetes.component';

// Finanzas section (design-spec §4.12–§4.16). Chip sub-nav parent hosting the
// five finance screens; Cobranza is the default.
export const FinanzasRoutes: Routes = [
  {
    path: '',
    component: FinanzasComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'cobranza' },
      {
        path: 'cobranza',
        component: CobranzaComponent,
        data: { title: 'Cobranza' },
      },
      {
        path: 'ingresos',
        component: IngresosComponent,
        data: { title: 'Ingresos Diarios' },
      },
      {
        path: 'gastos',
        component: GastosComponent,
        data: { title: 'Gastos' },
      },
      {
        path: 'balance',
        component: BalanceComponent,
        data: { title: 'Balance General' },
      },
      {
        path: 'paquetes',
        component: PaquetesComponent,
        data: { title: 'Paquetes' },
      },
    ],
  },
];
