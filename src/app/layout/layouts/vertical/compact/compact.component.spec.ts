import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MagueyNavigationItem, MagueyNavigationService } from '@maguey/components/navigation';
import { MagueyMediaWatcherService } from '@maguey/services/media-watcher';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { AlertConfig, AlertService } from 'app/modules/shared/services/alert.service';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { ThemeService } from 'app/core/theme/theme.service';
import { CompactLayoutComponent } from './compact.component';

describe('CompactLayoutComponent', () => {
  let fixture: ComponentFixture<CompactLayoutComponent>;
  let component: CompactLayoutComponent;
  let mediaSubject: Subject<{ matchingAliases: string[] }>;
  let alertSubject: BehaviorSubject<AlertConfig | null>;
  let navigationService: { get: jest.Mock };
  let magueyNavigationService: { getComponent: jest.Mock };

  const navFixture = [
    { id: 'dashboard', title: 'Dashboard', type: 'basic', link: '/dashboard' }
  ] as MagueyNavigationItem[];

  let themeService: { scheme: () => string; setScheme: jest.Mock; resolvedScheme: jest.Mock; init: jest.Mock; toggle: jest.Mock };

  beforeEach(() => {
    themeService = { scheme: () => 'light', setScheme: jest.fn(), resolvedScheme: jest.fn().mockReturnValue('light'), init: jest.fn(), toggle: jest.fn() };
    mediaSubject = new Subject<{ matchingAliases: string[] }>();
    alertSubject = new BehaviorSubject<AlertConfig | null>(null);
    navigationService = { get: jest.fn().mockReturnValue(of(navFixture)) };
    magueyNavigationService = { getComponent: jest.fn() };

    // The component is intentionally NOT listed in `imports`: its standalone
    // imports (Maguey navigation/alert tree) trip the eager TestBed scan with a
    // circular ES-module import. The template/imports are overridden away and
    // only the class logic is under test here.
    TestBed.configureTestingModule({
      providers: [
        { provide: NavigationService, useValue: navigationService },
        { provide: MagueyMediaWatcherService, useValue: { onMediaChange$: mediaSubject.asObservable() } },
        { provide: MagueyNavigationService, useValue: magueyNavigationService },
        { provide: AlertService, useValue: { currentAlert$: alertSubject.asObservable() } },
        { provide: ThemeService, useValue: themeService }
      ]
    });

    TestBed.overrideComponent(CompactLayoutComponent, { set: { template: '', imports: [] } });

    fixture = TestBed.createComponent(CompactLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load the navigation from the navigation service', () => {
    expect(navigationService.get).toHaveBeenCalled();
    expect(component.navigation()).toEqual(navFixture);
  });

  it('should flag a small screen when the md alias is not matching', () => {
    mediaSubject.next({ matchingAliases: ['sm'] });
    expect(component.isScreenSmall()).toBe(true);

    mediaSubject.next({ matchingAliases: ['sm', 'md'] });
    expect(component.isScreenSmall()).toBe(false);
  });

  it('should mirror the alert service emissions into alertConfig', () => {
    expect(component.alertConfig()).toBeNull();

    const alert: AlertConfig = {
      message: 'Gasto guardado',
      type: 'success',
      appearance: 'soft',
      dismissible: true,
      showIcon: true,
      name: 'globalAlert',
      duration: 5000
    };
    alertSubject.next(alert);
    expect(component.alertConfig()).toEqual(alert);

    alertSubject.next(null);
    expect(component.alertConfig()).toBeNull();
  });

  it('should expose the current year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  describe('toggleNavigation', () => {
    it('should toggle the named navigation component', () => {
      const toggle = jest.fn();
      magueyNavigationService.getComponent.mockReturnValue({ toggle });

      component.toggleNavigation('mainNavigation');

      expect(magueyNavigationService.getComponent).toHaveBeenCalledWith('mainNavigation');
      expect(toggle).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when the navigation component is not registered', () => {
      magueyNavigationService.getComponent.mockReturnValue(null);

      expect(() => component.toggleNavigation('mainNavigation')).not.toThrow();
    });
  });

  it('should ignore media and alert emissions after destroy', () => {
    mediaSubject.next({ matchingAliases: [] });
    expect(component.isScreenSmall()).toBe(true);

    fixture.destroy();

    mediaSubject.next({ matchingAliases: ['md'] });
    alertSubject.next({
      message: 'tarde',
      type: 'info',
      appearance: 'soft',
      dismissible: true,
      showIcon: true,
      name: 'globalAlert',
      duration: 5000
    });

    expect(component.isScreenSmall()).toBe(true);
    expect(component.alertConfig()).toBeNull();
  });

  it('exposes the resolved scheme and delegates the quick toggle to the theme service', () => {
    expect(component.resolvedScheme).toBe('light');

    component.toggleScheme();
    expect(themeService.toggle).toHaveBeenCalled();
  });

});
