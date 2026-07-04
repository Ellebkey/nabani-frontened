import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { TitleService } from './title.service';

interface RouteStub {
  firstChild: RouteStub | null;
  snapshot: { data: Record<string, unknown> };
}

describe('TitleService', () => {
  let service: TitleService;
  let routerEvents: Subject<unknown>;
  let title: { setTitle: jest.Mock };
  let route: RouteStub;

  const navigate = (): void => {
    routerEvents.next(new NavigationEnd(1, '/somewhere', '/somewhere'));
  };

  beforeEach(() => {
    routerEvents = new Subject<unknown>();
    title = { setTitle: jest.fn() };
    route = { firstChild: null, snapshot: { data: {} } };

    TestBed.configureTestingModule({
      providers: [
        TitleService,
        { provide: Title, useValue: title },
        { provide: Router, useValue: { events: routerEvents } },
        { provide: ActivatedRoute, useValue: route }
      ]
    });

    service = TestBed.inject(TitleService);
  });

  it('should set the capitalized route title suffixed with the app name', () => {
    route.firstChild = { firstChild: null, snapshot: { data: { title: 'gastos' } } };

    service.init();
    navigate();

    expect(title.setTitle).toHaveBeenCalledWith('Gastos - Nabani');
  });

  it('should read the title from the deepest child route', () => {
    route.firstChild = {
      firstChild: { firstChild: null, snapshot: { data: { title: 'resumen' } } },
      snapshot: { data: { title: 'padre' } }
    };

    service.init();
    navigate();

    expect(title.setTitle).toHaveBeenCalledWith('Resumen - Nabani');
  });

  it('should fall back to the base title when the route has no title data', () => {
    service.init();
    navigate();

    expect(title.setTitle).toHaveBeenCalledWith('Nabani');
  });

  it('should keep an already-capitalized title intact', () => {
    route.firstChild = { firstChild: null, snapshot: { data: { title: 'Dashboard' } } };

    service.init();
    navigate();

    expect(title.setTitle).toHaveBeenCalledWith('Dashboard - Nabani');
  });

  it('should ignore router events that are not NavigationEnd', () => {
    service.init();

    routerEvents.next(new NavigationStart(1, '/somewhere'));

    expect(title.setTitle).not.toHaveBeenCalled();
  });

  it('should not react to navigation before init() is called', () => {
    navigate();

    expect(title.setTitle).not.toHaveBeenCalled();
  });

  it('should update the title on every navigation', () => {
    service.init();
    navigate();

    route.firstChild = { firstChild: null, snapshot: { data: { title: 'ingresos' } } };
    navigate();

    expect(title.setTitle).toHaveBeenNthCalledWith(1, 'Nabani');
    expect(title.setTitle).toHaveBeenNthCalledWith(2, 'Ingresos - Nabani');
  });
});
