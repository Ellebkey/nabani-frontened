import { test, expect, Route } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS, PARTNERSHIP_FIXTURE } from './fixtures/app.fixtures';

/**
 * Dashboard (= AccountsComponent at /#/dashboard) loads on init, via forkJoin:
 *  - GET /accounts/with-graphics  → IAccounts { rows, graphics } (graphics spread into the pie apx-chart)
 *  - GET /accounts/monthly-trend?months=6 → MonthlyTrendDto { months, incomes, expenses }
 * then, with accounts present, the ledger of the first account:
 *  - GET /accounts/:id/ledger?limit=25&offset=0 → { rows, count }
 */
const ACCOUNTS_FIXTURE = {
  rows: [
    {
      id: 'acc-1',
      name: 'BBVA',
      currentAmount: 5000,
      value: 5000,
      showSection: true,
      colorPalette: '#3570B4',
      isPrimary: true,
      disable: false,
      ownerId: 'u-1'
    },
    {
      id: 'acc-2',
      name: 'Nu',
      currentAmount: 2500.5,
      value: 2500.5,
      showSection: false,
      colorPalette: '#6200a3',
      isPrimary: false,
      disable: false,
      ownerId: 'u-1'
    }
  ],
  // Template binds accountChart.labels/series/colors — apexcharts pie shape
  graphics: { labels: ['BBVA', 'Nu'], series: [5000, 2500.5], colors: ['#3570B4', '#6200a3'] }
};

const MONTHLY_TREND_FIXTURE = {
  months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  incomes: [10000, 12000, 9000, 11000, 13000, 12500],
  expenses: [8000, 9500, 7000, 10200, 9900, 8800]
};

const LEDGER_FIXTURE = {
  rows: [
    {
      transactionDate: '2026-06-05T10:30:00.000Z',
      description: 'Pago de luz',
      debitAmount: 350.75,
      creditAmount: 0,
      balance: 4649.25
    },
    {
      transactionDate: '2026-06-01T09:00:00.000Z',
      description: 'Depósito nómina',
      debitAmount: 0,
      creditAmount: 8000,
      balance: 12649.25
    }
  ],
  count: 2
};

/** IAccountSection[] for GET /account-section/account/acc-1 (Apartados modal). */
const SECTIONS_FIXTURE = [
  { id: 'sec-1', name: 'Vacaciones', comments: '', currentAmount: 1200 },
  { id: 'sec-2', name: 'Emergencias', comments: '', currentAmount: 800 }
];

const DASHBOARD_MOCKS = {
  ...COMMON_MOCKS,
  'GET /accounts/with-graphics': ACCOUNTS_FIXTURE,
  'GET /accounts/monthly-trend': MONTHLY_TREND_FIXTURE,
  'GET /accounts/acc-1/ledger': LEDGER_FIXTURE
};

/** The clickable account card is the quick-actions mat-menu trigger (aria-haspopup). */
function accountCard(page: import('@playwright/test').Page, name: string) {
  return page.locator('div[aria-haspopup]').filter({ hasText: name });
}

