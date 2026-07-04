import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CredentialsModel, RegisterModel, JWTResponse } from '@shared/interfaces/user.model';
import { HttpHelpersService } from '@shared/services/httpHelpers.service';

@Injectable({ providedIn: 'root' })
export class AuthService extends HttpHelpersService {
  private readonly http: HttpClient;
  private readonly router: Router;

  readonly isAuthenticated = signal(false);

  constructor() {
    const http = inject(HttpClient);
    const router = inject(Router);

    super();
    this.http = http;
    this.router = router;
    this.isAuthenticated.set(this.checkAuthentication());
  }

  private checkAuthentication(): boolean {
    // If we have a refresh token, the user is still "logged in" (interceptor will handle access token refresh)
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      return true;
    }

    const expiresIn = localStorage.getItem('expiresIn');
    if (!expiresIn) {
      return false;
    }
    return new Date() < new Date(expiresIn);
  }

  private setUsername(username: string): void {
    localStorage.setItem('username', username);
  }

  private setFullname(fullname: string | null | undefined): void {
    if (fullname) {
      localStorage.setItem('fullname', fullname);
    } else {
      localStorage.removeItem('fullname');
    }
  }

  getFullname(): string | null {
    return localStorage.getItem('fullname');
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  private setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setRefreshToken(refreshToken: string): void {
    localStorage.setItem('refreshToken', refreshToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setUserRoles(roles: string[] | string): void {
    const normalized = Array.isArray(roles) ? roles : [roles];
    localStorage.setItem('roles', JSON.stringify(normalized));
  }

  private setExpiresAt(expiresIn: string): void {
    localStorage.setItem('expiresIn', expiresIn);
  }

  getUserRoles(): string[] | null {
    const stored = localStorage.getItem('roles');
    if (!stored) {
      return null;
    }
    // Legacy values: the backend used to store roles as a plain string
    // ('admin') or a JSON string ('"admin"') instead of an array — always normalize
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return typeof parsed === 'string' && parsed ? [parsed] : null;
    } catch {
      return [stored];
    }
  }

  setUser(token: string, refreshToken: string, roles: string[], expiresIn: string, username: string, fullname?: string | null): void {
    this.setToken(token);
    this.setRefreshToken(refreshToken);
    this.setUserRoles(roles);
    this.setExpiresAt(expiresIn);
    this.setUsername(username);
    this.setFullname(fullname);
    this.isAuthenticated.set(true);
  }

  updateTokens(token: string, refreshToken: string, expiresIn: string): void {
    this.setToken(token);
    this.setRefreshToken(refreshToken);
    this.setExpiresAt(expiresIn);
  }

  signup(user: RegisterModel): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/auth/register`, { ...user });
  }

  login(credentials: CredentialsModel): Observable<JWTResponse> {
    return this.http.post<JWTResponse>(`${this.API_URL}/auth/login`, { ...credentials });
  }

  refreshTokens(refreshToken: string): Observable<JWTResponse> {
    return this.http.post<JWTResponse>(`${this.API_URL}/auth/refresh`, { refreshToken });
  }

  requestPasswordReset(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/auth/reset-password`, { email });
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/auth/confirm-reset-password`, { token, newPassword });
  }

  verifyEmail(token: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/auth/verify-email`, { token });
  }

  resendVerificationEmail(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/auth/resend-verification`, { email });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/auth/change-password`, { currentPassword, newPassword });
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      this.http.post(`${this.API_URL}/auth/logout`, { refreshToken }).subscribe({
        error: () => { /* ignore logout API errors */ },
      });
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('roles');
    localStorage.removeItem('expiresIn');
    localStorage.removeItem('username');
    localStorage.removeItem('fullname');
    this.isAuthenticated.set(false);
    this.router.navigate(['authentication/login']);
  }

  isAdmin(): boolean {
    const userRoles = this.getUserRoles();
    if (!userRoles) {
      return false;
    }
    return userRoles.includes('admin');
  }

  userHasRole(expectedRole: string): boolean {
    const userRoles = this.getUserRoles();
    if (!userRoles) {
      return false;
    }
    return userRoles.includes(expectedRole);
  }
}
