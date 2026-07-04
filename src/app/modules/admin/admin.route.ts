import { Routes } from '@angular/router';
import { roleGuardFn } from '@app/core/auth/role-guard.service';

export const adminRoute: Routes = [
  {
    path: '',
    redirectTo: 'accounts',
    pathMatch: 'full'
  },
  {
    path: 'accounts',
    data: { title: 'Cuentas' },
    loadComponent: () =>
      import('./accounts-management/accounts-management.component').then(m => m.AccountsManagementComponent)
  },
  {
    path: 'payment-methods',
    data: { title: 'Métodos de pago' },
    loadComponent: () =>
      import('./payment-methods/payment-methods.component').then(m => m.PaymentMethodsComponent)
  },
  {
    path: 'tags',
    data: { title: 'Etiquetas' },
    loadComponent: () =>
      import('./tags/tags.component').then(m => m.TagsComponent)
  },
  {
    path: 'categories',
    data: { title: 'Categorías', expectedRole: 'admin' },
    canActivate: [roleGuardFn],
    loadComponent: () =>
      import('./categories-management/categories-management.component').then(m => m.CategoriesManagementComponent)
  }
];
