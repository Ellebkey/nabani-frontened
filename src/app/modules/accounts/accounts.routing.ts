import { Routes } from '@angular/router';

// Expenses Components
import { AccountsComponent } from './accounts.component';

export const AccountsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: AccountsComponent,
        data: {
          title: 'Resumen',
        },
      }
    ],
  },
];
