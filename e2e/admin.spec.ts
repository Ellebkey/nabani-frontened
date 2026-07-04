import { test, expect, Route } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS } from './fixtures/app.fixtures';

/** Extra mocks so the dashboard (redirect target / nav host page) renders without errors. */
const DASHBOARD_MOCKS = {
  'GET /accounts/with-graphics': { rows: [], count: 0, graphics: {} },
  'GET /accounts/monthly-trend': { months: [], incomes: [], expenses: [] }
};

/** GET /tags → TagListResponse { rows, count }. */
const TAGS_FIXTURE = {
  rows: [
    { id: 1, name: 'Viaje CDMX', color: '#3B82F6', description: 'Gastos del viaje' },
    { id: 2, name: 'Cumpleaños', color: '#EC4899', description: null }
  ],
  count: 2
};

/** GET /accounts → AccountsResponse { rows: IAccount[], count }. */
const ACCOUNT_ROWS = [
  {
    id: 'acc-1', name: 'Bancomer', currentAmount: 12500, value: 0, showSection: false,
    colorPalette: '#3570B4', isPrimary: true, disable: false, ownerId: 'u-1'
  },
  {
    id: 'acc-2', name: 'Efectivo', currentAmount: 800, value: 0, showSection: false,
    colorPalette: '#ffcc00', isPrimary: false, disable: false, ownerId: 'u-1'
  }
];

/** GET /payment-methods → raw BackendListItem[] (the api service maps it to rows/count). */
const PAYMENT_METHODS_FIXTURE = [
  {
    id: 'pm-1', name: 'BBVA Débito', shortName: 'Débito BBVA', method: 'debit',
    cardNumber: '4152313112341234', accountId: 'acc-1', accountName: 'Bancomer',
    isActive: true, backgroundColor: '#004369'
  },
  {
    id: 'pm-2', name: 'Cartera', shortName: 'Cartera', method: 'cash',
    cardNumber: null, accountId: 'acc-2', accountName: 'Efectivo',
    isActive: false, backgroundColor: '#7C9A5C'
  }
];

/** GET /categories → ICategory[] for the admin categories page. */
const ADMIN_CATEGORIES_FIXTURE = [
  {
    id: 1, name: 'Hogar', colorPalette: '#3B82F6', enabledTiers: ['free', 'premium'],
    subcategories: [
      { id: 11, name: 'Renta', categoryId: 1, enabledTiers: ['free', 'premium'] },
      { id: 12, name: 'Servicios', categoryId: 1, enabledTiers: ['free', 'premium'] }
    ]
  },
  {
    id: 2, name: 'Viajes', colorPalette: '#F59E0B', enabledTiers: ['premium'],
    subcategories: [
      { id: 21, name: 'Vuelos', categoryId: 2, enabledTiers: ['premium'] }
    ]
  }
];

test.describe('Admin: tags CRUD', () => {
  test('renders the mocked tags and creates a new tag through the modal', async ({ page, context }) => {
    let createBody: { name?: string; color?: string; description?: string | null } | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /tags': TAGS_FIXTURE,
      'POST /tags': (route: Route) => {
        createBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 99, name: createBody?.name, color: createBody?.color, description: null })
        });
      }
    });

    await page.goto('/#/admin/tags');

    await expect(page.getByRole('heading', { name: 'Etiquetas' })).toBeVisible();
    await expect(page.getByText('Viaje CDMX')).toBeVisible();
    await expect(page.getByText('Cumpleaños')).toBeVisible();

    await page.getByRole('button', { name: 'Nueva etiqueta' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Nueva etiqueta')).toBeVisible();

    await modal.getByPlaceholder('Ej: Viaje Navidad 2025, Cumpleaños…').fill('Navidad 2026');
    // Pick the 6th muted swatch (Laguna #58939C) instead of the default (Marino #3B5F82).
    await modal.locator('mg-color-swatches button').nth(5).click();
    await modal.getByRole('button', { name: 'Crear', exact: true }).click();

    await expect(page.getByText('Etiqueta creada exitosamente')).toBeVisible();
    await expect(page.getByText('Navidad 2026')).toBeVisible();
    await expect(modal).toHaveCount(0);

    expect(createBody).toEqual({ name: 'Navidad 2026', color: '#58939C', description: null });
  });

  test('deletes a tag from the card menu after accepting the confirm dialog', async ({ page, context }) => {
    let confirmMessage: string | undefined;
    let deleteRequest: { method: string; path: string } | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /tags': TAGS_FIXTURE,
      'DELETE /tags/1': (route: Route) => {
        deleteRequest = {
          method: route.request().method(),
          path: new URL(route.request().url()).pathname.replace(/^.*?\/api/, '')
        };
        return route.fulfill({ status: 204 });
      }
    });

    await page.goto('/#/admin/tags');
    await expect(page.getByText('Viaje CDMX')).toBeVisible();

    // deleteTag() uses the native confirm() — accept it when it pops.
    page.once('dialog', (dialog) => {
      confirmMessage = dialog.message();
      return dialog.accept();
    });

    const card = page.locator('div.bg-card').filter({ hasText: 'Viaje CDMX' });
    await card.getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();

    await expect(page.getByText('Etiqueta eliminada exitosamente')).toBeVisible();
    await expect(page.getByText('Viaje CDMX')).toHaveCount(0);
    await expect(page.getByText('Cumpleaños')).toBeVisible();

    expect(confirmMessage).toBe('¿Estás seguro de eliminar la etiqueta "Viaje CDMX"?');
    expect(deleteRequest).toEqual({ method: 'DELETE', path: '/tags/1' });
  });
});

