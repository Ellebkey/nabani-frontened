import { test, expect, Route } from '@playwright/test';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { seedAuth, mockApi, COMMON_MOCKS, PARTNERSHIP_FIXTURE } from './fixtures/app.fixtures';

/** Mirrors the components' monthLabel computed (format 'MMMM yyyy' es, capitalized). */
function monthLabel(date: Date): string {
  const label = format(date, 'MMMM yyyy', { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Mirrors the components' periodMonth computed (format 'yyyy-MM'). */
function periodMonth(date: Date): string {
  return format(date, 'yyyy-MM');
}

/** ISharedSpending — one shared category with spend. */
const SPENDING_FIXTURE = {
  rows: [{ categoryId: 1, categoryName: 'Hogar', colorPalette: '#3B82F6', total: 300 }],
  total: 300
};

/** ISharedTicket[] (v2 grouped tickets) — u-1 is the seeded e2e-user (chip 'Tú'), u-2 is 'pareja'. */
const SHARED_TICKETS_FIXTURE = [
  {
    expenseId: 101,
    expenseDate: '2026-06-03T12:00:00.000Z',
    userId: 'u-1',
    recipientName: 'Soriana',
    items: [
      { articleId: 11, articleName: 'Leche entera', categoryId: 2, categoryName: 'Súper', subtotal: 120 },
      { articleId: 12, articleName: 'Pan integral', categoryId: 2, categoryName: 'Súper', subtotal: 60 }
    ],
    ticketTotal: 180
  },
  {
    expenseId: 102,
    expenseDate: '2026-06-07T12:00:00.000Z',
    userId: 'u-2',
    recipientName: 'Walmart',
    items: [
      { articleId: 21, articleName: 'Detergente', categoryId: 1, categoryName: 'Hogar', subtotal: 95.5 }
    ],
    ticketTotal: 95.5
  }
];

test.describe('Family shared spending', () => {
  test('renders the shared total, category breakdown and grouped ticket movements', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE,
      'GET /partnerships/shared/spending': SPENDING_FIXTURE,
      'GET /partnerships/shared/expenses': SHARED_TICKETS_FIXTURE
    });

    await page.goto('/#/family/spending');

    await expect(page.getByRole('heading', { name: 'Nuestros gastos' })).toBeVisible();

    // Total card — es-MX currency pipe renders MXN as $300.00
    const totalCard = page.locator('.bg-card', { hasText: 'Total compartido' }).first();
    await expect(totalCard).toContainText('$300.00');

    // Category breakdown card
    const breakdownCard = page.locator('.bg-card.rounded-card', { hasText: 'Por categoría' });
    await expect(breakdownCard.getByText('Hogar', { exact: true })).toBeVisible();
    await expect(breakdownCard).toContainText('$300.00');

    // Movements: transaction rows headed by recipient + member label + ticket total
    const movementsCard = page.locator('.bg-card.rounded-card', { hasText: 'Movimientos' });
    const sorianaRow = movementsCard.locator('mg-transaction-row', { hasText: 'Soriana' });
    const walmartRow = movementsCard.locator('mg-transaction-row', { hasText: 'Walmart' });
    await expect(sorianaRow).toBeVisible();
    await expect(walmartRow).toBeVisible();
    await expect(sorianaRow).toContainText('Tú');
    await expect(walmartRow).toContainText('pareja');
    await expect(sorianaRow).toContainText('$180.00');

    // Expanding the own ticket (Soriana) reveals its item lines
    await sorianaRow.click();
    await expect(movementsCard.getByText('Leche entera')).toBeVisible();
    await expect(movementsCard.getByText('$120.00')).toBeVisible();
    await expect(movementsCard.getByText('Pan integral')).toBeVisible();
    await expect(movementsCard.getByText('$60.00')).toBeVisible();

    // Partner ticket (Walmart) expands with its single item and category pill
    await walmartRow.click();
    await expect(movementsCard.getByText('Detergente')).toBeVisible();
    await expect(movementsCard.getByText('Hogar', { exact: true }).first()).toBeVisible();
    await expect(movementsCard.getByText('$95.50')).toHaveCount(4); // date-group sum + row total + item + expando total
  });

  test('month navigation requests the previous periodMonth', async ({ page, context }) => {
    const seenPeriodMonths: string[] = [];

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE,
      'GET /partnerships/shared/spending': (route: Route) => {
        seenPeriodMonths.push(new URL(route.request().url()).searchParams.get('periodMonth') ?? '');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(SPENDING_FIXTURE)
        });
      },
      'GET /partnerships/shared/expenses': SHARED_TICKETS_FIXTURE
    });

    await page.goto('/#/family/spending');

    const now = new Date();
    await expect(page.getByText(`Total compartido · ${monthLabel(now)}`)).toBeVisible();
    await expect.poll(() => seenPeriodMonths).toContain(periodMonth(now));

    await page.locator('button:has(mat-icon[data-mat-icon-name="chevron-left"])').first().click();

    const previous = subMonths(now, 1);
    await expect(page.getByText(`Total compartido · ${monthLabel(previous)}`)).toBeVisible();
    await expect.poll(() => seenPeriodMonths).toContain(periodMonth(previous));
  });
});

