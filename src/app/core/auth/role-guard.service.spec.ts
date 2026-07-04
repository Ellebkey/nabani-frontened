import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { roleGuardFn } from './role-guard.service';
import { AuthService } from './auth.service';

describe('roleGuardFn', () => {
  const state = {} as RouterStateSnapshot;
  const dashboardTree = { sentinel: 'dashboard' } as unknown as UrlTree;

  let auth: { userHasRole: jest.Mock };
  let router: { createUrlTree: jest.Mock };

  const makeRoute = (expectedRole?: string): ActivatedRouteSnapshot =>
    ({ data: { expectedRole } } as unknown as ActivatedRouteSnapshot);

  beforeEach(() => {
    auth = { userHasRole: jest.fn().mockReturnValue(false) };
    router = { createUrlTree: jest.fn().mockReturnValue(dashboardTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('should allow navigation when the user has the expected role', () => {
    auth.userHasRole.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => roleGuardFn(makeRoute('admin'), state));

    expect(result).toBe(true);
    expect(auth.userHasRole).toHaveBeenCalledWith('admin');
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to the dashboard when the role does not match', () => {
    const result = TestBed.runInInjectionContext(() => roleGuardFn(makeRoute('admin'), state));

    expect(result).toBe(dashboardTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should check the role configured on the route data', () => {
    auth.userHasRole.mockImplementation((role: string) => role === 'premium');

    const result = TestBed.runInInjectionContext(() => roleGuardFn(makeRoute('premium'), state));

    expect(result).toBe(true);
    expect(auth.userHasRole).toHaveBeenCalledWith('premium');
  });

  it('should redirect when the user has no roles at all', () => {
    const result = TestBed.runInInjectionContext(() => roleGuardFn(makeRoute('premium'), state));

    expect(result).toBe(dashboardTree);
  });
});
