import { Routes } from '@angular/router';

import { PacientesComponent } from './pacientes.component';
import { ExpedienteComponent } from './expediente/expediente.component';

// Pacientes section (design-spec §4.10–§4.11). List is the default; the
// expediente (4 tabs via ?tab= query param) lives at /pacientes/:id.
export const PacientesRoutes: Routes = [
  {
    path: '',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      {
        path: 'list',
        component: PacientesComponent,
        data: { title: 'Pacientes' },
      },
      {
        path: ':id',
        component: ExpedienteComponent,
        data: { title: 'Expediente' },
      },
    ],
  },
];
