import { test, expect } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS } from './fixtures/app.fixtures';

test.describe('App smoke', () => {
  test('redirects unauthenticated visitors to the login page', async ({ page }) => {
    await page.goto('/#/family/spending');

    await expect(page).toHaveURL(/authentication\/login/);
  });

  test('authenticated user without a partnership sees the family empty state', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS });

    await page.goto('/#/family/settings');

    await expect(page.getByText('Aún no tienes un hogar')).toBeVisible();
    await expect(page.getByRole('button', { name: /Crear mi hogar/i })).toBeVisible();
  });

  test('free user sees the premium upsell instead of the create button', async ({ page, context }) => {
    await seedAuth(context, { roles: ['free'] });
    await mockApi(context, { ...COMMON_MOCKS });

    await page.goto('/#/family/settings');

    await expect(page.getByText('Función Premium')).toBeVisible();
    await expect(page.getByRole('button', { name: /Crear mi hogar/i })).toHaveCount(0);
  });
});
