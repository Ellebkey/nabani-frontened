import { Routes } from '@angular/router';

// Expenses Components
import { ExpensesListComponent } from '@app/modules/expenses/expenses-list/expenses-list.component';
import { ExpensesCreditCardStatementComponent } from '@app/modules/expenses/expenses-credit-card-statement/expenses-credit-card-statement.component';

export const ExpensesRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'list',
        component: ExpensesListComponent,
        data: {
          title: 'Gastos',
        },
      },
      {
        path: 'statement',
        component: ExpensesCreditCardStatementComponent,
        data: {
          title: 'Estado de cuenta',
        },
      },
    ],
  },
];
