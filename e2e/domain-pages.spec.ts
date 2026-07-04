import { test, expect, Route } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS } from './fixtures/app.fixtures';

/** One account so the incomes account filter and the create-income selects have data. */
const ACCOUNTS_RESPONSE = {
  rows: [{ id: 'acc-1', name: 'BBVA Nómina', colorPalette: '#3B82F6' }],
  count: 1
};

/** GET /incomes → { rows: IIncome[], count } as the MatTable renders them. */
const INCOMES_RESPONSE = {
  rows: [
    {
      id: 51,
      incomeDate: '2026-06-09T10:30:00',
      concept: 'Nomina',
      accountId: 'acc-1',
      accountName: 'BBVA Nómina',
      accountColor: '#3B82F6',
      totalAmount: 12500.5,
      comment: 'Quincena'
    }
  ],
  count: 1
};

/** GET /articles → { rows: IArticle[], count }. */
const ARTICLES_RESPONSE = {
  rows: [
    { id: 7, concept: 'Leche entera', isEnabled: true },
    { id: 8, concept: 'Cafe de grano', isEnabled: false }
  ],
  count: 2
};

/** MerchantsService maps "merchants" onto the backend /recipients resource. */
const MERCHANTS_RESPONSE = {
  rows: [
    { id: 3, name: 'Soriana', isEnabled: true },
    { id: 4, name: 'Oxxo', isEnabled: false }
  ],
  count: 2
};

test.describe('Incomes', () => {
  test('renders the mocked incomes table on /incomes/list', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /accounts': ACCOUNTS_RESPONSE,
      'GET /incomes': INCOMES_RESPONSE
    });

    await page.goto('/#/incomes/list');

    await expect(page.getByRole('heading', { name: 'Ingresos', exact: true })).toBeVisible();
    await expect(page.getByText('Ingresos recientes')).toBeVisible();

    // Maguey transaction row: mono INC id, concept title, meta with account dot, teal +amount
    const row = page.locator('mg-transaction-row');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('INC-51');
    await expect(row).toContainText('Nomina');
    await expect(row).toContainText('BBVA Nómina');
    await expect(row).toContainText('+$12,500.50');
  });

  test('create-income modal assembles and POSTs the income payload', async ({ page, context }) => {
    let capturedBody: any = null;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /accounts': ACCOUNTS_RESPONSE,
      // empty list → empty state with the always-visible CTA button
      'GET /incomes': { rows: [], count: 0 },
      'POST /incomes': (route: Route) => {
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 999, ...capturedBody })
        });
      }
    });

    await page.goto('/#/incomes/list');
    await expect(page.getByText('No hay ingresos registrados')).toBeVisible();

    await page.getByRole('button', { name: 'Crear primer ingreso' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Registrar ingreso')).toBeVisible();

    // Cuenta + Concepto are mg-compact-selects (custom overlay listboxes)
    await dialog.locator('mg-compact-select button').first().click();
    await page.getByRole('option', { name: 'BBVA Nómina' }).click();
    await dialog.locator('mg-compact-select').nth(1).locator('button').first().click();
    await page.getByRole('option', { name: 'Nomina', exact: true }).click();

    // Fecha parses with the DateFnsAdapter 'yyyy-MM-dd' input format.
    await dialog.locator('mat-form-field input').fill('2026-06-10');
    await dialog.locator('input[type="time"]').fill('14:30');
    await dialog.getByPlaceholder('$0.00').fill('12500.5');
    await dialog.getByPlaceholder('Opcional').fill('Pago de nómina');

    const postDone = page.waitForResponse(
      resp => resp.request().method() === 'POST' && resp.url().includes('/api/incomes')
    );
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await postDone;

    expect(capturedBody).toMatchObject({
      accountId: 'acc-1',
      concept: 'Nomina',
      incomeTime: '14:30',
      totalAmount: 12500.5,
      comment: 'Pago de nómina'
    });
    // incomeDate is combineDateAndTime(date, time) → ISO string at 2026-06-10 14:30 local.
    const sentDate = new Date(capturedBody.incomeDate);
    expect(capturedBody.incomeDate).toMatch(/Z$/);
    expect(sentDate.getFullYear()).toBe(2026);
    expect(sentDate.getMonth()).toBe(5);
    expect(sentDate.getDate()).toBe(10);
    expect(sentDate.getHours()).toBe(14);
    expect(sentDate.getMinutes()).toBe(30);

    await expect(page.getByText('Ingreso creado exitosamente')).toBeVisible();
  });
});

