import { Routes } from '@angular/router';

// Incomes Components
import { IncomesComponent } from './incomes.component';

export const IncomesRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'list',
        component: IncomesComponent,
        data: {
          title: 'Ingresos',
        },
      }
    ],
  },
];
