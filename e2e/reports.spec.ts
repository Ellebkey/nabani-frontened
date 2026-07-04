import { test, expect, Route } from '@playwright/test';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { seedAuth, mockApi, COMMON_MOCKS } from './fixtures/app.fixtures';

/** Mirrors DateRangeFilterComponent presets (format 'yyyy-MM-dd'). */
function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * SankeyData as served by GET /accounts/cash-flow-sankey.
 * One total node + three category nodes, links consistent with the values
 * (d3-sankey recomputes node values from the links).
 */
const SANKEY_FIXTURE = {
  nodes: [
    { id: 'total-expenses', label: 'Gastos Totales', value: 1100 },
    { id: 'category-Hogar', label: 'Hogar', value: 600, color: '#3B82F6', categoryId: 1 },
    { id: 'category-Súper', label: 'Súper', value: 350, color: '#22C55E', categoryId: 2 },
    { id: 'category-Transporte', label: 'Transporte', value: 150, color: '#C9A84C', categoryId: 3 }
  ],
  links: [
    { source: 'total-expenses', target: 'category-Hogar', value: 600 },
    { source: 'total-expenses', target: 'category-Súper', value: 350 },
    { source: 'total-expenses', target: 'category-Transporte', value: 150 }
  ],
  totalIncome: 2000,
  totalExpenses: 1100,
  netCashFlow: 900
};

/** SubCategoryData for GET /total-expenses-by-subcategory (category Hogar). */
const HOGAR_SUBCATEGORIES_FIXTURE = {
  data: [
    { x: 'Renta', y: 400, subcategoryId: 11 },
    { x: 'Luz', y: 200, subcategoryId: 12 }
  ]
};

/** ExpenseItemsByCategoryResponse for GET /expense-items-by-category. */
const EXPENSE_ITEMS_FIXTURE = {
  rows: [
    {
      expenseId: 9001,
      articleId: 1,
      expenseDate: '2026-06-05T12:00:00.000Z',
      recipientName: 'Inmobiliaria Centro',
      concept: 'Renta junio',
      categoryId: 1,
      subcategoryId: 11,
      categoryName: 'Hogar',
      subcategoryName: 'Renta',
      subtotal: 400,
      quantity: 1,
      units: 'pz',
      price: 400
    }
  ],
  count: 1,
  total: 400
};

/** Baseline handlers so the cash-flow page renders with report data. */
const REPORT_MOCKS = {
  ...COMMON_MOCKS,
  'GET /tags/summaries': [],
  'GET /accounts/cash-flow-sankey': SANKEY_FIXTURE,
  'GET /total-expenses-by-subcategory': HOGAR_SUBCATEGORIES_FIXTURE,
  'GET /expense-items-by-category': EXPENSE_ITEMS_FIXTURE
};

