import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '@app/core/auth/auth.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let auth: { requestPasswordReset: jest.Mock };

  beforeEach(() => {
    auth = { requestPasswordReset: jest.fn().mockReturnValue(of({ success: true, message: 'ok' })) };

    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: Router,
          useValue: {
            navigateByUrl: jest.fn(),
            createUrlTree: jest.fn(() => ({})),
            serializeUrl: jest.fn(() => '/'),
            events: of()
          }
        },
        // RouterLink (used by the "Volver a iniciar sesion" anchor) injects ActivatedRoute.
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: AuthService, useValue: auth }
      ]
    });

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('form validation', () => {
    it('should start empty and invalid', () => {
      expect(component['forgotPasswordForm'].value).toEqual({ email: '' });
      expect(component['forgotPasswordForm'].invalid).toBe(true);
    });

    it('should require a well-formed email', () => {
      const email = component['forgotPasswordForm'].get('email')!;

      expect(email.hasError('required')).toBe(true);

      email.setValue('nope');
      expect(email.hasError('email')).toBe(true);

      email.setValue('joel@test.com');
      expect(email.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not call the API when the form is invalid', () => {
      component['onSubmit']();

      expect(auth.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should delegate to AuthService.requestPasswordReset with the email', () => {
      component['forgotPasswordForm'].setValue({ email: 'joel@test.com' });

      component['onSubmit']();

      expect(auth.requestPasswordReset).toHaveBeenCalledWith('joel@test.com');
    });

    it('should disable the form and the submit button while the request is in flight', () => {
      auth.requestPasswordReset.mockReturnValue(NEVER);
      component['forgotPasswordForm'].setValue({ email: 'joel@test.com' });

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(true);
      expect(component['forgotPasswordForm'].disabled).toBe(true);
      const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(submitButton.disabled).toBe(true);
    });

    it('should show the neutral success message and keep the form disabled', () => {
      component['forgotPasswordForm'].setValue({ email: 'joel@test.com' });

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['alertConfig']()).toEqual({
        type: 'success',
        message: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.'
      });
      expect(component['showAlert']()).toBe(true);
      expect(component['forgotPasswordForm'].disabled).toBe(true);
      expect(fixture.nativeElement.textContent).toContain(
        'Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.'
      );
    });

    it('should show the Spanish error and re-enable the form when the request fails', () => {
      auth.requestPasswordReset.mockReturnValue(throwError(() => new Error('boom')));
      component['forgotPasswordForm'].setValue({ email: 'joel@test.com' });

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['forgotPasswordForm'].enabled).toBe(true);
      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'Ocurrió un error. Intenta de nuevo.'
      });
      expect(fixture.nativeElement.textContent).toContain('Ocurrió un error. Intenta de nuevo.');
    });
  });
});
