import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { NoPartnershipComponent } from './no-partnership.component';
import { FamilyStateService } from '../../services/state/family-state.service';

interface FamilyStateMock {
  loading: WritableSignal<boolean>;
  isPremium: jest.Mock;
  createPartnership: jest.Mock;
}

describe('NoPartnershipComponent', () => {
  let familyState: FamilyStateMock;

  function setup(premium: boolean): ComponentFixture<NoPartnershipComponent> {
    familyState = {
      loading: signal(false),
      isPremium: jest.fn().mockReturnValue(premium),
      createPartnership: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [NoPartnershipComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: FamilyStateService, useValue: familyState }
      ]
    });

    const fixture = TestBed.createComponent(NoPartnershipComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('premium user', () => {
    it('should show the create form and not the premium upsell', () => {
      const fixture = setup(true);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(text).toContain('Aún no tienes un hogar');
      expect(text).toContain('Crear mi hogar');
      expect(text).toContain('Nombre del hogar (opcional)');
      expect(text).not.toContain('Función Premium');
    });

    it('should delegate creation to the state service with the typed name', () => {
      const fixture = setup(true);
      const component = fixture.componentInstance;

      component['nameControl'].setValue('Casa García');
      component['createPartnership']();

      expect(familyState.createPartnership).toHaveBeenCalledTimes(1);
      expect(familyState.createPartnership).toHaveBeenCalledWith('Casa García');
    });

    it('should still delegate when the optional name is left empty', () => {
      const fixture = setup(true);

      fixture.componentInstance['createPartnership']();

      expect(familyState.createPartnership).toHaveBeenCalledWith('');
    });

    it('should coalesce a null name to undefined', () => {
      const fixture = setup(true);

      fixture.componentInstance['nameControl'].setValue(null);
      fixture.componentInstance['createPartnership']();

      expect(familyState.createPartnership).toHaveBeenCalledWith(undefined);
    });

    it('should not create when the name exceeds 100 characters', () => {
      const fixture = setup(true);
      const component = fixture.componentInstance;

      component['nameControl'].setValue('a'.repeat(101));
      component['createPartnership']();

      expect(familyState.createPartnership).not.toHaveBeenCalled();
    });

    it('should not create while a request is already loading', () => {
      const fixture = setup(true);

      familyState.loading.set(true);
      fixture.componentInstance['createPartnership']();

      expect(familyState.createPartnership).not.toHaveBeenCalled();
    });

    it('should create via the button click and disable it while loading', () => {
      const fixture = setup(true);
      const button: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[mat-flat-button]');

      button.click();
      expect(familyState.createPartnership).toHaveBeenCalledTimes(1);

      familyState.loading.set(true);
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
    });
  });

  describe('free user', () => {
    it('should show the premium upsell instead of the create form', () => {
      const fixture = setup(false);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(text).toContain('Función Premium');
      expect(text).toContain('Crear un hogar requiere una cuenta Premium');
      expect(text).not.toContain('Crear mi hogar');
    });

    it('should still offer the accept-invite link', () => {
      const fixture = setup(false);
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');

      expect(link.textContent).toContain('¿Recibiste una invitación? Acéptala aquí');
      expect(link.getAttribute('href')).toContain('/family/accept');
    });
  });
});
