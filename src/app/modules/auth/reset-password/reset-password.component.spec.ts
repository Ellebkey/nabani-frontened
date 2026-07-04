import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '@app/core/auth/auth.service';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let auth: { confirmPasswordReset: jest.Mock };
  let router: { navigateByUrl: jest.Mock; createUrlTree: jest.Mock; serializeUrl: jest.Mock; events: unknown };

  function setup(queryParams: Record<string, string> = { token: 'tok-123' }): void {
    auth = { confirmPasswordReset: jest.fn().mockReturnValue(of({ success: true, message: 'ok' })) };
    router = {
      navigateByUrl: jest.fn(),
      createUrlTree: jest.fn(() => ({})),
      serializeUrl: jest.fn(() => '/'),
      events: of()
    };

    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideNoopAnimations(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: AuthService, useValue: auth }
      ]
    });

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillForm(newPassword = 'secret123', confirmPassword = 'secret123'): void {
    component['resetForm'].setValue({ newPassword, confirmPassword });
  }

  describe('token handling', () => {
    it('should flag an invalid token and hide the form when the query param is missing', () => {
      setup({});

      expect(component['invalidToken']()).toBe(true);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('El enlace es invalido. Solicita un nuevo enlace de restablecimiento.');
      expect(text).toContain('Solicitar nuevo enlace');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('should show the form when the token is present', () => {
      setup();

      expect(component['invalidToken']()).toBe(false);
      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Ingresa tu nueva contraseña.');
    });
  });

  describe('form validation', () => {
    it('should require a new password of at least 6 characters', () => {
      setup();
      const newPassword = component['resetForm'].get('newPassword')!;

      expect(newPassword.hasError('required')).toBe(true);

      newPassword.setValue('12345');
      expect(newPassword.hasError('minlength')).toBe(true);

      newPassword.setValue('123456');
      expect(newPassword.valid).toBe(true);
    });

    it('should require the confirmation password', () => {
      setup();
      const confirmPassword = component['resetForm'].get('confirmPassword')!;

      expect(confirmPassword.hasError('required')).toBe(true);

      confirmPassword.setValue('secret123');
      expect(confirmPassword.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not call the API when the form is invalid', () => {
      setup();

      component['onSubmit']();

      expect(auth.confirmPasswordReset).not.toHaveBeenCalled();
    });

    it('should reject mismatching passwords without calling the API', () => {
      setup();
      fillForm('secret123', 'different1');

      component['onSubmit']();
      fixture.detectChanges();

      expect(auth.confirmPasswordReset).not.toHaveBeenCalled();
      expect(component['alertConfig']()).toEqual({ type: 'error', message: 'Las contraseñas no coinciden.' });
      expect(component['showAlert']()).toBe(true);
      expect(component['isLoading']()).toBe(false);
      expect(component['resetForm'].enabled).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden.');
    });

    it('should delegate to AuthService.confirmPasswordReset with the route token and new password', () => {
      setup({ token: 'tok-123' });
      fillForm();

      component['onSubmit']();

      expect(auth.confirmPasswordReset).toHaveBeenCalledWith('tok-123', 'secret123');
    });

    it('should disable the form and the submit button while the reset is in flight', () => {
      setup();
      auth.confirmPasswordReset.mockReturnValue(NEVER);
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(true);
      expect(component['resetForm'].disabled).toBe(true);
      const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(submitButton.disabled).toBe(true);
    });

    it('should confirm in Spanish and navigate to the login after 3 seconds', fakeAsync(() => {
      setup();
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['alertConfig']()).toEqual({
        type: 'success',
        message: 'Tu contraseña ha sido restablecida. Redirigiendo al inicio de sesion...'
      });
      expect(component['showAlert']()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Tu contraseña ha sido restablecida.');
      expect(router.navigateByUrl).not.toHaveBeenCalled();

      tick(3000);

      expect(router.navigateByUrl).toHaveBeenCalledWith('/authentication/login');
    }));

    it('should show the expired-link error and re-enable the form on failure', () => {
      setup();
      auth.confirmPasswordReset.mockReturnValue(throwError(() => ({ status: 400 })));
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['resetForm'].enabled).toBe(true);
      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'El enlace es invalido o ha expirado. Solicita uno nuevo.'
      });
      expect(fixture.nativeElement.textContent).toContain('El enlace es invalido o ha expirado. Solicita uno nuevo.');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
