import { test, expect } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS, PARTNERSHIP_FIXTURE } from './fixtures/app.fixtures';

/** Extra mocks so the dashboard (AccountsComponent) renders without errors. */
const DASHBOARD_MOCKS = {
  'GET /accounts/with-graphics': { rows: [], count: 0, graphics: {} },
  'GET /accounts/monthly-trend': { months: [], incomes: [], expenses: [] }
};

/** One expense as the list renders it (IExpense inside an IExpenseDateGroup). */
const EXPENSE_ROW = {
  id: 101,
  expenseDate: '2026-06-09T14:30:00',
  totalAmount: 450.5,
  isMonths: false,
  isPayout: true,
  remainingMonths: 0,
  totalMonths: 0,
  debtAmount: 0,
  paymentMethodId: 'pm-1',
  cardType: 'debit',
  cardIcon: 'visa',
  method: 'debit',
  backgroundColor: '#3B82F6',
  recipientName: 'Soriana',
  firstArticleName: 'Despensa semanal',
  shortName: 'Débito BBVA',
  cardNumber: '1234',
  articles: []
};

/** GET /expenses returns date-grouped rows: { rows: IExpenseDateGroup[], count } */
const EXPENSES_RESPONSE = {
  rows: [{ dateLabel: '2026-06-09', expenses: [EXPENSE_ROW] }],
  count: 1
};

/** GET /total-expenses-by-category → ChartData for the side chart. */
const CATEGORY_CHART = {
  series: [{ name: 'Gastos', data: [{ x: 'Hogar', y: 450.5 }] }]
};

test.describe('Expenses & navigation', () => {
  test('navigates from the dashboard to Nuestros Gastos via the Familia aside menu', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS, ...DASHBOARD_MOCKS });

    await page.goto('/#/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // The main rail renders one aside item per nav group (icon + title, no children).
    const familiaRailItem = page
      .locator('.mg-vertical-navigation-content mg-vertical-navigation-aside-item')
      .filter({ hasText: 'Familia' });
    await expect(familiaRailItem).toBeVisible();

    // Clicking the group opens the aside panel that contains the child links.
    await familiaRailItem.click();

    const spendingLink = page.getByRole('link', { name: 'Nuestros Gastos' });
    await expect(spendingLink).toBeVisible();
    await spendingLink.click();

    await expect(page).toHaveURL(/#\/family\/spending/);
    // No partnership in COMMON_MOCKS → the shared-spending page shows the empty state.
    await expect(page.getByText('Aún no tienes un hogar')).toBeVisible();
  });

  test('renders a date-grouped expense row on the expenses list', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /expenses': EXPENSES_RESPONSE,
      'GET /total-expenses-by-category': CATEGORY_CHART
    });

    await page.goto('/#/expenses/list');

    await expect(page.getByRole('heading', { name: 'Gastos', exact: true })).toBeVisible();

    // Date group header ("EEE — d 'de' MMMM" in es-MX).
    await expect(page.getByText(/9 de junio/)).toBeVisible();

    // The single expense card inside the group.
    const row = page.locator('app-expenses-item-detail');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('INV-101');
    await expect(row).toContainText('Soriana');
    await expect(row).toContainText('Débito BBVA · 1234');
    await expect(row).toContainText('$450.50');
  });

  test('create modal has no Visibilidad familiar field, even with an active partnership', async ({ page, context }) => {
    // v2: sharing is category-driven (exclusion-based) — the per-expense
    // shareScope control was removed from the create modal entirely.
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS, 'GET /partnerships/me': PARTNERSHIP_FIXTURE });

    await page.goto('/#/expenses/list');
    await expect(page.getByRole('heading', { name: 'Gastos', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo' }).click();

    await expect(page.getByText('Registrar Gasto')).toBeVisible();

    // A neighbouring field renders, so the form is up — and the family field is absent.
    await expect(page.getByText('Modo Costco')).toBeVisible();
    await expect(page.getByText('Visibilidad familiar')).toHaveCount(0);
  });
});
