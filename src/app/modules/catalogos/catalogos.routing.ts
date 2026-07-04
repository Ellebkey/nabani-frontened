import { Routes } from '@angular/router';

import { CatalogosComponent } from './catalogos.component';
import { IngredientesComponent } from './ingredientes/ingredientes.component';
import { EquipoComponent } from './equipo/equipo.component';
import { UsuariosComponent } from './usuarios/usuarios.component';

// Catálogos section (design-spec §4.17–§4.19). Chip sub-nav parent hosting the
// three catalog screens; Ingredientes is the default.
export const CatalogosRoutes: Routes = [
  {
    path: '',
    component: CatalogosComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ingredientes' },
      {
        path: 'ingredientes',
        component: IngredientesComponent,
        data: { title: 'Ingredientes' },
      },
      {
        path: 'equipo',
        component: EquipoComponent,
        data: { title: 'Equipo' },
      },
      {
        path: 'usuarios',
        component: UsuariosComponent,
        data: { title: 'Usuarios' },
      },
    ],
  },
];