test.describe('Inventory — articles', () => {
  test('renders the mocked articles list on /inventory/articles', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /articles': ARTICLES_RESPONSE
    });

    await page.goto('/#/inventory/articles');

    await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();
    await expect(page.getByText('Listado de artículos', { exact: true })).toBeVisible();

    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Leche entera');
    await expect(rows.nth(1)).toContainText('Cafe de grano');
  });

  test('create-article modal POSTs the new concept to /articles', async ({ page, context }) => {
    let capturedBody: any = null;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /articles': { rows: [], count: 0 },
      'POST /articles': (route: Route) => {
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 77, ...capturedBody })
        });
      }
    });

    await page.goto('/#/inventory/articles');
    await expect(page.getByText('No hay artículos registrados')).toBeVisible();

    await page.getByRole('button', { name: 'Crear Primer Artículo' }).click();
    await expect(page.getByText('Registrar artículo')).toBeVisible();

    await page.getByLabel('Concepto').fill('Cafe de grano');

    const postDone = page.waitForResponse(
      resp => resp.request().method() === 'POST' && resp.url().includes('/api/articles')
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    await postDone;

    expect(capturedBody).toEqual({ concept: 'Cafe de grano' });
    await expect(page.getByText('Artículo creado exitosamente')).toBeVisible();
  });
});

test.describe('Inventory — merchants', () => {
  test('renders the mocked merchants list, served from the /recipients endpoint', async ({ page, context }) => {
    let recipientsQuery: any = null;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      // MerchantsService.getMerchantsList hits GET /recipients (not /merchants).
      'GET /recipients': (route: Route) => {
        recipientsQuery = Object.fromEntries(new URL(route.request().url()).searchParams);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MERCHANTS_RESPONSE)
        });
      }
    });

    await page.goto('/#/inventory/merchants');

    await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();
    await expect(page.getByText('Listado de comercios', { exact: true })).toBeVisible();

    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Soriana');
    await expect(rows.nth(1)).toContainText('Oxxo');

    // The list loads with its pagination defaults + fetchAll flag.
    expect(recipientsQuery).toMatchObject({ fetchAll: 'true', limit: '25', offset: '0' });
  });
});

test.describe('Profile', () => {
  test('renders the username and role chips', async ({ page, context }) => {
    await seedAuth(context, { username: 'e2e-user', roles: ['admin', 'premium'] });
    await mockApi(context, { ...COMMON_MOCKS });

    await page.goto('/#/profile');

    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();

    // Identity card: display name + full role pills (never split letters)
    await expect(page.getByText('e2e-user', { exact: true })).toBeVisible();
    await expect(page.locator('mg-pill').filter({ hasText: 'Administrador' })).toBeVisible();
    await expect(page.locator('mg-pill').filter({ hasText: 'Premium' })).toBeVisible();
  });

  test('change-password form POSTs to /auth/change-password and shows the success alert', async ({ page, context }) => {
    let capturedBody: any = null;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /auth/change-password': (route: Route) => {
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Password updated' })
        });
      }
    });

    await page.goto('/#/profile');
    await expect(page.getByText('Cambiar contraseña')).toBeVisible();

    await page.getByPlaceholder('••••••••').fill('vieja-clave');
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('nueva-clave-123');
    await page.getByPlaceholder('Repite la contraseña').fill('nueva-clave-123');

    const postDone = page.waitForResponse(
      resp => resp.request().method() === 'POST' && resp.url().includes('/auth/change-password')
    );
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await postDone;

    // confirmPassword is a UI-only guard; only these two fields travel.
    expect(capturedBody).toEqual({ currentPassword: 'vieja-clave', newPassword: 'nueva-clave-123' });

    await expect(page.getByText('Contraseña actualizada correctamente.')).toBeVisible();
    // On success the form resets.
    await expect(page.getByPlaceholder('••••••••')).toHaveValue('');
  });

  test('change-password blocks invalid input and mismatched confirmation without calling the API', async ({ page, context }) => {
    let postCount = 0;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /auth/change-password': (route: Route) => {
        postCount += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    await page.goto('/#/profile');
    await expect(page.getByText('Cambiar contraseña')).toBeVisible();

    const submit = page.getByRole('button', { name: 'Actualizar contraseña' });

    // Empty form → invalid → button disabled.
    await expect(submit).toBeDisabled();

    // newPassword below minLength(6) keeps the form invalid.
    await page.getByPlaceholder('••••••••').fill('vieja-clave');
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('abc');
    await page.getByPlaceholder('Repite la contraseña').fill('abc');
    await expect(submit).toBeDisabled();

    // Valid lengths but mismatched confirmation → Spanish error alert, no request.
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('nueva-clave-123');
    await page.getByPlaceholder('Repite la contraseña').fill('otra-clave-999');
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
    expect(postCount).toBe(0);
  });
});
