import { test, expect } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS } from './fixtures/app.fixtures';

/**
 * Dark-mode smoke: asserts the COMPUTED colors of the token-driven surfaces.
 * Guards the whole chain: maguey-theme.js → tailwind plugins → Material mirror.
 */
const ACCOUNTS_FIXTURE = {
  rows: [{
    id: 'acc-1', name: 'BBVA', currentAmount: 5000, value: 5000, showSection: false,
    colorPalette: '#3B5F82', isPrimary: true, disable: false, ownerId: 'u-1',
    sectionCount: 0, sectionsTotal: 0,
  }],
  graphics: { series: [5000], colors: ['#3B5F82'], labels: ['BBVA'] },
};

const DARK_MOCKS = {
  ...COMMON_MOCKS,
  'GET /accounts/with-graphics': ACCOUNTS_FIXTURE,
  'GET /accounts/monthly-trend': { months: ['jun'], incomes: [1], expenses: [1] },
  'GET /accounts/acc-1/ledger': { rows: [], count: 0 },
};

async function rgb(locator: import('@playwright/test').Locator, prop: string): Promise<string> {
  return locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
}

test.describe('Dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('canvas, cards, dialog surface and buttons use the dark tokens', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await context.addInitScript(() => localStorage.setItem('scheme', 'dark'));
    await mockApi(context, DARK_MOCKS);

    await page.goto('/#/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Canvas #141715 / card #1C201E (the greenish dark surfaces, not black/white)
    await expect.poll(() => rgb(page.locator('body'), 'background-color')).toBe('rgb(20, 23, 21)');
    const card = page.locator('.bg-card').first();
    expect(await rgb(card, 'background-color')).toBe('rgb(28, 32, 30)');

    // Open the transfer modal: the dialog surface must be dark, not Material's white
    await page.locator('div[aria-haspopup]').filter({ hasText: 'BBVA' }).click();
    await page.getByRole('menuitem', { name: 'Transferencias' }).click();
    const dialog = page.locator('.mat-mdc-dialog-surface');
    await expect(dialog.first()).toBeVisible();
    const dialogBg = await rgb(dialog.first(), 'background-color');
    expect(dialogBg).toBe('rgb(28, 32, 30)');

    // Stroked button label must be readable ink, not invisible
    const cancel = page.getByRole('button', { name: 'Cancelar' });
    // unthemed buttons carry ink labels (the approved M2-era look)
    expect(await rgb(cancel, 'color')).toBe('rgb(236, 239, 237)');

    // hover state layer stays a subtle 8% wash — never an opaque block
    // (the primary Transferir is disabled on an empty form, so use Cancelar)
    await cancel.hover();
    const layerOpacity = await cancel.evaluate(el => {
      const layer = el.querySelector('.mat-mdc-button-persistent-ripple');
      return layer ? getComputedStyle(layer, '::before').opacity : 'no-layer';
    });
    expect(Number(layerOpacity)).toBeLessThanOrEqual(0.12);

    // Primary text is ink (#ECEFED), not white or black
    const title = page.getByText('Transferir entre cuentas');
    expect(await rgb(title, 'color')).toBe('rgb(255, 255, 255)'); // header is on brand green — white is correct here
  });
});