test.describe('Family budgets', () => {
  const currentPeriod = periodMonth(new Date());

  /**
   * v2: budgetable categories come from GET /categories minus the partnership's
   * excludedCategories (99 = Personal in PARTNERSHIP_FIXTURE) minus already-budgeted.
   */
  const ALL_CATEGORIES_FIXTURE = [
    { id: 1, name: 'Hogar', colorPalette: '#3B82F6', enabledTiers: ['free', 'premium'], subcategories: [] },
    { id: 2, name: 'Súper', colorPalette: '#22C55E', enabledTiers: ['free', 'premium'], subcategories: [] },
    { id: 99, name: 'Personal', colorPalette: '#F43F5E', enabledTiers: ['free', 'premium'], subcategories: [] }
  ];

  const budgetHogar = {
    id: 'b-1',
    categoryId: 1,
    amount: 500,
    periodMonth: currentPeriod,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  };
  const budgetSuper = {
    id: 'b-2',
    categoryId: 2,
    amount: 400,
    periodMonth: currentPeriod,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  };

  const statusRowHogar = {
    categoryId: 1,
    categoryName: 'Hogar',
    colorPalette: '#3B82F6',
    budgeted: 500,
    spent: 200,
    remaining: 300
  };
  const statusRowSuperExceeded = {
    categoryId: 2,
    categoryName: 'Súper',
    colorPalette: '#22C55E',
    budgeted: 400,
    spent: 550,
    remaining: -150
  };

  test('shows summary cards and flags the exceeded category', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE,
      'GET /categories': ALL_CATEGORIES_FIXTURE,
      'GET /partnerships/budgets': [budgetHogar, budgetSuper],
      'GET /partnerships/budgets/status': {
        rows: [statusRowHogar, statusRowSuperExceeded],
        totalBudgeted: 900,
        totalSpent: 750
      }
    });

    await page.goto('/#/family/budgets');

    await expect(page.getByRole('heading', { name: 'Presupuestos del hogar' })).toBeVisible();

    // Summary cards
    await expect(page.locator('.bg-card', { hasText: 'Presupuestado' }).first()).toContainText('$900.00');
    await expect(page.locator('.bg-card', { hasText: 'Gastado' }).first()).toContainText('$750.00');
    await expect(page.locator('.bg-card', { hasText: 'Disponible' }).first()).toContainText('$150.00');

    // Within-budget row vs exceeded row (spent of budgeted + % state)
    const hogarCard = page.locator('.bg-card.rounded-card', { hasText: 'Hogar' });
    await expect(hogarCard).toContainText('$200.00');
    await expect(hogarCard).toContainText('de $500.00');
    await expect(hogarCard).toContainText('40%');
    const superCard = page.locator('.bg-card.rounded-card', { hasText: 'Súper' });
    await expect(superCard).toContainText('de $400.00');
    await expect(superCard).toContainText('138%');

    // Every household (non-excluded) category is already budgeted, so the create
    // button is disabled — Personal (99) is excluded and never budgetable.
    await expect(page.getByRole('button', { name: 'Nuevo presupuesto' })).toBeDisabled();
  });

  test('create modal lists only un-budgeted household categories and posts the new budget', async ({ page, context }) => {
    let createdPayload: Record<string, unknown> | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE,
      'GET /categories': ALL_CATEGORIES_FIXTURE,
      'GET /partnerships/budgets': [budgetHogar],
      'GET /partnerships/budgets/status': {
        rows: [statusRowHogar],
        totalBudgeted: 500,
        totalSpent: 200
      },
      'POST /partnerships/budgets': (route: Route) => {
        createdPayload = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ...budgetSuper, id: 'b-new' })
        });
      }
    });

    await page.goto('/#/family/budgets');

    // Wait until the fetched budgets are applied so availableCategories excludes Hogar
    await expect(page.getByText('de $500.00')).toBeVisible();

    const createButton = page.getByRole('button', { name: 'Nuevo presupuesto' });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await expect(page.getByText(`Nuevo presupuesto · ${monthLabel(new Date())}`)).toBeVisible();

    // Only Súper is offered: Hogar is already budgeted and Personal (99) is excluded.
    await page.getByRole('combobox', { name: 'Categoría compartida' }).click();
    await expect(page.getByRole('option', { name: 'Súper' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Hogar' })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Personal' })).toHaveCount(0);
    await page.getByRole('option', { name: 'Súper' }).click();

    await page.getByLabel('Monto mensual').fill('400');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();

    await expect.poll(() => createdPayload).toEqual({
      categoryId: 2,
      amount: 400,
      periodMonth: currentPeriod
    });
    await expect(page.getByText('Presupuesto creado exitosamente')).toBeVisible();
  });
});
