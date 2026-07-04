import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { authGuardFn } from './auth-guard.service';
import { AuthService } from './auth.service';

describe('authGuardFn', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const loginTree = { sentinel: 'login' } as unknown as UrlTree;

  let isAuthenticated: WritableSignal<boolean>;
  let router: { createUrlTree: jest.Mock };

  beforeEach(() => {
    isAuthenticated = signal(false);
    router = { createUrlTree: jest.fn().mockReturnValue(loginTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated } },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('should allow navigation when the user is authenticated', () => {
    isAuthenticated.set(true);

    const result = TestBed.runInInjectionContext(() => authGuardFn(route, state));

    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to the login page when the user is not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => authGuardFn(route, state));

    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/authentication/login']);
  });
});
