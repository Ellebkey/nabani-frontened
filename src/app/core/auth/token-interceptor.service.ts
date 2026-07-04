import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { AuthService } from './auth.service';

@Injectable()
export class TokenInterceptorService implements HttpInterceptor {
  private readonly authService = inject(AuthService);

  private isRefreshing = false;
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();

    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isAuthUrl(request.url)) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: { Authorization: token },
    });
  }

  private isAuthUrl(url: string): boolean {
    return url.includes('/auth/login')
      || url.includes('/auth/refresh')
      || url.includes('/auth/register');
  }

  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.authService.getRefreshToken();

      if (!refreshToken) {
        this.isRefreshing = false;
        this.authService.logout();
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }

      return this.authService.refreshTokens(refreshToken).pipe(
        switchMap((result) => {
          this.isRefreshing = false;
          this.authService.updateTokens(result.token, result.refreshToken, result.expiresIn);
          this.refreshTokenSubject.next(result.token);
          return next.handle(this.addToken(request, result.token));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        }),
      );
    }

    // Another request is already refreshing — wait for the new token
    return this.refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addToken(request, token))),
    );
  }
}