test.describe('Dashboard (accounts overview)', () => {
  test('renders account cards, monthly trend and the first account ledger', async ({ page, context }) => {
    const trendQueries: string[] = [];
    const ledgerQueries: URLSearchParams[] = [];

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...DASHBOARD_MOCKS,
      'GET /accounts/monthly-trend': (route: Route) => {
        trendQueries.push(new URL(route.request().url()).searchParams.get('months') ?? '');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MONTHLY_TREND_FIXTURE)
        });
      },
      'GET /accounts/acc-1/ledger': (route: Route) => {
        ledgerQueries.push(new URL(route.request().url()).searchParams);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(LEDGER_FIXTURE)
        });
      }
    });

    await page.goto('/#/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Cuentas y movimientos')).toBeVisible();
    await expect(page.getByText('Saldo total')).toBeVisible();

    // Account cards with es-MX MXN balances
    await expect(accountCard(page, 'BBVA')).toContainText('$5,000.00');
    await expect(accountCard(page, 'Nu')).toContainText('$2,500.50');

    // Monthly trend card with the Maguey custom legend (apex legend is hidden)
    await expect(page.getByText('Tendencia mensual')).toBeVisible();
    await expect(page.getByText('Últimos 6 meses de actividad')).toBeVisible();
    await expect(page.locator('app-accounts').getByText('Ingresos', { exact: true })).toBeVisible();
    await expect(page.locator('app-accounts').getByText('Gastos', { exact: true })).toBeVisible();
    await expect.poll(() => trendQueries).toContain('6');

    // Ledger rows of the auto-selected first account (transaction rows, no table)
    await expect(page.getByText('Movimientos de la cuenta')).toBeVisible();
    await expect(page.getByText('Pago de luz')).toBeVisible();
    await expect(page.getByText('−$350.75')).toBeVisible();
    await expect(page.getByText('Depósito nómina')).toBeVisible();
    await expect(page.getByText('+$8,000.00')).toBeVisible();
    await expect(page.getByText('Saldo $12,649.25')).toBeVisible();

    await expect.poll(() => ledgerQueries.length).toBeGreaterThan(0);
    expect(ledgerQueries[0].get('limit')).toBe('25');
    expect(ledgerQueries[0].get('offset')).toBe('0');
  });

  test('shows the empty states when there are no accounts', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /accounts/with-graphics': { rows: [], graphics: {} },
      'GET /accounts/monthly-trend': { months: [], incomes: [], expenses: [] }
    });

    await page.goto('/#/dashboard');

    await expect(page.getByText('No hay cuentas registradas')).toBeVisible();
    await expect(page.getByText('Las cuentas aparecerán aquí cuando las registres')).toBeVisible();

    // Ledger empty state replaces the list entirely
    await expect(page.getByText('No hay movimientos')).toBeVisible();
    await expect(page.getByText('El libro mayor aparecerá cuando registres cuentas y transacciones')).toBeVisible();
    await expect(page.getByText('Movimientos de la cuenta')).toHaveCount(0);
  });

  test('opens the Apartados modal from an account card and previews balances', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...DASHBOARD_MOCKS,
      'GET /account-section/account/acc-1': SECTIONS_FIXTURE
    });

    await page.goto('/#/dashboard');

    // The card opens the quick-actions menu (Transferencias / Apartados)
    await accountCard(page, 'BBVA').click();
    await expect(page.getByRole('menuitem', { name: 'Transferencias' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Apartados' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('BBVA · aparta dinero sin moverlo de la cuenta')).toBeVisible();

    // Balance split: Disponible = account balance, Apartado = sum of sections
    await expect(dialog.getByText('Disponible', { exact: true })).toBeVisible();
    await expect(dialog.getByText('$5,000.00').first()).toBeVisible();
    await expect(dialog.getByText('$2,000.00').first()).toBeVisible(); // apartado total
    await expect(dialog.getByText('$7,000.00')).toBeVisible(); // saldo total

    // Sections listed with their balances
    await expect(dialog.getByText('Vacaciones')).toBeVisible();
    await expect(dialog.getByText('$1,200.00').first()).toBeVisible();
    await expect(dialog.getByText('Emergencias')).toBeVisible();
    await expect(dialog.getByText('$800.00').first()).toBeVisible();

    // Open the inline deposit panel on Vacaciones and preview the new balance.
    // The create-section form at the bottom also has a "$0.00" input, so target
    // the adjust panel's control explicitly (the panel renders async under zoneless).
    await dialog.locator('button[title="Depositar / retirar"]').first().click();
    await dialog.locator('input[formControlName="amount"]').fill('300');
    await expect(dialog.getByText('$1,500.00')).toBeVisible(); // 1,200 + 300 preview

    await dialog.getByRole('button', { name: 'Cerrar' }).last().click();
    await expect(page.getByText('aparta dinero sin moverlo de la cuenta')).toHaveCount(0);
  });
});

