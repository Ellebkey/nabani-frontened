import { Routes } from '@angular/router';

import { authGuardFn } from '@app/core/auth/auth-guard.service';

import { LayoutComponent } from 'app/layout/layout.component';

export const appRoutes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'hoy'},
  {
    path: '',
    component: LayoutComponent,
    data: {layout: 'compact'},
    children: [
      // Nabani sections (design-spec §3). Only Hoy has a real screen in Phase 2;
      // the rest render a placeholder so the shell is fully navigable.
      {
        path: 'hoy',
        loadChildren: () => import('./modules/hoy/hoy.routing').then(m => m.HoyRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'planeacion',
        loadComponent: () => import('./modules/shell/section-placeholder.component').then(m => m.SectionPlaceholderComponent),
        data: {title: 'Planeación'},
        canActivate: [authGuardFn]
      },
      {
        path: 'produccion',
        loadComponent: () => import('./modules/shell/section-placeholder.component').then(m => m.SectionPlaceholderComponent),
        data: {title: 'Producción'},
        canActivate: [authGuardFn]
      },
      {
        path: 'pacientes',
        loadChildren: () => import('./modules/pacientes/pacientes.routing').then(m => m.PacientesRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'finanzas',
        loadChildren: () => import('./modules/finanzas/finanzas.routing').then(m => m.FinanzasRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'catalogos',
        loadChildren: () => import('./modules/catalogos/catalogos.routing').then(m => m.CatalogosRoutes),
        canActivate: [authGuardFn]
      },
      // --- Legacy finance modules (unrouted from the Nabani nav; replaced later) ---
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/accounts/accounts.routing').then(m => m.AccountsRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'expenses',
        loadChildren: () => import('./modules/expenses/expenses.routing').then(m => m.ExpensesRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'inventory',
        loadChildren: () => import('./modules/inventory/inventory.routing').then(m => m.InventoryRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'incomes',
        loadChildren: () => import('./modules/incomes/incomes.routing').then(m => m.IncomesRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'reports',
        loadChildren: () => import('./modules/reports/reports.routing').then(m => m.ReportsRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'family',
        loadChildren: () => import('./modules/family/family.route').then(m => m.familyRoutes),
        canActivate: [authGuardFn]
      },
      {
        path: 'admin',
        loadChildren: () => import('./modules/admin/admin.route').then(m => m.adminRoute),
        canActivate: [authGuardFn]
      },
      {
        path: 'profile',
        loadComponent: () => import('./modules/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuardFn]
      },
    ]
  },
  {
    path: '',
    component: LayoutComponent,
    data: {layout: 'empty'},
    children: [
      {
        path: 'authentication',
        loadChildren: () => import('./modules/auth/auth.routing').then(m => m.authRoutes),
      }
    ]
  },
];
