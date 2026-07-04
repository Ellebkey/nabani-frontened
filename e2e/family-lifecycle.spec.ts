import { test, expect, Route } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS, PARTNERSHIP_FIXTURE } from './fixtures/app.fixtures';

/** PARTNERSHIP_FIXTURE reduced to the owner only (household not yet complete). */
const OWNER_ONLY_PARTNERSHIP = {
  ...PARTNERSHIP_FIXTURE,
  members: [PARTNERSHIP_FIXTURE.members[0]],
  excludedCategories: []
};

const CATEGORIES_FIXTURE = [
  { id: 1, name: 'Hogar', colorPalette: '#3B82F6', enabledTiers: ['free', 'premium'], subcategories: [] },
  { id: 2, name: 'Súper', colorPalette: '#22C55E', enabledTiers: ['free', 'premium'], subcategories: [] },
  { id: 3, name: 'Viajes', colorPalette: '#F59E0B', enabledTiers: ['premium'], subcategories: [] },
  { id: 99, name: 'Personal', colorPalette: '#F43F5E', enabledTiers: ['free', 'premium'], subcategories: [] }
];

test.describe('Family lifecycle', () => {
  test('premium user without a partnership creates a household from the empty state', async ({ page, context }) => {
    let createBody: { name?: string } | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /partnerships': (route: Route) => {
        createBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            ...OWNER_ONLY_PARTNERSHIP,
            name: 'Casa Nueva'
          })
        });
      }
    });

    await page.goto('/#/family/settings');

    await expect(page.getByText('Aún no tienes un hogar')).toBeVisible();

    await page.getByLabel('Nombre del hogar (opcional)').fill('Casa Nueva');
    await page.getByRole('button', { name: /Crear mi hogar/i }).click();

    // Empty state is replaced by the household settings with the members card.
    await expect(page.getByText('Hogar creado exitosamente')).toBeVisible();
    await expect(page.getByText('Miembros', { exact: true })).toBeVisible();
    await expect(page.getByText('e2e-user (tú)')).toBeVisible();
    await expect(page.getByText('Dueño', { exact: true })).toBeVisible();
    await expect(page.getByText('Aún no tienes un hogar')).toHaveCount(0);

    expect(createBody).toEqual({ name: 'Casa Nueva' });
  });

  test('renders both household members with their role chips', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE,
      'GET /categories': CATEGORIES_FIXTURE
    });

    await page.goto('/#/family/settings');

    await expect(page.getByText('Casa E2E · 2 miembros')).toBeVisible();

    const membersCard = page.locator('.bg-card').filter({ hasText: 'Miembros' });
    const ownerRow = membersCard.locator('div.flex.items-center').filter({ hasText: 'e2e@test.com' }).first();
    await expect(ownerRow.getByText('e2e-user (tú)')).toBeVisible();
    await expect(ownerRow.getByText('Dueño', { exact: true })).toBeVisible();

    const partnerRow = membersCard.locator('div.flex.items-center').filter({ hasText: 'pareja@test.com' }).first();
    await expect(partnerRow.getByText('pareja', { exact: true })).toBeVisible();
    await expect(partnerRow.getByText('Miembro', { exact: true })).toBeVisible();

    // Household is complete (2 members) -> no invite input.
    await expect(page.getByPlaceholder('correo@ejemplo.com')).toHaveCount(0);
  });

  test('owner invites their partner and receives the invite-link modal', async ({ page, context }) => {
    let inviteBody: { email?: string } | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': OWNER_ONLY_PARTNERSHIP,
      'GET /categories': CATEGORIES_FIXTURE,
      'POST /partnerships/invites': (route: Route) => {
        inviteBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'inv-1',
            partnershipId: OWNER_ONLY_PARTNERSHIP.id,
            token: 'tok-123',
            inviteeEmail: inviteBody?.email,
            status: 'pending',
            createdAt: '2026-06-10T00:00:00.000Z'
          })
        });
      }
    });

    await page.goto('/#/family/settings');

    await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
    await page.getByPlaceholder('correo@ejemplo.com').fill('pareja@correo.com');
    await page.getByRole('button', { name: /Invitar/i }).click();

    // One-time invite link modal with the accept deep link.
    await expect(page.getByText('Invitación creada')).toBeVisible();
    await expect(page.getByText('/#/family/accept?token=tok-123')).toBeVisible();

    expect(inviteBody).toEqual({ email: 'pareja@correo.com' });
  });

  test('marking a category as personal enables saving and PUTs the excluded selection', async ({ page, context }) => {
    let excludedCategoriesBody: { categoryIds?: number[] } | undefined;

    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'GET /partnerships/me': PARTNERSHIP_FIXTURE,
      'GET /categories': CATEGORIES_FIXTURE,
      'PUT /partnerships/excluded-categories': (route: Route) => {
        excludedCategoriesBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            ...PARTNERSHIP_FIXTURE.excludedCategories,
            { categoryId: 3, name: 'Viajes', colorPalette: '#F59E0B' }
          ])
        });
      }
    });

    await page.goto('/#/family/settings');

    // v2 card: selected chips are the EXCLUDED (personal) categories.
    await expect(page.getByText('Categorías compartidas', { exact: true })).toBeVisible();
    await expect(page.getByText(/Las categorías con candado son personales/)).toBeVisible();

    // The fixture's excluded category renders selected (rose tint + lock icon);
    // shared categories render as plain unselected chips.
    const personalChip = page.getByRole('button', { name: 'Personal' });
    await expect(personalChip).toHaveClass(/bg-rose-tint/);
    await expect(personalChip.locator('mat-icon[data-mat-icon-name="lock-closed"]')).toBeVisible();
    const viajesChip = page.getByRole('button', { name: 'Viajes' });
    await expect(viajesChip).toBeVisible();
    await expect(viajesChip).not.toHaveClass(/bg-rose-tint/);

    // Selection mirrors the partnership's excluded categories -> nothing to save yet.
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);

    await viajesChip.click();
    await expect(viajesChip).toHaveClass(/bg-rose-tint/);
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();

    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Categorías personales actualizadas')).toBeVisible();
    // The saved selection is no longer dirty, so the button disappears again.
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);

    expect([...(excludedCategoriesBody?.categoryIds ?? [])].sort((a, b) => a - b)).toEqual([3, 99]);
  });

  test('accepting an invite from the deep link redirects to shared spending', async ({ page, context }) => {
    // Token must be >= 10 chars (Validators.minLength(10) on tokenControl).
    const token = 'tok-e2e-accept-12345';
    let acceptBody: { token?: string } | undefined;

    await seedAuth(context, { roles: ['free'], username: 'pareja' });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /partnerships/invites/accept': (route: Route) => {
        acceptBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(PARTNERSHIP_FIXTURE)
        });
      }
    });

    await page.goto(`/#/family/accept?token=${token}`);

    await expect(page.getByText('Aceptar invitación', { exact: true })).toBeVisible();
    // v2 consent copy: exclusion-based sharing (everything except personal categories).
    await expect(
      page.getByText(/Al unirte, ambos verán los gastos del hogar de los dos: todas las categorías excepto las personales/)
    ).toBeVisible();
    await expect(page.getByLabel('Código de invitación')).toHaveValue(token);

    await page.getByRole('button', { name: /Unirme al hogar/i }).click();

    await expect(page).toHaveURL(/#\/family\/spending/);
    expect(acceptBody).toEqual({ token });
  });

  test('an invalid invite shows the Spanish error toast and stays on the accept page', async ({ page, context }) => {
    const token = 'tok-e2e-revoked-9999';

    await seedAuth(context, { roles: ['free'], username: 'pareja' });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /partnerships/invites/accept': (route: Route) =>
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invite not found' })
        })
    });

    await page.goto(`/#/family/accept?token=${token}`);

    await page.getByRole('button', { name: /Unirme al hogar/i }).click();

    await expect(page.getByText('Invitación no válida o revocada')).toBeVisible();
    await expect(page).toHaveURL(/#\/family\/accept/);
    // The button is re-enabled so the user can retry with another code.
    await expect(page.getByRole('button', { name: /Unirme al hogar/i })).toBeEnabled();
  });
});
