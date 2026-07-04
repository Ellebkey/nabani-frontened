
import { DOCUMENT } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router, convertToParamMap } from '@angular/router';
import { MagueyConfigService } from '@maguey/services/config';
import { MagueyMediaWatcherService } from '@maguey/services/media-watcher';
import { MagueyPlatformService } from '@maguey/services/platform';
import { MAGUEY_VERSION } from '@maguey/version';
import { BehaviorSubject, Subject } from 'rxjs';

import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let component: LayoutComponent;
  let configSubject: BehaviorSubject<any>;
  let mediaSubject: BehaviorSubject<any>;
  let routerEvents: Subject<unknown>;
  let activatedRoute: any;
  let mediaWatcher: { onMediaQueryChange$: jest.Mock };
  let body: HTMLElement;
  let ngVersionEl: HTMLElement;
  let documentMock: { querySelector: jest.Mock; body: HTMLElement };

  const baseConfig = (): any => ({ layout: 'compact', scheme: 'light', theme: 'theme-default', screens: {} });

  const breakpoints = (dark: boolean): any => ({
    matches: dark,
    breakpoints: {
      '(prefers-color-scheme: dark)': dark,
      '(prefers-color-scheme: light)': !dark
    }
  });

  beforeEach(() => {
    configSubject = new BehaviorSubject<any>(baseConfig());
    mediaSubject = new BehaviorSubject<any>(breakpoints(false));
    routerEvents = new Subject<unknown>();
    activatedRoute = {
      firstChild: null,
      snapshot: { queryParamMap: convertToParamMap({}) },
      pathFromRoot: []
    };
    mediaWatcher = { onMediaQueryChange$: jest.fn().mockReturnValue(mediaSubject.asObservable()) };
    body = document.createElement('div');
    ngVersionEl = document.createElement('div');
    documentMock = { querySelector: jest.fn().mockReturnValue(ngVersionEl), body };

    // The component is intentionally NOT listed in `imports`: its standalone
    // imports (compact layout -> Maguey navigation tree) trip the eager TestBed
    // scan with a circular ES-module import. The template is overridden anyway.
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: { events: routerEvents.asObservable() } },
        { provide: MagueyConfigService, useValue: { config$: configSubject.asObservable() } },
        { provide: MagueyMediaWatcherService, useValue: mediaWatcher },
        { provide: MagueyPlatformService, useValue: { osName: 'os-test' } }
      ]
    });

    // The real template instantiates the Maguey layouts (empty/compact); we only
    // test the class logic, so it is replaced. DOCUMENT is faked at component
    // level so body class assertions stay isolated from the jsdom document.
    TestBed.overrideComponent(LayoutComponent, {
      set: {
        template: '',
        imports: [],
        providers: [{ provide: DOCUMENT, useValue: documentMock }]
      }
    });
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('scheme and theme resolution', () => {
    it('should apply an explicit scheme and theme to the body', () => {
      createComponent();

      expect(mediaWatcher.onMediaQueryChange$).toHaveBeenCalledWith([
        '(prefers-color-scheme: dark)',
        '(prefers-color-scheme: light)'
      ]);
      expect(component.scheme).toBe('light');
      expect(component.theme).toBe('theme-default');
      expect(body.classList.contains('light')).toBe(true);
      expect(body.classList.contains('theme-default')).toBe(true);
    });

    it('should resolve the auto scheme to dark when the dark media query matches', () => {
      configSubject.next({ ...baseConfig(), scheme: 'auto' });
      mediaSubject.next(breakpoints(true));

      createComponent();

      expect(component.scheme).toBe('dark');
      expect(body.classList.contains('dark')).toBe(true);
      expect(body.classList.contains('light')).toBe(false);
    });

    it('should resolve the auto scheme to light when the dark media query does not match', () => {
      configSubject.next({ ...baseConfig(), scheme: 'auto' });
      mediaSubject.next(breakpoints(false));

      createComponent();

      expect(component.scheme).toBe('light');
      expect(body.classList.contains('light')).toBe(true);
    });

    it('should keep an explicit scheme even when the media query reports dark', () => {
      mediaSubject.next(breakpoints(true));

      createComponent();

      expect(component.scheme).toBe('light');
      expect(body.classList.contains('dark')).toBe(false);
    });

    it('should re-resolve the auto scheme when the media query changes', () => {
      configSubject.next({ ...baseConfig(), scheme: 'auto' });

      createComponent();
      expect(component.scheme).toBe('light');

      mediaSubject.next(breakpoints(true));

      expect(component.scheme).toBe('dark');
      expect(body.classList.contains('dark')).toBe(true);
      expect(body.classList.contains('light')).toBe(false);
    });

    it('should swap the previous theme class for the new one on config change', () => {
      createComponent();
      expect(body.classList.contains('theme-default')).toBe(true);

      configSubject.next({ ...baseConfig(), theme: 'theme-brand' });

      expect(component.theme).toBe('theme-brand');
      expect(body.classList.contains('theme-brand')).toBe(true);
      expect(body.classList.contains('theme-default')).toBe(false);
    });
  });

  describe('layout resolution', () => {
    it('should default the layout to compact', () => {
      createComponent();

      expect(component.layout()).toBe('compact');
      expect(component.config).toEqual(baseConfig());
    });

    it('should take the layout from the query param and write it into the config', () => {
      activatedRoute.snapshot.queryParamMap = convertToParamMap({ layout: 'empty' });

      createComponent();

      expect(component.layout()).toBe('empty');
      expect(component.config.layout).toBe('empty');
    });

    it('should take the layout from route data, the deepest path winning', () => {
      activatedRoute.pathFromRoot = [
        { routeConfig: { data: { layout: 'compact' } } },
        { routeConfig: null },
        { routeConfig: { data: { layout: 'empty' } } }
      ];

      createComponent();

      expect(component.layout()).toBe('empty');
    });

    it('should resolve the layout from the deepest activated child route', () => {
      activatedRoute.pathFromRoot = [{ routeConfig: { data: { layout: 'compact' } } }];
      activatedRoute.firstChild = {
        firstChild: null,
        snapshot: { queryParamMap: convertToParamMap({}) },
        pathFromRoot: [{ routeConfig: { data: { layout: 'empty' } } }]
      };

      createComponent();

      expect(component.layout()).toBe('empty');
    });

    it('should re-evaluate the layout only on NavigationEnd events', () => {
      createComponent();
      expect(component.layout()).toBe('compact');

      activatedRoute.pathFromRoot = [{ routeConfig: { data: { layout: 'empty' } } }];

      routerEvents.next({});
      expect(component.layout()).toBe('compact');

      routerEvents.next(new NavigationEnd(1, '/expenses', '/expenses'));
      expect(component.layout()).toBe('empty');
    });
  });

  describe('document setup', () => {
    it('should stamp the maguey version on the ng-version element and add the OS class', () => {
      createComponent();

      expect(documentMock.querySelector).toHaveBeenCalledWith('[ng-version]');
      expect(ngVersionEl.getAttribute('mg-version')).toBe(MAGUEY_VERSION);
      expect(body.classList.contains('os-test')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should ignore config emissions after destroy', () => {
      createComponent();
      fixture.destroy();

      configSubject.next({ ...baseConfig(), theme: 'theme-brand' });

      expect(component.theme).toBe('theme-default');
      expect(body.classList.contains('theme-brand')).toBe(false);
    });
  });
});
