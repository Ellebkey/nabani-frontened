import { Routes } from '@angular/router';

import { ProduccionComponent } from './produccion.component';
import { MapaComponent } from './mapa/mapa.component';
import { EtiquetasComponent } from './etiquetas/etiquetas.component';
import { CocinaComponent } from './cocina/cocina.component';
import { ComprasComponent } from './compras/compras.component';

// Producción section (design-spec §4.6–§4.9). Chip sub-nav parent hosting the
// four production screens; Mapa de producción is the default.
export const ProduccionRoutes: Routes = [
  {
    path: '',
    component: ProduccionComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mapa' },
      {
        path: 'mapa',
        component: MapaComponent,
        data: { title: 'Mapa de producción' },
      },
      {
        path: 'etiquetas',
        component: EtiquetasComponent,
        data: { title: 'Etiquetas de entrega' },
      },
      {
        path: 'cocina',
        component: CocinaComponent,
        data: { title: 'Vista cocina' },
      },
      {
        path: 'compras',
        component: ComprasComponent,
        data: { title: 'Compras y costos' },
      },
    ],
  },
];