test.describe('Reports — cash flow sankey', () => {
  test('renders the financial summary and a real d3 sankey with node rects, links and labels', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...REPORT_MOCKS });

    await page.goto('/#/reports/cash-flow');

    await expect(page.getByRole('heading', { name: 'Flujo de caja' })).toBeVisible();

    // The Maguey redesign shows the stats trio ONLY with an active tag —
    // without one the page goes straight to the sankey card
    await expect(page.getByRole('heading', { name: 'Flujo', exact: true })).toBeVisible();
    await expect(page.getByText('Resumen Financiero')).toHaveCount(0);

    // Real d3 rendering: the SVG exists with one rect per node and one path per link
    const svg = page.locator('app-sankey-chart svg');
    await expect(svg).toBeVisible();
    await expect(svg.locator('g.nodes g.sankey-node rect')).toHaveCount(SANKEY_FIXTURE.nodes.length);
    await expect(svg.locator('g.links path.sankey-link')).toHaveCount(SANKEY_FIXTURE.links.length);

    // Node labels are rendered as SVG <text> (category + total labels)
    await expect(svg.locator('text').filter({ hasText: 'Hogar' })).toHaveCount(1);
    await expect(svg.locator('text').filter({ hasText: 'Gastos Totales' })).toHaveCount(1);
    // Amount label rendered next to the node (handoff format, no space)
    await expect(svg.locator('text').filter({ hasText: '$600.00' }).first()).toBeVisible();

    await expect(page.getByText('Haz clic en una categoría para ver el desglose por subcategoría')).toBeVisible();
  });

  test('changing the date-range preset requests the sankey with the new range params', async ({ page, context }) => {
    const seenRanges: string[] = [];

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...REPORT_MOCKS,
      'GET /accounts/cash-flow-sankey': (route: Route) => {
        const params = new URL(route.request().url()).searchParams;
        seenRanges.push(`${params.get('startDate')}|${params.get('endDate')}`);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(SANKEY_FIXTURE)
        });
      }
    });

    await page.goto('/#/reports/cash-flow');

    // Initial load uses the 'Todo' default preset = full history
    const now = new Date();
    const allHistoryRange = `2000-01-01|${isoDay(now)}`;
    await expect.poll(() => seenRanges).toContain(allHistoryRange);

    // Switching to the '3 meses' preset issues a new request with the changed startDate
    await page.getByRole('button', { name: '3 meses' }).click();

    const threeMonthsRange = `${isoDay(startOfMonth(subMonths(now, 2)))}|${isoDay(endOfMonth(now))}`;
    await expect.poll(() => seenRanges).toContain(threeMonthsRange);
    expect(seenRanges.indexOf(threeMonthsRange)).toBeGreaterThan(seenRanges.indexOf(allHistoryRange));
  });

  test('clicking a category node in the sankey opens the subcategory breakdown', async ({ page, context }) => {
    let subCategoryQuery: Record<string, string> | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...REPORT_MOCKS,
      'GET /total-expenses-by-subcategory': (route: Route) => {
        subCategoryQuery = Object.fromEntries(new URL(route.request().url()).searchParams.entries());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(HOGAR_SUBCATEGORIES_FIXTURE)
        });
      }
    });

    await page.goto('/#/reports/cash-flow');

    const svg = page.locator('app-sankey-chart svg');
    await expect(svg.locator('g.nodes g.sankey-node rect')).toHaveCount(4);

    // Click the 'Hogar' node rect (d3 click handler lives on the g.sankey-node group)
    await svg.locator('g.sankey-node').filter({ hasText: 'Hogar' }).locator('rect').click();

    // Detail panel header: category label + total from the clicked node
    await expect(page.getByRole('heading', { name: 'Hogar' })).toBeVisible();
    await expect(page.getByText('Total: $ 600.00')).toBeVisible();

    // Subcategory cards with amount and share of the category total
    await expect(page.getByText('Renta', { exact: true })).toBeVisible();
    await expect(page.getByText('$ 400.00')).toBeVisible();
    await expect(page.getByText('66.7% del total')).toBeVisible();
    await expect(page.getByText('Luz', { exact: true })).toBeVisible();
    await expect(page.getByText('$ 200.00')).toBeVisible();
    await expect(page.getByText('33.3% del total')).toBeVisible();
    await expect(page.getByText('Haz clic en una subcategoría para ver los gastos')).toBeVisible();

    // The subcategory request carried the clicked categoryId and the active range
    await expect.poll(() => subCategoryQuery).toEqual({
      startDate: '2000-01-01',
      endDate: isoDay(new Date()),
      categoryId: '1'
    });

    // Closing the panel clears the selection
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByText('Total: $ 600.00')).toHaveCount(0);
  });

  test('clicking a subcategory card loads the expense items table with the right query params', async ({ page, context }) => {
    let expenseItemsQuery: Record<string, string> | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...REPORT_MOCKS,
      'GET /expense-items-by-category': (route: Route) => {
        expenseItemsQuery = Object.fromEntries(new URL(route.request().url()).searchParams.entries());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(EXPENSE_ITEMS_FIXTURE)
        });
      }
    });

    await page.goto('/#/reports/cash-flow');

    const svg = page.locator('app-sankey-chart svg');
    await expect(svg.locator('g.nodes g.sankey-node rect')).toHaveCount(4);
    await svg.locator('g.sankey-node').filter({ hasText: 'Hogar' }).locator('rect').click();

    await page.getByText('Renta', { exact: true }).click();

    // Table header summary: count + total of the subcategory expenses
    await expect(page.getByRole('heading', { name: 'Renta' })).toBeVisible();
    await expect(page.getByText('1 gastos · Total: $ 400.00')).toBeVisible();

    // Rendered mat-table row
    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('9001');
    await expect(table).toContainText('Inmobiliaria Centro');
    await expect(table).toContainText('Renta junio');
    await expect(table).toContainText('$ 400.00');

    await expect.poll(() => expenseItemsQuery).toEqual({
      startDate: '2000-01-01',
      endDate: isoDay(new Date()),
      categoryId: '1',
      subcategoryId: '11',
      limit: '10',
      offset: '0'
    });
  });
});
