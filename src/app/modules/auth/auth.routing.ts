import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./sign-in/sign-in.component').then(m => m.SignInComponent),
    data: { title: 'Iniciar sesión' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./sign-up/sign-up.component').then(m => m.SignUpComponent),
    data: { title: 'Crear cuenta' },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    data: { title: 'Restablecer contraseña' },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    data: { title: 'Nueva contraseña' },
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    data: { title: 'Verificar correo' },
  },
];
