import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const roleGuardFn: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const expectedRole = route.data['expectedRole'];

  if (!authService.userHasRole(expectedRole)) {
    return inject(Router).createUrlTree(['/dashboard']);
  }
  return true;
};
