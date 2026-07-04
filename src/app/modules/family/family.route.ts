import { Routes } from '@angular/router';

export const familyRoutes: Routes = [
  {
    path: '',
    redirectTo: 'spending',
    pathMatch: 'full'
  },
  {
    path: 'spending',
    data: { title: 'Nuestros gastos' },
    loadComponent: () =>
      import('./shared-spending/shared-spending.component').then(m => m.SharedSpendingComponent)
  },
  {
    path: 'budgets',
    data: { title: 'Presupuestos del hogar' },
    loadComponent: () =>
      import('./budgets/family-budgets.component').then(m => m.FamilyBudgetsComponent)
  },
  {
    path: 'settings',
    data: { title: 'Mi Hogar' },
    loadComponent: () =>
      import('./settings/family-settings.component').then(m => m.FamilySettingsComponent)
  },
  {
    path: 'accept',
    data: { title: 'Aceptar invitación' },
    loadComponent: () =>
      import('./accept-invite/accept-invite.component').then(m => m.AcceptInviteComponent)
  }
];
