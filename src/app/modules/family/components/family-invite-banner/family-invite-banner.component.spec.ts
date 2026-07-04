import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { FamilyInviteBannerComponent } from './family-invite-banner.component';
import { FamilyStateService } from '../../services/state/family-state.service';

const DISMISSED_STORAGE_KEY = 'family-invite-banner-dismissed';

interface FamilyStateMock {
  loaded: WritableSignal<boolean>;
  hasPartnership: WritableSignal<boolean>;
  isPremium: jest.Mock;
  ensureLoaded: jest.Mock;
}

describe('FamilyInviteBannerComponent', () => {
  let familyState: FamilyStateMock;

  beforeEach(() => {
    localStorage.clear();
  });

  function setup(options: { premium?: boolean; loaded?: boolean; hasPartnership?: boolean } = {}):
    ComponentFixture<FamilyInviteBannerComponent> {
    familyState = {
      loaded: signal(options.loaded ?? true),
      hasPartnership: signal(options.hasPartnership ?? false),
      isPremium: jest.fn().mockReturnValue(options.premium ?? true),
      ensureLoaded: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [FamilyInviteBannerComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: FamilyStateService, useValue: familyState }
      ]
    });

    const fixture = TestBed.createComponent(FamilyInviteBannerComponent);
    fixture.detectChanges();
    return fixture;
  }

  const bannerText = (fixture: ComponentFixture<FamilyInviteBannerComponent>): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('should ask the family state to load itself on construction', () => {
    setup();

    expect(familyState.ensureLoaded).toHaveBeenCalledTimes(1);
  });

  describe('visibility gating', () => {
    it('should render the banner when loaded, without a hogar and not dismissed', () => {
      const fixture = setup();
      const text = bannerText(fixture);

      expect(text).toContain('¿Llevan gastos en pareja?');
      expect(text).toContain('Invita a tu pareja al Modo Familiar y registren juntos los gastos del hogar');
      expect(text).toContain('cada quien mantiene sus finanzas personales privadas');
    });

    it('should render nothing while the family state has not loaded', () => {
      const fixture = setup({ loaded: false });

      expect(bannerText(fixture).trim()).toBe('');
    });

    it('should appear once the family state finishes loading without a hogar', () => {
      const fixture = setup({ loaded: false });

      familyState.loaded.set(true);
      fixture.detectChanges();

      expect(bannerText(fixture)).toContain('¿Llevan gastos en pareja?');
    });

    it('should render nothing when the user already has a hogar', () => {
      const fixture = setup({ hasPartnership: true });

      expect(bannerText(fixture).trim()).toBe('');
    });

    it('should render nothing when previously dismissed via localStorage', () => {
      localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');

      const fixture = setup();

      expect(bannerText(fixture).trim()).toBe('');
    });

    it('should ignore a non-"true" localStorage value', () => {
      localStorage.setItem(DISMISSED_STORAGE_KEY, 'false');

      const fixture = setup();

      expect(bannerText(fixture)).toContain('¿Llevan gastos en pareja?');
    });
  });

  describe('premium CTA', () => {
    it('should show the create-hogar button and no upsell for premium users', () => {
      const fixture = setup({ premium: true });
      const text = bannerText(fixture);

      expect(text).toContain('Crear mi hogar');
      expect(text).not.toContain('Conoce el Modo Familiar');
      expect(text).not.toContain('Premium');

      const button: HTMLButtonElement | null =
        fixture.nativeElement.querySelector('button[mat-flat-button]');
      expect(button).not.toBeNull();
      expect(button!.textContent).toContain('Crear mi hogar');
    });
  });

  describe('free upsell', () => {
    it('should show the learn-more link with a Premium chip instead of the button', () => {
      const fixture = setup({ premium: false });
      const text = bannerText(fixture);

      expect(text).toContain('Conoce el Modo Familiar');
      expect(text).toContain('Premium');
      expect(text).not.toContain('Crear mi hogar');

      const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toContain('/family/settings');
    });
  });

  describe('dismiss', () => {
    it('should hide the banner and persist the dismissal in localStorage', () => {
      const fixture = setup();
      const dismissButton: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[aria-label="Descartar"]');

      dismissButton.click();
      fixture.detectChanges();

      expect(bannerText(fixture).trim()).toBe('');
      expect(localStorage.getItem(DISMISSED_STORAGE_KEY)).toBe('true');
    });
  });
});
