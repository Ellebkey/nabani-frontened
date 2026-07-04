import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuardFn: CanActivateFn = () => {
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    return inject(Router).createUrlTree(['/authentication/login']);
  }
  return true;
};
