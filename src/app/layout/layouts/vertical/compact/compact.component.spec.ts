import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MagueyNavigationItem } from '@maguey/components/navigation';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { AlertConfig, AlertService } from 'app/modules/shared/services/alert.service';
import { BehaviorSubject, of } from 'rxjs';

import { ThemeService } from 'app/core/theme/theme.service';
import { CompactLayoutComponent } from './compact.component';

describe('CompactLayoutComponent', () => {
  let fixture: ComponentFixture<CompactLayoutComponent>;
  let component: CompactLayoutComponent;
  let alertSubject: BehaviorSubject<AlertConfig | null>;
  let navigationService: { get: jest.Mock };
  let themeService: { init: jest.Mock };

  const navFixture = [
    { id: 'hoy', title: 'Hoy', type: 'basic', icon: 'heroicons_outline:home', link: '/hoy' }
  ] as MagueyNavigationItem[];

  beforeEach(() => {
    themeService = { init: jest.fn() };
    alertSubject = new BehaviorSubject<AlertConfig | null>(null);
    navigationService = { get: jest.fn().mockReturnValue(of(navFixture)) };

    // The component's standalone imports (Maguey navigation/alert tree) trip the
    // eager TestBed scan with a circular ES-module import; the template/imports
    // are overridden away and only the class logic is under test here.
    TestBed.configureTestingModule({
      providers: [
        { provide: NavigationService, useValue: navigationService },
        { provide: AlertService, useValue: { currentAlert$: alertSubject.asObservable() } },
        { provide: ThemeService, useValue: themeService }
      ]
    });

    TestBed.overrideComponent(CompactLayoutComponent, { set: { template: '', imports: [] } });

    fixture = TestBed.createComponent(CompactLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should apply the persisted theme on init', () => {
    expect(themeService.init).toHaveBeenCalledTimes(1);
  });

  it('should load the role-filtered navigation from the navigation service', () => {
    expect(navigationService.get).toHaveBeenCalled();
    expect(component.navigation()).toEqual(navFixture);
  });

  it('should mirror the alert service emissions into alertConfig', () => {
    expect(component.alertConfig()).toBeNull();

    const alert: AlertConfig = {
      message: 'Paciente guardado',
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

  it('should expose a no-op search stub', () => {
    expect(() => component.openSearch()).not.toThrow();
  });

  it('should ignore navigation and alert emissions after destroy', () => {
    fixture.destroy();

    alertSubject.next({
      message: 'tarde',
      type: 'info',
      appearance: 'soft',
      dismissible: true,
      showIcon: true,
      name: 'globalAlert',
      duration: 5000
    });

    expect(component.alertConfig()).toBeNull();
  });
});
