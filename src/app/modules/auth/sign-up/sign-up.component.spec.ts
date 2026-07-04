import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { SignUpComponent } from './sign-up.component';
import { AuthService } from '@app/core/auth/auth.service';

describe('SignUpComponent', () => {
  let fixture: ComponentFixture<SignUpComponent>;
  let component: SignUpComponent;
  let auth: { signup: jest.Mock };

  beforeEach(() => {
    auth = { signup: jest.fn().mockReturnValue(of({ success: true, message: 'ok' })) };

    TestBed.configureTestingModule({
      imports: [SignUpComponent],
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
        // RouterLink (used by the "Iniciar sesión" anchor) injects ActivatedRoute.
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: AuthService, useValue: auth }
      ]
    });

    fixture = TestBed.createComponent(SignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillForm(): void {
    component['signUpForm'].setValue({
      displayName: 'Joel Barranco',
      email: 'joel@test.com',
      password: 'secret123'
    });
  }

  describe('form validation', () => {
    it('should start empty and invalid', () => {
      expect(component['signUpForm'].value).toEqual({ displayName: '', email: '', password: '' });
      expect(component['signUpForm'].invalid).toBe(true);
    });

    it('should require the display name', () => {
      const displayName = component['signUpForm'].get('displayName')!;

      expect(displayName.hasError('required')).toBe(true);

      displayName.setValue('Joel');
      expect(displayName.valid).toBe(true);
    });

    it('should require a well-formed email', () => {
      const email = component['signUpForm'].get('email')!;

      email.setValue('nope');
      expect(email.hasError('email')).toBe(true);

      email.setValue('joel@test.com');
      expect(email.valid).toBe(true);
    });

    it('should require a password of at least 6 characters', () => {
      const password = component['signUpForm'].get('password')!;

      expect(password.hasError('required')).toBe(true);

      password.setValue('12345');
      expect(password.hasError('minlength')).toBe(true);

      password.setValue('123456');
      expect(password.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not call the API when the form is invalid', () => {
      component['onSubmit']();

      expect(auth.signup).not.toHaveBeenCalled();
    });

    it('should delegate to AuthService.signup using the email as username', () => {
      fillForm();

      component['onSubmit']();

      expect(auth.signup).toHaveBeenCalledWith({
        username: 'joel@test.com',
        email: 'joel@test.com',
        password: 'secret123',
        displayName: 'Joel Barranco'
      });
    });

    it('should disable the form and the submit button while the signup is in flight', () => {
      auth.signup.mockReturnValue(NEVER);
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(true);
      expect(component['signUpForm'].disabled).toBe(true);
      const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(submitButton.disabled).toBe(true);
    });

    it('should show the verification notice and keep the form disabled on success', () => {
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['alertConfig']()).toEqual({
        type: 'success',
        message: 'Cuenta creada. Revisa tu correo electronico para verificar tu cuenta.'
      });
      expect(component['showAlert']()).toBe(true);
      expect(component['signUpForm'].disabled).toBe(true);
      expect(fixture.nativeElement.textContent).toContain(
        'Cuenta creada. Revisa tu correo electronico para verificar tu cuenta.'
      );
    });

    it('should show the Spanish error and re-enable the form when the signup fails', () => {
      auth.signup.mockReturnValue(throwError(() => new Error('boom')));
      fillForm();

      component['onSubmit']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['signUpForm'].enabled).toBe(true);
      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'Ocurrió un error al crear la cuenta. Intenta de nuevo.'
      });
      expect(fixture.nativeElement.textContent).toContain('Ocurrió un error al crear la cuenta. Intenta de nuevo.');
    });
  });
});