test.describe('Admin: accounts management', () => {
  test('create flow opens the form modal and the saldo-inicial confirmation before POSTing', async ({ page, context }) => {
    let createBody: { name?: string; currentAmount?: number; colorPalette?: string } | undefined;
    let createdAccount: Record<string, unknown> | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      // Stateful: after the POST succeeds the state refetches, so include the new account.
      'GET /accounts': (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rows: createdAccount ? [...ACCOUNT_ROWS, createdAccount] : ACCOUNT_ROWS,
            count: createdAccount ? 3 : 2
          })
        }),
      'POST /accounts': (route: Route) => {
        createBody = route.request().postDataJSON();
        createdAccount = {
          id: 'acc-99', name: createBody?.name, currentAmount: createBody?.currentAmount,
          value: 0, showSection: false, colorPalette: createBody?.colorPalette,
          isPrimary: false, disable: false, ownerId: 'u-1'
        };
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdAccount)
        });
      }
    });

    await page.goto('/#/admin/accounts');

    await expect(page.getByRole('heading', { name: 'Cuentas y métodos de pago' })).toBeVisible();
    await expect(page.locator('app-account-card-grid').getByText('Bancomer')).toBeVisible();
    await expect(page.getByText('$12,500')).toBeVisible();

    await page.getByRole('button', { name: 'Nueva cuenta' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Nueva cuenta')).toBeVisible();

    await modal.getByPlaceholder('Nombre de la cuenta').fill('Nu Bank');
    await modal.getByPlaceholder('0.00').fill('1500');
    await modal.getByRole('button', { name: 'Crear', exact: true }).click();

    // The form modal closes and the MagueyConfirmation dialog opens — no POST yet.
    await expect(page.getByText('Confirmar saldo inicial')).toBeVisible();
    await expect(page.getByText(/saldo inicial no podrá ser modificado manualmente/)).toBeVisible();
    expect(createBody).toBeUndefined();

    await page.getByRole('button', { name: 'Confirmar y crear' }).click();

    await expect(page.getByText('Cuenta creada exitosamente')).toBeVisible();
    await expect(page.locator('app-account-card-grid').getByText('Nu Bank')).toBeVisible();

    expect(createBody).toEqual({ name: 'Nu Bank', currentAmount: 1500, colorPalette: '#3B5F82' });
  });
});

test.describe('Admin: categories role gating', () => {
  test('premium user does not see the Categorías item in the Administración aside', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS, ...DASHBOARD_MOCKS });

    await page.goto('/#/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const adminRailItem = page
      .locator('.mg-vertical-navigation-content mg-vertical-navigation-aside-item')
      .filter({ hasText: 'Administración' });
    await expect(adminRailItem).toBeVisible();
    await adminRailItem.click();

    await expect(page.getByRole('link', { name: 'Etiquetas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Métodos de Pago' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Categorías', exact: true })).toHaveCount(0);
  });

  test('premium user navigating directly to /#/admin/categories is redirected to the dashboard', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS, ...DASHBOARD_MOCKS });

    await page.goto('/#/admin/categories');

    // roleGuardFn → router.createUrlTree(['/dashboard'])
    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Gestión de Categorías')).toHaveCount(0);
  });

  test('admin user loads the categories page with the mocked GET /categories', async ({ page, context }) => {
    await seedAuth(context, { roles: ['admin'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /categories': ADMIN_CATEGORIES_FIXTURE
    });

    await page.goto('/#/admin/categories');

    await expect(page).toHaveURL(/#\/admin\/categories/);
    await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
    await expect(page.getByText('2 categorías · 3 subcategorías')).toBeVisible();
    await expect(page.getByText('Hogar', { exact: true })).toBeVisible();
    await expect(page.getByText('Viajes', { exact: true })).toBeVisible();
  });
});

test.describe('Admin: payment methods', () => {
  test('renders the mocked cards and deactivating one sends the captured PUT', async ({ page, context }) => {
    let toggleBody: { isActive?: boolean } | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /payment-methods': PAYMENT_METHODS_FIXTURE,
      'PUT /payment-methods/pm-1': (route: Route) => {
        toggleBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...PAYMENT_METHODS_FIXTURE[0], isActive: false })
        });
      }
    });

    await page.goto('/#/admin/payment-methods');

    await expect(page.getByRole('heading', { name: 'Cuentas y métodos de pago' })).toBeVisible();
    // Active methods render plain; inactive ones under the 'Pausados' kicker
    await expect(page.getByText('Pausados', { exact: true })).toBeVisible();

    const activeCard = page.locator('.bg-card').filter({ hasText: 'Débito BBVA' }).first();
    await expect(activeCard).toBeVisible();
    await expect(activeCard.getByText('Bancomer', { exact: true })).toBeVisible();

    await activeCard.getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Pausar' }).click();

    await expect(page.getByText('Método de pago desactivado exitosamente')).toBeVisible();
    await expect(page.getByText('Débito BBVA').first()).toBeVisible();

    expect(toggleBody).toEqual({ isActive: false });
  });
});
