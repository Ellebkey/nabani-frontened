import { Routes } from '@angular/router';
import { CashFlowComponent } from './cash-flow/cash-flow.component';

export const ReportsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'cash-flow',
        component: CashFlowComponent,
        data: {
          title: 'Flujo de caja',
        },
      },
    ],
  },
];
