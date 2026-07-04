import { test, expect, Route } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS } from './fixtures/app.fixtures';

/** Matches JWTResponse (src/app/modules/shared/interfaces/user.model.ts) consumed by SignInComponent. */
const LOGIN_RESPONSE = {
  token: 'e2e-login-jwt-token',
  refreshToken: 'e2e-login-refresh-token',
  roles: ['premium'],
  username: 'e2e@test.com',
  expiresIn: new Date(Date.now() + 60 * 60 * 1000).toISOString()
};

test.describe('Authentication', () => {
  test('renders the login page with form fields and actions', async ({ page, context }) => {
    await mockApi(context, { ...COMMON_MOCKS });

    await page.goto('/#/authentication/login');

    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();
    await expect(page.getByText('Recordarme')).toBeVisible();
    await expect(page.getByRole('link', { name: /Olvidaste tu contraseña/i })).toBeVisible();
  });

  test('logs in successfully and lands on the dashboard', async ({ page, context }) => {
    let loginPayload: Record<string, unknown> | undefined;

    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /auth/login': (route: Route) => {
        loginPayload = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(LOGIN_RESPONSE)
        });
      }
    });

    await page.goto('/#/authentication/login');

    await page.getByLabel('Correo electrónico').fill('e2e@test.com');
    await page.getByLabel('Contraseña').fill('SuperSecreta1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/#\/dashboard/);

    // setUser(...) persisted the session from the mocked JWTResponse
    expect(loginPayload).toEqual({ username: 'e2e@test.com', password: 'SuperSecreta1', rememberMe: false });
    const storedToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(storedToken).toBe(LOGIN_RESPONSE.token);
  });

  test('shows the credentials error and stays on login when the API returns 401', async ({ page, context }) => {
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /auth/login': (route: Route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Invalid credentials' } })
        })
    });

    await page.goto('/#/authentication/login');

    await page.getByLabel('Correo electrónico').fill('e2e@test.com');
    await page.getByLabel('Contraseña').fill('incorrecta');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
    await expect(page).toHaveURL(/authentication\/login/);

    // Form re-enabled for a retry, and no resend-verification link for plain bad credentials
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
    await expect(page.getByLabel('Correo electrónico')).toBeEditable();
    await expect(page.getByRole('button', { name: /Reenviar correo de verificacion/i })).toHaveCount(0);
  });

  test('shows the unverified-email warning with a resend link on 422', async ({ page, context }) => {
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /auth/login': (route: Route) =>
        route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Please verify your email before logging in' } })
        })
    });

    await page.goto('/#/authentication/login');

    await page.getByLabel('Correo electrónico').fill('e2e@test.com');
    await page.getByLabel('Contraseña').fill('SuperSecreta1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Tu correo no ha sido verificado. Revisa tu bandeja de entrada.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar correo de verificacion' })).toBeVisible();
    await expect(page).toHaveURL(/authentication\/login/);
  });

  test('redirects unauthenticated visitors from expenses to the login page', async ({ page, context }) => {
    await mockApi(context, { ...COMMON_MOCKS });

    await page.goto('/#/expenses/list');

    await expect(page).toHaveURL(/authentication\/login/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('keeps an authenticated user on the expenses page (guard passes)', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS });

    await page.goto('/#/expenses/list');

    await expect(page).toHaveURL(/expenses\/list/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toHaveCount(0);
  });
});
