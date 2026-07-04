import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';

import { TokenInterceptorService } from './token-interceptor.service';
import { AuthService } from './auth.service';
import { JWTResponse } from '@shared/interfaces/user.model';

describe('TokenInterceptorService', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: {
    getToken: jest.Mock;
    getRefreshToken: jest.Mock;
    refreshTokens: jest.Mock;
    updateTokens: jest.Mock;
    logout: jest.Mock;
  };

  const jwt: JWTResponse = {
    token: 'new-token',
    refreshToken: 'new-refresh',
    roles: ['premium'],
    username: 'joel',
    expiresIn: '2026-06-12T00:00:00.000Z'
  };

  const flush401 = (url: string): void => {
    httpMock.expectOne(url).flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
  };

  beforeEach(() => {
    auth = {
      getToken: jest.fn().mockReturnValue('old-token'),
      getRefreshToken: jest.fn().mockReturnValue('refresh-1'),
      refreshTokens: jest.fn(),
      updateTokens: jest.fn(),
      logout: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true },
        { provide: AuthService, useValue: auth }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('token attachment', () => {
    it('should attach the stored token as the Authorization header', () => {
      http.get('/api/expenses').subscribe();

      const req = httpMock.expectOne('/api/expenses');
      expect(req.request.headers.get('Authorization')).toBe('old-token');
      req.flush([]);
    });

    it('should leave the request untouched when there is no token', () => {
      auth.getToken.mockReturnValue(null);

      http.get('/api/expenses').subscribe();

      const req = httpMock.expectOne('/api/expenses');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });
  });

  describe('401 refresh choreography', () => {
    it('should refresh the tokens and retry the request with the new token', () => {
      auth.refreshTokens.mockReturnValue(of(jwt));
      let result: unknown;

      http.get('/api/expenses').subscribe((r) => (result = r));
      flush401('/api/expenses');

      expect(auth.refreshTokens).toHaveBeenCalledWith('refresh-1');
      expect(auth.updateTokens).toHaveBeenCalledWith('new-token', 'new-refresh', '2026-06-12T00:00:00.000Z');

      const retried = httpMock.expectOne('/api/expenses');
      expect(retried.request.headers.get('Authorization')).toBe('new-token');
      retried.flush([{ id: 1 }]);

      expect(result).toEqual([{ id: 1 }]);
      expect(auth.logout).not.toHaveBeenCalled();
    });

    it('should logout and propagate the error when the refresh call fails', () => {
      const refreshError = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      auth.refreshTokens.mockReturnValue(throwError(() => refreshError));
      let error: unknown;

      http.get('/api/expenses').subscribe({ error: (e) => (error = e) });
      flush401('/api/expenses');

      expect(auth.refreshTokens).toHaveBeenCalledWith('refresh-1');
      expect(auth.logout).toHaveBeenCalled();
      expect(error).toBe(refreshError);
      expect(auth.updateTokens).not.toHaveBeenCalled();
    });

    it('should logout without calling refresh when there is no refresh token', () => {
      auth.getRefreshToken.mockReturnValue(null);
      let error: HttpErrorResponse | undefined;

      http.get('/api/expenses').subscribe({ error: (e) => (error = e) });
      flush401('/api/expenses');

      expect(auth.refreshTokens).not.toHaveBeenCalled();
      expect(auth.logout).toHaveBeenCalled();
      expect(error?.status).toBe(401);
    });

    it('should share a single refresh between concurrent 401s and retry both with the new token', () => {
      const refresh$ = new Subject<JWTResponse>();
      auth.refreshTokens.mockReturnValue(refresh$.asObservable());
      let first: unknown;
      let second: unknown;

      http.get('/api/uno').subscribe((r) => (first = r));
      http.get('/api/dos').subscribe((r) => (second = r));
      flush401('/api/uno');
      flush401('/api/dos');

      expect(auth.refreshTokens).toHaveBeenCalledTimes(1);

      refresh$.next(jwt);

      const retriedUno = httpMock.expectOne('/api/uno');
      const retriedDos = httpMock.expectOne('/api/dos');
      expect(retriedUno.request.headers.get('Authorization')).toBe('new-token');
      expect(retriedDos.request.headers.get('Authorization')).toBe('new-token');
      retriedUno.flush({ ok: 'uno' });
      retriedDos.flush({ ok: 'dos' });

      expect(first).toEqual({ ok: 'uno' });
      expect(second).toEqual({ ok: 'dos' });
      expect(auth.logout).not.toHaveBeenCalled();
    });
  });

  describe('errors that must pass through untouched', () => {
    it.each(['/auth/login', '/auth/refresh', '/auth/register'])(
      'should propagate a 401 from %s without refreshing',
      (path) => {
        let error: HttpErrorResponse | undefined;

        http.post(`/api${path}`, {}).subscribe({ error: (e) => (error = e) });
        flush401(`/api${path}`);

        expect(error?.status).toBe(401);
        expect(auth.refreshTokens).not.toHaveBeenCalled();
        expect(auth.logout).not.toHaveBeenCalled();
      }
    );

    it('should propagate non-401 errors without refreshing', () => {
      let error: HttpErrorResponse | undefined;

      http.get('/api/expenses').subscribe({ error: (e) => (error = e) });
      httpMock.expectOne('/api/expenses')
        .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(auth.refreshTokens).not.toHaveBeenCalled();
      expect(auth.logout).not.toHaveBeenCalled();
    });
  });
});
