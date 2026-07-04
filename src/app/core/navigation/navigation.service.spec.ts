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

  const findChild = (
    items: MagueyNavigationItem[],
    parentId: string,
    childId: string
  ): MagueyNavigationItem | undefined =>
    items.find(item => item.id === parentId)?.children?.find(child => child.id === childId);

  beforeEach(() => {
    auth = { isAdmin: jest.fn().mockReturnValue(false) };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }]
    });

    service = TestBed.inject(NavigationService);
  });

  it('should emit the full menu synchronously', () => {
    const items = getMenu();

    expect(items.map(item => item.id)).toEqual([
      'dashboard',
      'expenses',
      'inventory',
      'incomes',
      'reports',
      'family',
      'admin'
    ]);
  });

  it('should hide admin.categories for non-admin users', () => {
    auth.isAdmin.mockReturnValue(false);

    const child = findChild(getMenu(), 'admin', 'admin.categories');

    expect(child?.hidden).toBeDefined();
    expect(child!.hidden!(child!)).toBe(true);
  });

  it('should show admin.categories for admins', () => {
    auth.isAdmin.mockReturnValue(true);

    const child = findChild(getMenu(), 'admin', 'admin.categories');

    expect(child!.hidden!(child!)).toBe(false);
  });

  it('should re-evaluate the admin role on every hidden() call', () => {
    auth.isAdmin.mockReturnValue(false);
    const child = findChild(getMenu(), 'admin', 'admin.categories')!;

    expect(child.hidden!(child)).toBe(true);

    auth.isAdmin.mockReturnValue(true);

    expect(child.hidden!(child)).toBe(false);
  });

  it('should not attach hidden to other admin children', () => {
    const items = getMenu();

    expect(findChild(items, 'admin', 'admin.accounts')?.hidden).toBeUndefined();
    expect(findChild(items, 'admin', 'admin.payment-methods')?.hidden).toBeUndefined();
    expect(findChild(items, 'admin', 'admin.tags')?.hidden).toBeUndefined();
  });

  it('should keep non-admin sections untouched', () => {
    const items = getMenu();
    const family = items.find(item => item.id === 'family');

    expect(family?.children?.map(child => child.id)).toEqual([
      'family.spending',
      'family.budgets',
      'family.settings'
    ]);
    expect(family?.children?.every(child => child.hidden === undefined)).toBe(true);
  });

  it('should not mutate the source menu data', () => {
    getMenu();

    const sourceChild = menu
      .find(item => item.id === 'admin')
      ?.children?.find(child => child.id === 'admin.categories');

    expect(sourceChild?.hidden).toBeUndefined();
  });

  describe('top-level items without children', () => {
    // Every real top-level item has children, so we temporarily append a
    // childless item to the imported menu array and restore it afterwards.
    const orphan: MagueyNavigationItem = {
      id: 'standalone',
      title: 'Suelto',
      type: 'basic',
      link: '/standalone'
    };

    beforeEach(() => {
      menu.push(orphan);
    });

    afterEach(() => {
      const index = menu.indexOf(orphan);
      if (index !== -1) {
        menu.splice(index, 1);
      }
    });

    it('should pass a childless top-level item through unchanged', () => {
      const items = getMenu();
      const result = items.find(item => item.id === 'standalone');

      expect(result).toBe(orphan);
      expect(result?.children).toBeUndefined();
      expect(result?.hidden).toBeUndefined();
    });
  });
});
