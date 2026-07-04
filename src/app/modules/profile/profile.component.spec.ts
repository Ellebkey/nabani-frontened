import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '@app/core/auth/auth.service';
import { FamilyStateService } from '@app/modules/family/services/state/family-state.service';
import { signal } from '@angular/core';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let auth: {
    getFullname: jest.Mock;
    getUsername: jest.Mock;
    getUserRoles: jest.Mock;
    changePassword: jest.Mock;
  };

  beforeEach(() => {
    auth = {
      getFullname: jest.fn().mockReturnValue(null),
      getUsername: jest.fn().mockReturnValue('joel@maguey.mx'),
      getUserRoles: jest.fn().mockReturnValue(['admin', 'premium']),
      changePassword: jest.fn().mockReturnValue(of({ success: true, message: 'ok' })),
    };

    TestBed.configureTestingModule({
      imports: [ProfileComponent, MatIconTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        {
          provide: FamilyStateService,
          useValue: {
            ensureLoaded: jest.fn(),
            hasPartnership: signal(false),
            partnership: signal(null),
            isOwner: signal(false),
          },
        },
      ],
    });
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  // Type into the real inputs: events mark the OnPush view (programmatic setValue doesn't)
  const fillForm = (currentPassword: string, newPassword: string, confirmPassword: string): void => {
    const inputs = fixture.nativeElement.querySelectorAll('input[type="password"]') as NodeListOf<HTMLInputElement>;
    [currentPassword, newPassword, confirmPassword].forEach((value, index) => {
      inputs[index].value = value;
      inputs[index].dispatchEvent(new Event('input'));
    });
  };

  const submitButton = (): HTMLButtonElement =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Actualizar contraseña'))!;

  describe('profile info', () => {
    it('should render the username and one chip per role', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(component.username).toBe('joel@maguey.mx');
      expect(component.roles).toEqual(['admin', 'premium']);
      expect(text).toContain('Mi perfil');
      expect(text).toContain('joel@maguey.mx');
      expect(text).toContain('Administrador');
      expect(text).toContain('Premium');
      expect(fixture.nativeElement.querySelectorAll('mg-pill')).toHaveLength(2);
    });

    it('should fall back to an empty roles list when the user has none', () => {
      auth.getUserRoles.mockReturnValue(null);

      createComponent();

      expect(component.roles).toEqual([]);
      expect(fixture.nativeElement.querySelectorAll('mat-chip-option')).toHaveLength(0);
    });
  });

  describe('change password form', () => {
    it('should start empty, invalid and with the submit button disabled', () => {
      createComponent();

      expect(component['changePasswordForm'].getRawValue()).toEqual({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      expect(component['changePasswordForm'].invalid).toBe(true);
      expect(submitButton().disabled).toBe(true);
    });

    it('should require at least 6 characters for the new password', () => {
      createComponent();
      const newPassword = component['changePasswordForm'].get('newPassword')!;

      fillForm('actual1', 'corta', 'corta');
      expect(newPassword.hasError('minlength')).toBe(true);
      expect(component['changePasswordForm'].invalid).toBe(true);

      newPassword.setValue('suficiente');
      expect(newPassword.valid).toBe(true);
    });

    it('should enable the submit button once the form is valid', () => {
      createComponent();

      fillForm('actual1', 'nueva123', 'nueva123');
      fixture.detectChanges();

      expect(submitButton().disabled).toBe(false);
    });
  });

  describe('onChangePassword', () => {
    it('should not call the API while the form is invalid', () => {
      createComponent();

      component['onChangePassword']();

      expect(auth.changePassword).not.toHaveBeenCalled();
      expect(component['showAlert']()).toBe(false);
    });

    it('should alert in Spanish and skip the API when the passwords do not match', () => {
      createComponent();
      fillForm('actual1', 'nueva123', 'distinta9');

      component['onChangePassword']();
      fixture.detectChanges();

      expect(auth.changePassword).not.toHaveBeenCalled();
      expect(component['showAlert']()).toBe(true);
      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'Las contraseñas no coinciden.',
      });
      expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden.');
    });

    it('should show a spinner state and disable the form while the request is in flight', () => {
      const pending$ = new Subject<{ success: boolean; message: string }>();
      auth.changePassword.mockReturnValue(pending$);
      createComponent();
      fillForm('actual1', 'nueva123', 'nueva123');

      component['onChangePassword']();

      expect(component['isLoading']()).toBe(true);
      expect(component['showAlert']()).toBe(false);
      expect(component['changePasswordForm'].disabled).toBe(true);

      pending$.next({ success: true, message: 'ok' });
      pending$.complete();

      expect(component['isLoading']()).toBe(false);
    });

    it('should delegate to AuthService, reset the form and alert success', () => {
      createComponent();
      fillForm('actual1', 'nueva123', 'nueva123');

      component['onChangePassword']();
      fixture.detectChanges();

      expect(auth.changePassword).toHaveBeenCalledWith('actual1', 'nueva123');
      expect(component['changePasswordForm'].enabled).toBe(true);
      expect(component['changePasswordForm'].getRawValue()).toEqual({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      expect(component['isLoading']()).toBe(false);
      expect(component['alertConfig']()).toEqual({
        type: 'success',
        message: 'Contraseña actualizada correctamente.',
      });
      expect(fixture.nativeElement.textContent).toContain('Contraseña actualizada correctamente.');
    });

    it('should map an "incorrect password" backend error to its Spanish message', () => {
      auth.changePassword.mockReturnValue(
        throwError(() => ({ error: { error: { message: 'Current password is incorrect' } } }))
      );
      createComponent();
      fillForm('mala1', 'nueva123', 'nueva123');

      component['onChangePassword']();
      fixture.detectChanges();

      expect(component['isLoading']()).toBe(false);
      expect(component['changePasswordForm'].enabled).toBe(true);
      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'La contraseña actual es incorrecta.',
      });
      expect(fixture.nativeElement.textContent).toContain('La contraseña actual es incorrecta.');
    });

    it('should show the generic Spanish error for any other failure', () => {
      auth.changePassword.mockReturnValue(throwError(() => new Error('offline')));
      createComponent();
      fillForm('actual1', 'nueva123', 'nueva123');

      component['onChangePassword']();

      expect(component['alertConfig']()).toEqual({
        type: 'error',
        message: 'Ocurrió un error al actualizar la contraseña. Intenta de nuevo.',
      });
      expect(component['showAlert']()).toBe(true);
      expect(component['changePasswordForm'].enabled).toBe(true);
    });
  });
});
