import { test, expect, Page, BrowserContext, Route } from '@playwright/test';
import { seedAuth, mockApi, COMMON_MOCKS, ApiHandlers } from './fixtures/app.fixtures';

/**
 * Receipt scan flow (premium feature, backend-enforced).
 *
 * GATING NOTE (from reading the real code): the "Scan" button in
 * expenses-list.component.html has NO role/tier condition — it renders for
 * every authenticated user (free included). The expenses route only uses
 * authGuardFn; roleGuardFn exists but is applied to /admin routes only.
 * Premium enforcement happens in the BACKEND (POST /receipt-drafts/scan,
 * documented "premium/admin" in receipt-draft-api.service.ts). The tests
 * below assert that actual behavior: the button is visible for free users
 * too, and the backend rejection surfaces as a Spanish error in the modal.
 */

/** 1x1 transparent PNG — enough for camera-capture's canvas re-compression. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** Shape of a draft item as the verify modal consumes it (receipt-draft.model.ts). */
interface DraftItemFixture {
  name: string;
  unitPrice: number;
  quantity: number;
  barcode: string | null;
  sku: string | null;
  status: string;
  candidates: { articleId: number; concept: string; score: number }[];
  selectedArticleId: number | null;
  newArticle: null;
}

/** Fresh ReceiptDraft per test (matches models/receipt-draft.model.ts). */
const makeDraftFixture = () => {
  const items: DraftItemFixture[] = [
    {
      name: 'LECHE LALA 1L',
      unitPrice: 26.5,
      quantity: 2,
      barcode: '7501020565891',
      sku: null,
      status: 'matched',
      candidates: [{ articleId: 11, concept: 'Leche entera', score: 0.92 }],
      selectedArticleId: 11,
      newArticle: null
    },
    {
      name: 'GALLETAS MARIA',
      unitPrice: 99.3,
      quantity: 1,
      barcode: null,
      sku: null,
      status: 'no-match',
      candidates: [{ articleId: 22, concept: 'Galletas María', score: 0.61 }],
      selectedArticleId: null,
      newArticle: null
    }
  ];
  return {
    id: 31,
    store: 'Soriana Centro',
    expenseDate: '2026-06-10',
    total: 152.3,
    status: 'pending',
    data: {
      store: 'Soriana Centro',
      date: '2026-06-10',
      costcoMode: false,
      items
    }
  };
};

/** Full expense as GET /expenses/:id returns it, consumable by the edit modal. */
const CONFIRMED_EXPENSE = {
  id: 901,
  isDraft: true,
  isMonths: false,
  isPayout: true,
  totalMonths: 0,
  remainingMonths: 0,
  debtAmount: 0,
  totalAmount: 152.3,
  expenseDate: '2026-06-10T12:00:00',
  comment: null,
  recipientId: null,
  paymentMethodId: null,
  tags: [],
  articles: [
    {
      articleId: 11,
      articleName: 'Leche entera',
      quantity: 2,
      units: 1,
      price: 26.5,
      onDiscount: false,
      categoryId: 1,
      subcategoryId: 1,
      categoryName: 'Súper',
      subcategoryName: 'Lácteos',
      subtotal: 53
    }
  ]
};

async function gotoExpensesList(page: Page): Promise<void> {
  await page.goto('/#/expenses/list');
  await expect(page.getByRole('heading', { name: 'Gastos', exact: true })).toBeVisible();
}

async function openScanModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.getByText('Escanear Recibo')).toBeVisible();
}

/**
 * Gallery-upload fallback: camera-capture has a hidden <input type="file">
 * behind "Elegir de Galería". setInputFiles drives onFileSelected →
 * compressImage → preview, then "Usar esta Foto" emits the compressed file.
 */
async function uploadReceiptImage(page: Page): Promise<void> {
  await page.locator('app-camera-capture input[type="file"]').setInputFiles({
    name: 'receipt.png',
    mimeType: 'image/png',
    buffer: TINY_PNG
  });
  await expect(page.getByAltText('Recibo capturado')).toBeVisible();
  await page.getByRole('button', { name: 'Usar esta Foto' }).click();
}

