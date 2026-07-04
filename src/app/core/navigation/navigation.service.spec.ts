import { TestBed } from '@angular/core/testing';
import { MagueyNavigationItem } from '@maguey/components/navigation';

import { NavigationService } from './navigation.service';
import { AuthService } from '@app/core/auth/auth.service';
import { menu } from '@app/core/navigation/navigation.menu.data';

describe('NavigationService', () => {
  let service: NavigationService;
  let auth: { isAdmin: jest.Mock };

  const getMenu = (): MagueyNavigationItem[] => {
    let items: MagueyNavigationItem[] = [];
    service.get().subscribe(result => (items = result));
    return items;
  };

  beforeEach(() => {
    auth = { isAdmin: jest.fn().mockReturnValue(false) };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }]
    });

    service = TestBed.inject(NavigationService);
  });

  it('should expose the 6 Nabani sections to admins', () => {
    auth.isAdmin.mockReturnValue(true);

    expect(getMenu().map(item => item.id)).toEqual([
      'hoy',
      'planeacion',
      'produccion',
      'pacientes',
      'finanzas',
      'catalogos'
    ]);
  });

  it('should hide Finanzas and Catálogos for non-admins (incl. nutrióloga)', () => {
    auth.isAdmin.mockReturnValue(false);

    expect(getMenu().map(item => item.id)).toEqual([
      'hoy',
      'planeacion',
      'produccion',
      'pacientes'
    ]);
  });

  it('should re-evaluate the admin role on every call', () => {
    auth.isAdmin.mockReturnValue(false);
    expect(getMenu()).toHaveLength(4);

    auth.isAdmin.mockReturnValue(true);
    expect(getMenu()).toHaveLength(6);
  });

  it('should not mutate the source menu data', () => {
    getMenu();
    expect(menu.map(item => item.id)).toEqual([
      'hoy',
      'planeacion',
      'produccion',
      'pacientes',
      'finanzas',
      'catalogos'
    ]);
  });
});
