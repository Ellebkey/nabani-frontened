import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { SignInComponent } from './sign-in.component';
import { AuthService } from '@app/core/auth/auth.service';

describe('SignInComponent', () => {
  let fixture: ComponentFixture<SignInComponent>;
  let component: SignInComponent;
  let auth: { login: jest.Mock; setUser: jest.Mock; resendVerificationEmail: jest.Mock };
  let router: { navigateByUrl: jest.Mock; createUrlTree: jest.Mock; serializeUrl: jest.Mock; events: unknown };

  const jwtResponse = {
    token: 'jwt-token',
    refreshToken: 'refresh-token',
    roles: ['premium'],
    expiresIn: '3600',
    username: 'joel@test.com'
  };

  function setup(queryParams: Record<string, string> = {}): void {
    auth = {
      login: jest.fn().mockReturnValue(of(jwtResponse)),
      setUser: jest.fn(),
      resendVerificationEmail: jest.fn().mockReturnValue(of({ success: true, message: 'ok' }))
    };
    router = {
      navigateByUrl: jest.fn(),
      createUrlTree: jest.fn(() => ({})),
      serializeUrl: jest.fn(() => '/'),
      events: of()
    };

    TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        provideNoopAnimations(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: AuthService, useValue: auth }
      ]
    });

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillForm(username = 'joel@test.com', password = 'secret123', rememberMe = false): void {
    component['signInForm'].setValue({ username, password, rememberMe });
  }

  const loginError = (message: string, status = 401): HttpErrorResponse =>
    new HttpErrorResponse({ status, error: { error: { message } } });

  describe('form validation', () => {
    it('should start empty, invalid and with rememberMe off', () => {
      setup();
      const form = component['signInForm'];

      expect(form.value).toEqual({ username: '', password: '', rememberMe: false });
      expect(form.invalid).toBe(true);
    });

    it('should require a valid email as username', () => {
      setup();
      const username = component['signInForm'].get('username')!;

      expect(username.hasError('required')).toBe(true);

      username.setValue('not-an-email');
      expect(username.hasError('email')).toBe(true);

      username.setValue('joel@test.com');
      expect(username.valid).toBe(true);
    });

    it('should require a password', () => {
      setup();
      const password = component['signInForm'].get('password')!;

      expect(password.hasError('required')).toBe(true);

      password.setValue('secret123');
      expect(password.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not call the API when the form is invalid', () => {
      setup();

      component['onSubmit']();

      expect(auth.login).not.toHaveBeenCalled();
    });

    it('should delegate to AuthService.login with the exact payload', () => {
      setup();
      fillForm('joel@test.com', 'secret123', true);

      component['onSubmit']();

      expect(auth.login).toHaveBeenCalledWith({
        username: 'joel@test.com',
        password: 'secret123',
        rememberMe: true
      });
    });

    it('should disable the form and the submit button while the login is in flight', () => {
      setup();
      auth.login.mockReturnValue(NEVER);
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(true);
      expect(component['signInForm'].disabled).toBe(true);
      const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(submitButton.disabled).toBe(true);
    });

    it('should store the session and navigate to /dashboard by default on success', () => {
      setup();
      fillForm();

      component['onSubmit']();

      expect(auth.setUser).toHaveBeenCalledWith('jwt-token', 'refresh-token', ['premium'], '3600', 'joel@test.com', undefined);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('should honor the redirectURL query param on success', () => {
      setup({ redirectURL: '/family/spending' });
      fillForm();

      component['onSubmit']();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/family/spending');
    });

    it('should show the credentials error and re-enable the form on a 401', () => {
      setup();
      auth.login.mockReturnValue(throwError(() => loginError('Invalid credentials', 401)));
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['signInForm'].enabled).toBe(true);
      expect(component['isLoading']()).toBe(false);
      expect(component['alertConfig']()).toEqual({ type: 'error', message: 'Correo o contraseña incorrectos' });
      expect(component['showResendLink']()).toBe(false);
      expect(component['showAlert']()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Correo o contraseña incorrectos');
      expect(fixture.nativeElement.textContent).not.toContain('Reenviar correo de verificacion');
      expect(auth.setUser).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should warn and offer the resend link when the account is unverified (422)', () => {
      setup();
      auth.login.mockReturnValue(
        throwError(() => loginError('Please verify your email before logging in', 422))
      );
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['alertConfig']()).toEqual({
        type: 'warning',
        message: 'Tu correo no ha sido verificado. Revisa tu bandeja de entrada.'
      });
      expect(component['showResendLink']()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Tu correo no ha sido verificado');
      expect(fixture.nativeElement.textContent).toContain('Reenviar correo de verificacion');
    });
  });

  describe('resendVerification', () => {
    it('should do nothing without an email in the form', () => {
      setup();

      component['resendVerification']();

      expect(auth.resendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should resend the verification email and confirm in Spanish', () => {
      setup();
      fillForm('joel@test.com', '', false);
      component['showResendLink'].set(true);

      component['resendVerification']();

      expect(auth.resendVerificationEmail).toHaveBeenCalledWith('joel@test.com');
      expect(component['isResending']()).toBe(false);
      expect(component['alertConfig']()).toEqual({
        type: 'success',
        message: 'Correo de verificacion reenviado. Revisa tu bandeja de entrada.'
      });
      expect(component['showResendLink']()).toBe(false);
    });

    it('should flag isResending and disable the resend button while in flight', () => {
      setup();
      auth.login.mockReturnValue(
        throwError(() => loginError('Please verify your email before logging in', 422))
      );
      fillForm();
      component['onSubmit']();
      auth.resendVerificationEmail.mockReturnValue(NEVER);

      component['resendVerification']();
      fixture.detectChanges();

      expect(component['isResending']()).toBe(true);
      const resendButton = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find(button => button.textContent!.includes('Enviando...'));
      expect(resendButton).toBeDefined();
      expect(resendButton!.disabled).toBe(true);
    });

    it('should show the Spanish error when the resend fails and keep the link visible', () => {
      setup();
      auth.resendVerificationEmail.mockReturnValue(throwError(() => new Error('boom')));
      fillForm('joel@test.com', '', false);
      component['showResendLink'].set(true);

      component['resendVerification']();

      expect(component['isResending']()).toBe(false);
      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'No se pudo reenviar el correo. Intenta de nuevo.'
      });
      expect(component['showResendLink']()).toBe(true);
    });
  });
});