/** Rejects getUserMedia with NotAllowedError to hit the permission-denied branch. */
async function denyCameraPermission(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const denied = (): Promise<MediaStream> =>
      Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
    if (navigator.mediaDevices) {
      try {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: denied });
      } catch {
        navigator.mediaDevices.getUserMedia = denied;
      }
    } else {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: denied } });
    }
  });
}

test.describe('Receipt scan', () => {
  test('the Scan button has no UI tier gating: a FREE user sees it on the expenses list', async ({ page, context }) => {
    await seedAuth(context, { roles: ['free'] });
    await mockApi(context, { ...COMMON_MOCKS });

    await gotoExpensesList(page);

    // Documented behavior: gating is backend-only, so the button renders for free users.
    await expect(page.getByRole('button', { name: 'Scan' })).toBeVisible();
  });

  test('a premium user opens the scan modal and sees both capture options', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await mockApi(context, { ...COMMON_MOCKS });

    await gotoExpensesList(page);
    await openScanModal(page);

    await expect(page.getByText('Arrastra el recibo aquí')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir cámara' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Elegir de galería' })).toBeVisible();
  });

  test('camera permission denied shows the Spanish error state and Volver returns to the options', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });
    await denyCameraPermission(context);
    await mockApi(context, { ...COMMON_MOCKS });

    await gotoExpensesList(page);
    await openScanModal(page);

    await page.getByRole('button', { name: 'Abrir cámara' }).click();

    await expect(
      page.getByText('Acceso a cámara denegado. Por favor habilita los permisos de cámara.')
    ).toBeVisible();
    // The error state still offers the upload fallback.
    await expect(page.getByRole('button', { name: 'Elegir de galería' })).toBeVisible();

    await page.getByRole('button', { name: 'Volver' }).click();

    await expect(page.getByText('Acceso a cámara denegado', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir cámara' })).toBeVisible();
  });

  test('gallery upload posts the receipt and opens the verify modal with the draft items', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });

    let releaseScan: () => void = () => undefined;
    const scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    let scanContentType = '';
    let scanPostData = '';

    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /receipt-drafts/scan': async (route: Route) => {
        scanContentType = route.request().headers()['content-type'] ?? '';
        scanPostData = route.request().postData() ?? '';
        await scanGate; // hold the response so the processing step is observable
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(makeDraftFixture())
        });
      }
    } as ApiHandlers);

    await gotoExpensesList(page);
    await openScanModal(page);
    await uploadReceiptImage(page);

    // Processing step while the scan request is in flight.
    await expect(page.getByText('Analizando recibo')).toBeVisible();
    await expect(page.getByText('Extrayendo artículos con IA…')).toBeVisible();
    releaseScan();

    // Verify modal opens on the mocked draft.
    await expect(page.getByText('Revisar recibo')).toBeVisible();
    await expect(page.getByText('Soriana Centro')).toBeVisible();
    await expect(page.getByText('Por revisar · 1')).toBeVisible();
    await expect(page.getByText('Verificados · 1')).toBeVisible();
    // The resolved row shows the concept; the original OCR text lives in its tooltip
    await expect(page.getByText('LECHE LALA 1L')).toBeAttached();
    await expect(page.getByText('GALLETAS MARIA')).toBeVisible();
    await expect(page.getByText('Leche entera')).toBeVisible(); // resolved concept
    await expect(page.getByRole('button', { name: 'Galletas María' })).toBeVisible(); // candidate chip
    await expect(page.getByText('Guardar código')).toBeVisible(); // learn-code toggle for the barcoded item
    // $53.00 appears twice: the LECHE row subtotal (26.5×2) and the footer total
    // (which counts resolved items only, so the pending 99.30 is excluded).
    await expect(page.getByText('$53.00')).toHaveCount(2);

    // The capture was re-compressed to receipt.jpg and sent as multipart form data.
    expect(scanContentType).toContain('multipart/form-data');
    expect(scanPostData).toContain('name="receipt"');
    expect(scanPostData).toContain('filename="receipt.jpg"');
  });

  test('a backend rejection (e.g. non-premium 403) surfaces its Spanish message and Reintentar recovers', async ({ page, context }) => {
    await seedAuth(context, { roles: ['free'] });
    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /receipt-drafts/scan': (route: Route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'El escaneo de recibos es una función premium.' } })
        })
    } as ApiHandlers);

    await gotoExpensesList(page);
    await openScanModal(page);
    await uploadReceiptImage(page);

    // Back on the capture step with the backend message rendered.
    await expect(page.getByText('El escaneo de recibos es una función premium.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir cámara' })).toBeVisible();

    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('El escaneo de recibos es una función premium.')).toHaveCount(0);
    await expect(page.getByText('Arrastra el recibo aquí')).toBeVisible();
  });

  test('verify modal: resolving a pending item and saving sends the PUT payload; Más tarde closes everything', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });

    let putPayload: { costcoMode?: boolean; items?: Record<string, unknown>[] } | null = null;

    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /receipt-drafts/scan': (route: Route) =>
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(makeDraftFixture()) }),
      'PUT /receipt-drafts/31': (route: Route) => {
        putPayload = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makeDraftFixture()) });
      }
    } as ApiHandlers);

    await gotoExpensesList(page);
    await openScanModal(page);
    await uploadReceiptImage(page);

    await expect(page.getByText('Revisar recibo')).toBeVisible();

    // Resolve the pending row by picking its fuzzy-match candidate chip.
    await page.getByRole('button', { name: 'Galletas María' }).click();
    await expect(page.getByText('Verificados · 2')).toBeVisible();
    await expect(page.getByText('Por revisar ·', { exact: false })).toHaveCount(0);
    await expect(page.getByText('$152.30')).toBeVisible(); // 26.5*2 + 99.3*1

    await page.getByRole('button', { name: 'Guardar borrador' }).click();

    // The saved draft prompts whether to complete the expense now.
    await expect(page.getByText('¿Completar el gasto ahora?')).toBeVisible();
    await page.getByRole('button', { name: 'Más tarde' }).click();

    // Verify + scan modals close; back on the list.
    await expect(page.locator('mat-dialog-container')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Gastos', exact: true })).toBeVisible();

    expect(putPayload).not.toBeNull();
    expect(putPayload).toMatchObject({ costcoMode: false });
    expect(putPayload!.items).toHaveLength(2);
    expect(putPayload!.items![0]).toMatchObject({ name: 'LECHE LALA 1L', selectedArticleId: 11, status: 'matched' });
    expect(putPayload!.items![1]).toMatchObject({
      name: 'GALLETAS MARIA',
      selectedArticleId: 22,
      status: 'matched',
      newArticle: null
    });
  });

  test('verify modal: Completar ahora posts the confirm payload and hands off to Completar Gasto', async ({ page, context }) => {
    await seedAuth(context, { roles: ['premium'] });

    const resolvedDraft = makeDraftFixture();
    resolvedDraft.data.items[1] = { ...resolvedDraft.data.items[1], selectedArticleId: 22, status: 'matched' };

    let confirmPayload: Record<string, unknown> | null = null;

    await mockApi(context, {
      ...COMMON_MOCKS,
      'POST /receipt-drafts/scan': (route: Route) =>
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(resolvedDraft) }),
      'PUT /receipt-drafts/31': (route: Route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resolvedDraft) }),
      'POST /receipt-drafts/31/confirm': (route: Route) => {
        confirmPayload = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONFIRMED_EXPENSE) });
      },
      'GET /expenses/901': CONFIRMED_EXPENSE
    } as ApiHandlers);

    await gotoExpensesList(page);
    await openScanModal(page);
    await uploadReceiptImage(page);

    await expect(page.getByText('Revisar recibo')).toBeVisible();
    await expect(page.getByText('Verificados · 2')).toBeVisible();

    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(page.getByText('¿Completar el gasto ahora?')).toBeVisible();
    await page.getByRole('button', { name: 'Completar ahora' }).click();

    // The confirmed expense is fetched and opened in the draft-completion editor.
    await expect(page.getByText('Completar Gasto')).toBeVisible();

    expect(confirmPayload).toEqual({}); // confirm() sends the default empty payload
  });
});
