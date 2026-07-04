import { BrowserContext, Page, Route } from '@playwright/test';

export interface SeedAuthOptions {
  username?: string;
  roles?: string[];
}

/**
 * Seeds the localStorage auth state BEFORE the app boots so authGuardFn
 * passes. Must be called before the first page.goto().
 */
export async function seedAuth(context: BrowserContext, options: SeedAuthOptions = {}): Promise<void> {
  const { username = 'e2e-user', roles = ['premium'] } = options;
  const expiresIn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await context.addInitScript(({ username, roles, expiresIn }) => {
    localStorage.setItem('token', 'e2e-fake-jwt-token');
    localStorage.setItem('refreshToken', 'e2e-fake-refresh-token');
    localStorage.setItem('roles', JSON.stringify(roles));
    localStorage.setItem('expiresIn', expiresIn);
    localStorage.setItem('username', username);
  }, { username, roles, expiresIn });
}

export type ApiHandlers = Record<string, unknown | ((route: Route) => Promise<void> | void)>;

/**
 * Intercepts every backend call (any host, any port, path containing /api/)
 * and answers from the handlers map. Keys are `${METHOD} ${path}` where path
 * is everything AFTER `/api` (query string ignored), e.g. 'GET /partnerships/me'.
 * Values are either a JSON body or a custom (route) => ... handler.
 * Unmatched requests resolve to 200 {} and are logged to the test output.
 */
export async function mockApi(context: BrowserContext | Page, handlers: ApiHandlers): Promise<void> {
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*?\/api/, '');
    const key = `${request.method()} ${path}`;

    const handler = handlers[key];

    if (handler === undefined) {
      // eslint-disable-next-line no-console
      console.log(`[e2e mockApi] unmatched: ${key}`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    if (typeof handler === 'function') {
      await (handler as (route: Route) => Promise<void> | void)(route);
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(handler)
    });
  });
}

/**
 * Baseline mocks so shell pages (dashboard, expense modal lookups) render
 * without errors. Spread it first and override per test:
 *   await mockApi(context, { ...COMMON_MOCKS, 'GET /partnerships/me': myPartnership });
 */
export const COMMON_MOCKS: ApiHandlers = {
  'GET /accounts': { rows: [], count: 0 },
  'GET /categories': [],
  'GET /payment-methods': [],
  'GET /recipients': { rows: [], count: 0 },
  'GET /articles': { rows: [], count: 0 },
  'GET /tags': { rows: [], count: 0 },
  'GET /expenses': { rows: [], count: 0 },
  'GET /incomes': { rows: [], count: 0 },
  'GET /receipt-drafts': { rows: [], count: 0 },
  'GET /receipt-scan/drafts': { rows: [], count: 0 },
  'GET /partnerships/me': null,
  'GET /partnerships/invites': [],
  'GET /partnerships/excluded-categories': [],
  'GET /partnerships/shared/spending': { rows: [], total: 0 },
  // v2: returns ISharedTicket[] (grouped tickets)
  'GET /partnerships/shared/expenses': [],
  'GET /partnerships/budgets': [],
  'GET /partnerships/budgets/status': { rows: [], totalBudgeted: 0, totalSpent: 0 }
};

export const PARTNERSHIP_FIXTURE = {
  id: 'p-e2e-1',
  name: 'Casa E2E',
  status: 'active',
  members: [
    { id: 'm-1', userId: 'u-1', role: 'owner', status: 'active', username: 'e2e-user', email: 'e2e@test.com' },
    { id: 'm-2', userId: 'u-2', role: 'partner', status: 'active', username: 'pareja', email: 'pareja@test.com' }
  ],
  // v2 exclusion-based sharing: everything is shared EXCEPT these personal categories.
  excludedCategories: [
    { categoryId: 99, name: 'Personal', colorPalette: '#F43F5E' }
  ],
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z'
};
