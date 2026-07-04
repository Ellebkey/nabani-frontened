import { Routes } from '@angular/router';

export const HoyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./hoy.component').then(m => m.HoyComponent),
    data: { title: 'Hoy' },
  },
];
