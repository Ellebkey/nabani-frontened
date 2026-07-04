import { Routes } from '@angular/router';

import { PlaneacionComponent } from './planeacion.component';
import { SemanaComponent } from './semana/semana.component';
import { DiaComponent } from './dia/dia.component';
import { AjustesComponent } from './ajustes/ajustes.component';
import { BibliotecaComponent } from './biblioteca/biblioteca.component';

// Planeación section (design-spec §4.2–§4.5). Chip sub-nav parent hosting the
// four planning screens; Semana is the default. Menú del día and Ajustes read
// the target date from the ?date= query param (default: today).
export const PlaneacionRoutes: Routes = [
  {
    path: '',
    component: PlaneacionComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'semana' },
      {
        path: 'semana',
        component: SemanaComponent,
        data: { title: 'Planeación' },
      },
      {
        path: 'dia',
        component: DiaComponent,
        data: { title: 'Menú del día' },
      },
      {
        path: 'ajustes',
        component: AjustesComponent,
        data: { title: 'Ajustes por paciente' },
      },
      {
        path: 'platillos',
        component: BibliotecaComponent,
        data: { title: 'Biblioteca de platillos' },
      },
    ],
  },
];
