import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { JWTResponse } from '@shared/interfaces/user.model';
import { environment } from 'environments/environment';

const API = environment.url;

describe('AuthService', () => {
  let router: { navigate: jest.Mock };

  const inject = () => ({
    service: TestBed.inject(AuthService),
    httpMock: TestBed.inject(HttpTestingController)
  });

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: router }]
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  describe('checkAuthentication on construction', () => {
    it('should be authenticated when a refresh token exists', () => {
      localStorage.setItem('refreshToken', 'refresh-1');

      const { service } = inject();

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should be authenticated when the stored expiration is in the future', () => {
      localStorage.setItem('expiresIn', new Date(Date.now() + 3_600_000).toISOString());

      const { service } = inject();

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should not be authenticated when the expiration passed and there is no refresh token', () => {
      localStorage.setItem('expiresIn', new Date(Date.now() - 1_000).toISOString());

      const { service } = inject();

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should not be authenticated with an empty localStorage', () => {
      const { service } = inject();

      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should persist the full session and flip the signal', () => {
      const { service } = inject();

      service.setUser('tok-1', 'refresh-1', ['admin', 'premium'], '2027-01-01T00:00:00.000Z', 'joel');

      expect(service.getToken()).toBe('tok-1');
      expect(service.getRefreshToken()).toBe('refresh-1');
      expect(service.getUserRoles()).toEqual(['admin', 'premium']);
      expect(service.getUsername()).toBe('joel');
      expect(localStorage.getItem('roles')).toBe(JSON.stringify(['admin', 'premium']));
      expect(localStorage.getItem('expiresIn')).toBe('2027-01-01T00:00:00.000Z');
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('updateTokens', () => {
    it('should replace only token, refreshToken and expiresIn', () => {
      const { service } = inject();
      service.setUser('tok-1', 'refresh-1', ['free'], '2026-01-01T00:00:00.000Z', 'joel');

      service.updateTokens('tok-2', 'refresh-2', '2027-02-02T00:00:00.000Z');

      expect(service.getToken()).toBe('tok-2');
      expect(service.getRefreshToken()).toBe('refresh-2');
      expect(localStorage.getItem('expiresIn')).toBe('2027-02-02T00:00:00.000Z');
      expect(service.getUserRoles()).toEqual(['free']);
      expect(service.getUsername()).toBe('joel');
    });
  });

  describe('role helpers', () => {
    it('should return null roles when nothing is stored', () => {
      const { service } = inject();

      expect(service.getUserRoles()).toBeNull();
      expect(service.isAdmin()).toBe(false);
      expect(service.userHasRole('premium')).toBe(false);
    });

    it('should normalize legacy non-array role storage into arrays', () => {
      const { service } = inject();

      localStorage.setItem('roles', 'admin');
      expect(service.getUserRoles()).toEqual(['admin']);

      localStorage.setItem('roles', JSON.stringify('admin'));
      expect(service.getUserRoles()).toEqual(['admin']);

      localStorage.setItem('roles', JSON.stringify(['admin']));
      expect(service.getUserRoles()).toEqual(['admin']);
    });

    it('should detect the admin role', () => {
      localStorage.setItem('roles', JSON.stringify(['admin', 'premium']));
      const { service } = inject();

      expect(service.isAdmin()).toBe(true);
    });

    it('should not be admin with other roles', () => {
      localStorage.setItem('roles', JSON.stringify(['premium']));
      const { service } = inject();

      expect(service.isAdmin()).toBe(false);
    });

    it('should match and mismatch expected roles', () => {
      localStorage.setItem('roles', JSON.stringify(['premium']));
      const { service } = inject();

      expect(service.userHasRole('premium')).toBe(true);
      expect(service.userHasRole('admin')).toBe(false);
    });
  });

  describe('logout', () => {
    it('should notify the API, clear the session and navigate to login', () => {
      const { service, httpMock } = inject();
      service.setUser('tok-1', 'refresh-1', ['premium'], '2027-01-01T00:00:00.000Z', 'joel');

      service.logout();

      const req = httpMock.expectOne(`${API}/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
      req.flush({ success: true });

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('roles')).toBeNull();
      expect(localStorage.getItem('expiresIn')).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['authentication/login']);
    });

    it('should skip the API call when there is no refresh token', () => {
      const { service, httpMock } = inject();
      localStorage.setItem('token', 'tok-1');

      service.logout();

      httpMock.expectNone(`${API}/auth/logout`);
      expect(localStorage.getItem('token')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['authentication/login']);
    });

    it('should ignore logout API errors and still clear the session', () => {
      const { service, httpMock } = inject();
      service.setUser('tok-1', 'refresh-1', ['premium'], '2027-01-01T00:00:00.000Z', 'joel');

      service.logout();

      httpMock.expectOne(`${API}/auth/logout`)
        .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['authentication/login']);
    });
  });

  describe('auth API calls', () => {
    it('should POST credentials to /auth/login and return the JWT response', () => {
      const { service, httpMock } = inject();
      const jwt: JWTResponse = {
        token: 'tok-1',
        refreshToken: 'refresh-1',
        roles: ['premium'],
        username: 'joel',
        expiresIn: '2027-01-01T00:00:00.000Z'
      };
      let result: JWTResponse | undefined;

      service.login({ username: 'joel', password: 'secreto' }).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${API}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'joel', password: 'secreto' });
      req.flush(jwt);

      expect(result).toEqual(jwt);
    });

    it('should POST the new user to /auth/register', () => {
      const { service, httpMock } = inject();
      let result: { success: boolean; message: string } | undefined;

      service.signup({ username: 'joel', password: 'secreto', email: 'joel@test.com' })
        .subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${API}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'joel', password: 'secreto', email: 'joel@test.com' });
      req.flush({ success: true, message: 'ok' });

      expect(result).toEqual({ success: true, message: 'ok' });
    });

    it('should POST the refresh token to /auth/refresh', () => {
      const { service, httpMock } = inject();

      service.refreshTokens('refresh-1').subscribe();

      const req = httpMock.expectOne(`${API}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
      req.flush({
        token: 'tok-2', refreshToken: 'refresh-2', roles: [], username: 'joel', expiresIn: ''
      });
    });

    it.each([
      ['requestPasswordReset', `${API}/auth/reset-password`, { email: 'joel@test.com' },
        (s: AuthService) => s.requestPasswordReset('joel@test.com')],
      ['confirmPasswordReset', `${API}/auth/confirm-reset-password`, { token: 't-1', newPassword: 'nueva' },
        (s: AuthService) => s.confirmPasswordReset('t-1', 'nueva')],
      ['verifyEmail', `${API}/auth/verify-email`, { token: 't-1' },
        (s: AuthService) => s.verifyEmail('t-1')],
      ['resendVerificationEmail', `${API}/auth/resend-verification`, { email: 'joel@test.com' },
        (s: AuthService) => s.resendVerificationEmail('joel@test.com')],
      ['changePassword', `${API}/auth/change-password`, { currentPassword: 'vieja', newPassword: 'nueva' },
        (s: AuthService) => s.changePassword('vieja', 'nueva')]
    ])('should POST the right body for %s', (_name, url, body, call) => {
      const { service, httpMock } = inject();
      let result: { success: boolean; message: string } | undefined;

      call(service).subscribe((r) => (result = r));

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ success: true, message: 'ok' });

      expect(result).toEqual({ success: true, message: 'ok' });
    });
  });
});
