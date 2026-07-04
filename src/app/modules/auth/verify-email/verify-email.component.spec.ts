import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '@app/core/auth/auth.service';

describe('VerifyEmailComponent', () => {
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let component: VerifyEmailComponent;
  let auth: { verifyEmail: jest.Mock };

  // ngOnInit fires the verification during the first change detection,
  // so the route params and the mocked response must be set up-front.
  function setup(
    queryParams: Record<string, string>,
    verifyResult: Observable<unknown> = of({ success: true, message: 'ok' })
  ): void {
    auth = { verifyEmail: jest.fn().mockReturnValue(verifyResult) };

    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
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
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: AuthService, useValue: auth }
      ]
    });

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should fail fast without calling the API when the token is missing', () => {
    setup({});

    expect(auth.verifyEmail).not.toHaveBeenCalled();
    expect(component['isLoading']()).toBe(false);
    expect(component['showAlert']()).toBe(true);
    expect(component['alertConfig']()).toEqual({
      type: 'error',
      message: 'El enlace de verificacion es invalido.'
    });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('El enlace de verificacion es invalido.');
    expect(text).toContain('Ir a iniciar sesion');
  });

  it('should show the verifying spinner state while the request is in flight', () => {
    setup({ token: 'tok-123' }, NEVER);

    expect(auth.verifyEmail).toHaveBeenCalledWith('tok-123');
    expect(component['isLoading']()).toBe(true);
    expect(component['showAlert']()).toBe(false);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Verificando tu correo electronico...');
    expect(text).not.toContain('Ir a iniciar sesion');
  });

  it('should verify the token from the route and confirm in Spanish', () => {
    setup({ token: 'tok-123' });

    expect(auth.verifyEmail).toHaveBeenCalledWith('tok-123');
    expect(component['isLoading']()).toBe(false);
    expect(component['alertConfig']()).toEqual({
      type: 'success',
      message: 'Tu correo ha sido verificado exitosamente. Ya puedes iniciar sesion.'
    });
    expect(component['showAlert']()).toBe(true);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tu correo ha sido verificado exitosamente. Ya puedes iniciar sesion.');
    expect(text).toContain('Ir a iniciar sesion');
  });

  it('should show the expired-link error when the verification fails', () => {
    setup({ token: 'tok-bad' }, throwError(() => ({ status: 400 })));

    expect(auth.verifyEmail).toHaveBeenCalledWith('tok-bad');
    expect(component['isLoading']()).toBe(false);
    expect(component['alertConfig']()).toEqual({
      type: 'error',
      message: 'El enlace de verificacion es invalido o ha expirado.'
    });
    expect(fixture.nativeElement.textContent).toContain('El enlace de verificacion es invalido o ha expirado.');
  });
});