/**
 * FamilyInviteBannerComponent renders at the top of the dashboard when the
 * family state is loaded, there is NO partnership and the banner was not
 * dismissed (localStorage 'family-invite-banner-dismissed').
 */
test.describe('Family invite banner (dashboard)', () => {
  const banner = (page: import('@playwright/test').Page) => page.locator('app-family-invite-banner');

  test('premium user without a hogar sees the banner with the create CTA', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, DASHBOARD_MOCKS); // GET /partnerships/me → null

    await page.goto('/#/dashboard');

    await expect(banner(page).getByText('¿Llevan gastos en pareja?')).toBeVisible();
    await expect(banner(page).getByText(/Invita a tu pareja al Modo Familiar/)).toBeVisible();

    // Premium variant: flat CTA button, no upsell link or chip.
    await expect(banner(page).getByRole('button', { name: 'Crear mi hogar' })).toBeVisible();
    await expect(banner(page).getByRole('link', { name: 'Conoce el Modo Familiar' })).toHaveCount(0);
    await expect(banner(page).getByText('Premium', { exact: true })).toHaveCount(0);
  });

  test('free user sees the upsell link with the Premium chip instead of the CTA', async ({ page, context }) => {
    await seedAuth(context, { roles: ['free'] });
    await mockApi(context, DASHBOARD_MOCKS);

    await page.goto('/#/dashboard');

    await expect(banner(page).getByText('¿Llevan gastos en pareja?')).toBeVisible();
    await expect(banner(page).getByRole('link', { name: 'Conoce el Modo Familiar' })).toBeVisible();
    await expect(banner(page).getByText('Premium', { exact: true })).toBeVisible();
    await expect(banner(page).getByRole('button', { name: 'Crear mi hogar' })).toHaveCount(0);
  });

  test('dismissing the banner hides it and persists across a reload', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, DASHBOARD_MOCKS);

    await page.goto('/#/dashboard');

    await expect(banner(page).getByText('¿Llevan gastos en pareja?')).toBeVisible();
    await banner(page).getByRole('button', { name: 'Descartar' }).click();

    await expect(banner(page).getByText('¿Llevan gastos en pareja?')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('family-invite-banner-dismissed'))).toBe('true');

    // The dismissal is read back from localStorage on boot.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(banner(page).getByText('¿Llevan gastos en pareja?')).toHaveCount(0);
  });

  test('does not render for a user who already has a hogar', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...DASHBOARD_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE
    });

    const partnershipLoaded = page.waitForResponse(resp => resp.url().includes('/partnerships/me'));
    await page.goto('/#/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await partnershipLoaded;

    await expect(banner(page).getByText('¿Llevan gastos en pareja?')).toHaveCount(0);
  });
});

test.describe('Logout', () => {
  test('signs out from the user menu, clears the session and redirects to login', async ({ page, context }) => {
    let logoutPayload: Record<string, unknown> | undefined;

    await seedAuth(context, { roles: ['premium'], username: 'e2e-user' });
    await mockApi(context, {
      ...DASHBOARD_MOCKS,
      'POST /auth/logout': (route: Route) => {
        logoutPayload = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    await page.goto('/#/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // User menu in the toolbar (user.component.html)
    await page.locator('user').getByRole('button').click();
    await expect(page.getByText('e2e-user', { exact: true })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/#\/authentication\/login/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();

    // The seeded refresh token is revoked against the API
    await expect.poll(() => logoutPayload).toEqual({ refreshToken: 'e2e-fake-refresh-token' });

    // Session storage fully cleared
    const stored = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refreshToken'),
      roles: localStorage.getItem('roles'),
      username: localStorage.getItem('username')
    }));
    expect(stored).toEqual({ token: null, refreshToken: null, roles: null, username: null });
  });
});
